import { readdir, writeFile } from "node:fs/promises";
import { resolve, relative, extname, basename, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const publicRoot = resolve("public/audio/samples/library");
const manifestPath = resolve("public/audio/samples/manifest.json");
const extensions = new Set([".mp3", ".wav", ".m4a", ".aif", ".aiff"]);
const execFileAsync = promisify(execFile);

async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const location = resolve(folder, entry.name);
    if (entry.isDirectory()) return walk(location);
    return extensions.has(extname(entry.name).toLowerCase()) ? [location] : [];
  }));
  return files.flat();
}

const files = await walk(publicRoot).catch(error => {
  if (error.code === "ENOENT") return [];
  throw error;
});

const classify = (name, folder, genre = "") => {
  if (folder !== ".") return folder.split("/")[0];
  const text = `${name} ${genre}`.toLowerCase();
  if (/(drum|kick|snare|hat|beat)/.test(text)) return "Drums & Beats";
  if (/(voice|speaker|affirmative|japse|bman|g[0-9]_|ct[0-9]_|pilot|destroy him|wheredo|getdown|takecare|stayhim|teampos|shitpol)/.test(text)) return "Voices & Dialogue";
  if (/(explosion|bombe|flash|mgun|turret|laser|gun|slap|knall|dropgun|mortar|powerup|zap)/.test(text)) return "Impacts & Weapons";
  if (/(halloween|scary|thrillerton|breathing|chain|ghost)/.test(text)) return "Horror & Tension";
  if (/(loop|intro|hip-hop|music)/.test(text)) return "Loops & Music";
  if (/(wind|water|wassertropfen|city|subway|crowd|wood|bird|treetop|arctic|fan|fire|feuer|church|silo|pipes|ventilation|steam)/.test(text)) return "Atmospheres & Foley";
  if (/(alarm|ambulan|jet|hubschrauber|elevator|maschine|strom|tech|trip|dion|peep|car)/.test(text)) return "Machines & Vehicles";
  return "Other";
};

async function readMetadata(file) {
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration:format_tags=title,artist,genre", "-of", "json", file], { timeout: 4000 });
    const data = JSON.parse(stdout).format || {};
    return { duration: Number(data.duration || 0), title: data.tags?.title || "", artist: data.tags?.artist || "", genre: data.tags?.genre || "" };
  } catch { return { duration: 0, title: "", artist: "", genre: "" }; }
}

async function mapWithConcurrency(items, worker, concurrency = 10) {
  const result = []; let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; result[index] = await worker(items[index]); }
  }));
  return result;
}

const samples = await mapWithConcurrency(files, async file => {
  const relativePath = relative(publicRoot, file).replaceAll("\\", "/");
  const folder = dirname(relativePath);
  const metadata = await readMetadata(file);
  const displayName = metadata.title || basename(file, extname(file)).replaceAll(/[_-]+/g, " ");
  return {
    id: relativePath.replaceAll(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase(),
    name: displayName,
    path: `/audio/samples/library/${encodeURI(relativePath)}`,
    category: classify(`${displayName} ${relativePath}`, folder, metadata.genre),
    format: extname(file).slice(1).toUpperCase(),
    duration: metadata.duration,
    artist: metadata.artist,
    genre: metadata.genre,
  };
});

samples.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

await writeFile(manifestPath, `${JSON.stringify(samples, null, 2)}\n`);
console.log(`Indexed ${samples.length} samples in ${manifestPath}`);
