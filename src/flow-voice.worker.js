import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber;
const VOICE_MODEL = "onnx-community/whisper-base";

const looksLikeHallucination = (text) => {
  const words = String(text || "").toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
  if (words.length < 18) return false;
  const uniqueRatio = new Set(words).size / words.length;
  let consecutive = 1;
  let longestRun = 1;
  for (let index = 1; index < words.length; index += 1) {
    consecutive = words[index] === words[index - 1] ? consecutive + 1 : 1;
    longestRun = Math.max(longestRun, consecutive);
  }
  return uniqueRatio < 0.28 || longestRun >= 4;
};

const loadTranscriber = async () => {
  if (transcriber) return transcriber;
  const devices = self.navigator?.gpu ? ["webgpu", "wasm"] : ["wasm"];
  let lastError;
  for (const device of devices) {
    self.postMessage({ type: "status", status: "loading", device });
    try {
      // Base is still compact enough for an offline browser feature, but is
      // substantially more reliable than tiny for short multilingual commands.
      transcriber = await pipeline("automatic-speech-recognition", VOICE_MODEL, {
        device,
        progress_callback: (progress) => self.postMessage({ type: "progress", progress }),
      });
      self.postMessage({ type: "status", status: "ready", device });
      return transcriber;
    } catch (error) { lastError = error; }
  }
  self.postMessage({ type: "status", status: "error", error: lastError?.message || "Voice model could not be loaded" });
  throw lastError || new Error("Voice model could not be loaded");
};

self.onmessage = async ({ data }) => {
  if (data?.type !== "transcribe") return;
  try {
    const model = await loadTranscriber();
    self.postMessage({ type: "status", status: "transcribing" });
    // Voice commands are intentionally short. Limiting the audio avoids a
    // known Whisper failure mode where silence at the end produces a long loop
    // of repeated words instead of a transcription.
    const input = new Float32Array(data.samples).slice(0, 20 * 16000);
    const result = await model(input, {
      task: "transcribe",
      chunk_length_s: 20,
      stride_length_s: 3,
      max_new_tokens: 96,
      no_repeat_ngram_size: 2,
      repetition_penalty: 1.35,
    });
    const text = result?.text?.trim() || "";
    if (!text || looksLikeHallucination(text)) {
      self.postMessage({ type: "result", error: "The transcription was not clear enough" });
    } else {
      self.postMessage({ type: "result", text });
    }
  } catch (error) {
    self.postMessage({ type: "result", error: error?.message || "Voice transcription failed" });
  } finally {
    self.postMessage({ type: "status", status: "ready" });
  }
};
