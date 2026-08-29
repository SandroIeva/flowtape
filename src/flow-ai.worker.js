import { env, pipeline } from "@huggingface/transformers";

// The model and its cache stay in the user's browser. No request is sent to
// Flowtape or another application server.
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODELS = {
  lite: { id: "onnx-community/Qwen2.5-0.5B-Instruct-ONNX", webgpuDtype: "q4f16", wasmDtype: "q4" },
  standard: { id: "onnx-community/Qwen3-0.6B-ONNX", webgpuDtype: "q4f16", wasmDtype: "q4" },
  smart: { id: "onnx-community/gemma-3-1b-it-ONNX", webgpuDtype: "q4f16", wasmDtype: "q4" },
};

const generators = new Map();

const systemPrompt = `You are Flowtape's local audio editor command parser. Return ONLY one JSON object, with no markdown and no explanation.
Allowed actions:
{"action":"split","time_seconds":number}
{"action":"fade","edge":"in"|"out","seconds":number}
{"action":"move","clip_id":string,"track_number":number}
{"action":"unsupported"}
Resolve natural references such as "the second part", "the clip above", "that track", and their German equivalents using the clips, tracks, selected clip, playhead, and recent conversation in context. Never invent clip names, clip IDs, track numbers, or arbitrary actions. If a reference remains ambiguous, return {"action":"unsupported"}. A split must use a time within the project. A fade applies to the selected clip, or a clip under the playhead. For move, use the exact clip_id from context and a one-based track_number. Understand German and English.`;

const extractContent = (value) => {
  if (Array.isArray(value)) {
    const last = value.at(-1);
    return typeof last?.content === "string" ? last.content : JSON.stringify(last || {});
  }
  return String(value || "");
};

const loadGenerator = async (modelKey) => {
  const key = MODELS[modelKey] ? modelKey : "standard";
  const model = MODELS[key];
  if (generators.has(key)) return generators.get(key);
  const device = self.navigator?.gpu ? "webgpu" : "wasm";
  self.postMessage({ type: "status", status: "loading", model: key, device });
  try {
    const generator = await pipeline("text-generation", model.id, {
      device,
      dtype: device === "webgpu" ? model.webgpuDtype : model.wasmDtype,
      progress_callback: (progress) => self.postMessage({ type: "progress", progress }),
    });
    generators.set(key, generator);
    self.postMessage({ type: "status", status: "ready", model: key, device });
    return generator;
  } catch (error) {
    self.postMessage({ type: "status", status: "error", model: key, error: error?.message || "Model could not be loaded" });
    throw error;
  }
};

self.onmessage = async ({ data }) => {
  if (data?.type === "load") {
    try { await loadGenerator(data.model); } catch { /* Status already sent to the UI. */ }
    return;
  }
  if (data?.type !== "run") return;
  try {
    const generator = await loadGenerator(data.model);
    self.postMessage({ type: "status", status: "thinking" });
    const context = {
      project_duration_seconds: Math.round(data.context.projectDuration),
      playhead_seconds: Math.round(data.context.playbackTime * 100) / 100,
      selected_clip: data.context.selectedClip,
      clips: data.context.clips,
      tracks: data.context.tracks,
      recent_conversation: data.context.recentConversation,
    };
    const output = await generator([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Editor context: ${JSON.stringify(context)}\nUser command: ${data.prompt}` },
    ], { max_new_tokens: 90, do_sample: false, temperature: 0 });
    const raw = extractContent(output?.[0]?.generated_text);
    self.postMessage({ type: "result", requestId: data.requestId, raw });
    self.postMessage({ type: "status", status: "ready", model: data.model });
  } catch (error) {
    self.postMessage({ type: "result", requestId: data.requestId, error: error?.message || "The local model could not complete this request." });
  }
};
