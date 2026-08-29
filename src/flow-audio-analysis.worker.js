const average = (values) => values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);

const analyze = (samples, sampleRate) => {
  const duration = samples.length / sampleRate;
  const frameSize = 1024;
  const hop = 512;
  const flux = [];
  const silenceWindows = [];
  let previousEnergy = 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += frameSize) {
    let energy = 0;
    const end = Math.min(samples.length, index + frameSize);
    for (let cursor = index; cursor < end; cursor += 1) {
      const value = samples[cursor] || 0;
      energy += value * value;
      sumSquares += value * value;
    }
    energy = Math.sqrt(energy / Math.max(1, end - index));
    flux.push(Math.max(0, energy - previousEnergy));
    previousEnergy = energy;
    silenceWindows.push(energy < .012);
  }
  const loudnessDb = 20 * Math.log10(Math.max(0.000001, Math.sqrt(sumSquares / Math.max(1, samples.length))));
  let bestBpm = 0;
  let bestScore = -Infinity;
  const usable = flux.slice(0, Math.min(flux.length, Math.ceil(180 * sampleRate / hop)));
  const mean = average(usable);
  const normalized = usable.map(value => Math.max(0, value - mean));
  for (let bpm = 70; bpm <= 180; bpm += 1) {
    const lag = Math.max(1, Math.round((60 * sampleRate) / (hop * bpm)));
    let score = 0;
    for (let index = lag; index < normalized.length; index += 1) score += normalized[index] * normalized[index - lag];
    if (score > bestScore) { bestScore = score; bestBpm = bpm; }
  }
  const beatTimes = [];
  if (bestScore > 0 && bestBpm) {
    const periodFrames = Math.max(1, Math.round((60 * sampleRate) / (hop * bestBpm)));
    const offsetStep = Math.max(1, Math.round(periodFrames / 72));
    let bestOffset = 0;
    let bestOffsetScore = -Infinity;
    for (let offset = 0; offset < periodFrames; offset += offsetStep) {
      let score = 0;
      for (let frame = offset; frame < normalized.length; frame += periodFrames) score += normalized[Math.round(frame)] || 0;
      if (score > bestOffsetScore) { bestOffsetScore = score; bestOffset = offset; }
    }
    const beatInterval = 60 / bestBpm;
    const firstBeat = (bestOffset * hop) / sampleRate;
    for (let beat = firstBeat; beat <= duration; beat += beatInterval) beatTimes.push(Math.round(beat * 100) / 100);
  }
  const silentSections = [];
  let start = null;
  silenceWindows.forEach((silent, index) => {
    if (silent && start === null) start = index;
    if ((!silent || index === silenceWindows.length - 1) && start !== null) {
      const end = silent ? index + 1 : index;
      const from = (start * frameSize) / sampleRate;
      const to = (end * frameSize) / sampleRate;
      if (to - from >= .7) silentSections.push({ start: Math.round(from * 10) / 10, end: Math.round(to * 10) / 10 });
      start = null;
    }
  });
  return { duration: Math.round(duration * 10) / 10, bpm: bestScore > 0 ? bestBpm : null, beatTimes: beatTimes.slice(0, 600), loudnessDb: Math.round(loudnessDb * 10) / 10, silentSections: silentSections.slice(0, 4) };
};

self.onmessage = ({ data }) => {
  if (data?.type !== "analyze") return;
  try { self.postMessage({ type: "result", analysis: analyze(new Float32Array(data.samples), data.sampleRate) }); }
  catch (error) { self.postMessage({ type: "result", error: error?.message || "Audio analysis failed" }); }
};
