import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Mp3Encoder } from "@breezystack/lamejs";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import {
  ArrowDownToLine, ChevronDown, ChevronLeft, ChevronRight,
  Command, Download, FolderOpen, GripVertical, Headphones, Heart, Layers,
  Copy, Library, ListMusic, Mic, MoreHorizontal, Music2, Pause, Plus, Redo2, Repeat2, Scissors, SkipBack,
  Pencil, Search, SlidersHorizontal, Sparkles, Trash2, Undo2, Upload, Volume2, Wand2,
  X, Zap
} from "lucide-react";
import "./style.css";

const clips = [];
const isDesktopApp = () => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const storedAudioUrl = (path) => isDesktopApp() && path ? convertFileSrc(path) : path;
const readAudioAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Audio file could not be read"));
  reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
  reader.readAsDataURL(file);
});
const persistAudioFile = async (file, collection) => {
  if (!isDesktopApp()) return { storedPath: "", url: URL.createObjectURL(file) };
  const storedPath = await invoke("store_audio", { fileName: file.name, dataBase64: await readAudioAsBase64(file), collection });
  return { storedPath, url: storedAudioUrl(storedPath) };
};

const TRACK_COLORS = ["#d8ff6a", "#ee9dff", "#7db8ff", "#ffb66d", "#a4dc8f", "#f48db3", "#a8a2ff", "#79d7d0"];
const trackNameForLanguage = (number, language = "de") => `${language === "en" ? "Track" : "Spur"} ${String(number).padStart(2, "0")}`;
const emptyTrackDetailForLanguage = (language = "de") => language === "en" ? "Empty" : "Leer";
const createDefaultTracks = (count = 3, language = "de") => Array.from({ length: count }, (_, index) => ({
  name: trackNameForLanguage(index + 1, language),
  detail: emptyTrackDetailForLanguage(language),
  color: TRACK_COLORS[index % TRACK_COLORS.length],
}));
const tracks = createDefaultTracks();
const DEFAULT_PROJECT = {
  id: "late-summer",
  name: "Late Summer",
  description: "Eine ruhige Nachtfahrt Richtung Morgen.",
  duration: 360,
  trackList: createDefaultTracks(),
  timelineClips: [],
  imported: [],
  muted: [],
  solo: [],
  trackVolumes: [75, 75, 75],
  fades: {},
};
const loadProjects = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem("flowtape-projects"));
    return Array.isArray(stored) && stored.length ? stored : [DEFAULT_PROJECT];
  } catch { return [DEFAULT_PROJECT]; }
};
const clipAppearance = (clip, track, dragging, trackList) => {
  const targetTrack = dragging?.id === clip.id ? trackList[dragging.targetTrack] : track;
  const color = targetTrack?.color || track.color;
  const rgb = color.match(/[a-f\d]{2}/gi)?.map(value => parseInt(value, 16)) || [40, 40, 40];
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 255000;
  return { background: color, color: brightness > .62 ? "#1a210c" : "#f4f3ef" };
};

const TRACK_EFFECTS = [
  { id: "echo", label: "Echo", hint: "Wiederholungen" },
  { id: "reverb", label: "Hall", hint: "Raumgefühl" },
  { id: "warmth", label: "Wärme", hint: "Weicher Klang" },
  { id: "filter", label: "Horror-Filter", hint: "Tiefe Gruselstimme" },
  { id: "drive", label: "Drive", hint: "Mehr Sättigung" },
  { id: "mickey", label: "Mickey", hint: "Höher & schneller" },
];

const UI_COPY = {
  de: {
    yourMusic: "DEINE MUSIK", allFiles: "Alle Dateien", recentlyAdded: "Zuletzt hinzugefügt", favorites: "Favoriten", addMp3: "MP3 hinzufügen", addMusic: "Musik hinzufügen", libraryLead: "Alle Songs, Ideen und importierten Audiodateien an einem Ort.", libraryEmpty: "Deine Library ist noch leer", libraryEmptyLead: "Importiere eine MP3, um sie hier und im Studio zu verwenden.", firstMp3: "Erste MP3 hinzufügen",
    samplingCollection: "SAMPLING COLLECTION", soundsLead: "Durchsuche deine Loops, Drums, Vocals und Field Recordings.", importSamples: "Sounds importieren", searchSounds: "Nach Name, Kategorie, Artist oder Format suchen", sounds: "Sounds", soundCount: "Sounds", sampleReady: "Deine Sample-Library ist bereit", sampleReadyLead: "Lege MP3- oder WAV-Dateien in public/audio/samples/library ab und erstelle anschließend den Index.",
    yourProjects: "DEINE PROJEKTE", mixtapes: "Mixtapes", mixesLead: "Starte einen neuen Mix oder arbeite an einem bestehenden weiter.", newMixtape: "Neues Mixtape", newMixtapeLead: "Neues Mixtape anlegen", studio: "Studio", library: "Library", projectEdit: "Projekt bearbeiten", export: "Exportieren", exporting: "Exportiere …", exportFormats: "Exportformat", exportFormatsLead: "Wähle das Format für den Export.", undo: "Rückgängig", redo: "Wiederholen", restart: "Zum Anfang", loop: "Loop ein-/ausschalten", tempo: "Tempo", tempoHint: "Das Raster und Metronom folgen diesem Tempo.", metronome: "Metronom", addTrack: "Spur", emptyTrack: "Leere Spur", recordAudio: "Audio aufnehmen", tracks: "SPUREN", mute: "Spur stummschalten", solo: "Nur diese Spur hören", effects: "Effekte", volume: "Spurlautstärke", moveTrack: "Spur verschieben", empty: "Leer", importedMp3: "Importierte MP3", dragSnap: "Clips ziehen · Snap aktiv", zoomOut: "Herauszoomen", zoomIn: "Hineinzoomen", timelinePan: "Timeline-Ausschnitt verschieben",
    mixCollection: "DEINE SAMPLING COLLECTION", soundsForMix: "Sounds für diesen Mix", searchSamples: "Samples durchsuchen", preview: "Vorschau anhören", addTimeline: "Zur Timeline hinzufügen", removeFromMix: "Aus diesem Mix entfernen", sampleHint: "Ziehe einen Sound auf eine Spur, um ihn an der gewünschten Stelle zu platzieren.", addOwnSounds: "Eigene Sounds hinzufügen", addOwnSoundsLead: "MP3 hochladen, vorhören und in eine Spur legen", aiOpen: "flow AI öffnen", settings: "Einstellungen", quickTools: "Schnellwerkzeuge", closeAi: "KI-Fenster schließen", aiLead: "Bearbeite deinen Mix einfach mit deiner Stimme oder schreibe mir, was du brauchst.", ideaTitle: "Wie klingt deine Idee?", describeChange: "Beschreibe, was du ändern möchtest …", speak: "Sprich mit mir", listening: "Ich höre zu …",
    splitAtPlayhead: "An Abspielposition teilen", cut: "Ausschneiden", copy: "Kopieren", delete: "Löschen", duplicateTrack: "Spur duplizieren", deleteTrack: "Spur löschen", projectSettings: "PROJEKT-EINSTELLUNGEN", newProject: "NEUES PROJEKT", editMixtape: "Mixtape bearbeiten", createMixtape: "Neues Mixtape anlegen", projectLead: "Lege den Namen und den zeitlichen Rahmen für deinen Mix fest.", name: "Name", description: "Beschreibung", optional: "optional", totalLength: "Gesamtlänge", minutes: "Minuten", cancel: "Abbrechen", saveChanges: "Änderungen speichern", create: "Mixtape erstellen", settingsLead: "Lege deine Standardwerte für neue Mixtapes fest.", language: "Sprache", interfaceLanguage: "Sprache der Oberfläche", defaultTracks: "Standardspuren", defaultTracksLead: "Beim Anlegen eines neuen Mixtapes", done: "Fertig",
  },
  en: {
    yourMusic: "YOUR MUSIC", allFiles: "All files", recentlyAdded: "Recently added", favorites: "Favorites", addMp3: "Add MP3", addMusic: "Add Music", libraryLead: "All songs, ideas, and imported audio files in one place.", libraryEmpty: "Your library is empty", libraryEmptyLead: "Import an MP3 to use it here and in the studio.", firstMp3: "Import your first MP3",
    samplingCollection: "SAMPLE COLLECTION", soundsLead: "Browse your loops, drums, vocals, and field recordings.", importSamples: "Import Sounds", searchSounds: "Search by name, category, artist, or format", sounds: "Sounds", soundCount: "sounds", sampleReady: "Your sample library is ready", sampleReadyLead: "Put MP3 or WAV files in public/audio/samples/library, then refresh the index.",
    yourProjects: "YOUR PROJECTS", mixtapes: "Mixtapes", mixesLead: "Start a new mix or pick up where you left off.", newMixtape: "New mixtape", newMixtapeLead: "Create a new mixtape", studio: "Studio", library: "Library", projectEdit: "Edit project", export: "Export", exporting: "Exporting …", exportFormats: "Export format", exportFormatsLead: "Choose the format for export.", undo: "Undo", redo: "Redo", restart: "Back to start", loop: "Toggle loop", tempo: "Tempo", tempoHint: "The grid and metronome follow this tempo.", metronome: "Metronome", addTrack: "Track", emptyTrack: "Empty track", recordAudio: "Record audio", tracks: "TRACKS", mute: "Mute track", solo: "Solo track", effects: "Effects", volume: "Track volume", moveTrack: "Move track", empty: "Empty", importedMp3: "Imported MP3", dragSnap: "Drag clips · Snap on", zoomOut: "Zoom out", zoomIn: "Zoom in", timelinePan: "Pan timeline",
    mixCollection: "YOUR SAMPLE COLLECTION", soundsForMix: "Sounds for this mix", searchSamples: "Search samples", preview: "Preview", addTimeline: "Add to timeline", removeFromMix: "Remove from this mix", sampleHint: "Drag a sound onto a track to place it at the position you want.", addOwnSounds: "Add your own sounds", addOwnSoundsLead: "Upload an MP3, preview it, and place it on a track", aiOpen: "Open flow AI", settings: "Settings", quickTools: "Quick tools", closeAi: "Close AI panel", aiLead: "Edit your mix with your voice or just tell me what you need.", ideaTitle: "What does your idea sound like?", describeChange: "Describe what you want to change …", speak: "Talk to me", listening: "Listening …",
    splitAtPlayhead: "Split at playhead", cut: "Cut", copy: "Copy", delete: "Delete", duplicateTrack: "Duplicate track", deleteTrack: "Delete track", projectSettings: "PROJECT SETTINGS", newProject: "NEW PROJECT", editMixtape: "Edit mixtape", createMixtape: "Create a new mixtape", projectLead: "Set the name and duration for your mix.", name: "Name", description: "Description", optional: "optional", totalLength: "Total length", minutes: "minutes", cancel: "Cancel", saveChanges: "Save changes", create: "Create mixtape", settingsLead: "Set your defaults for new mixtapes.", language: "Language", interfaceLanguage: "Interface language", defaultTracks: "Default tracks", defaultTracksLead: "When creating a new mixtape", done: "Done",
  },
};
const translate = (language, key) => UI_COPY[language]?.[key] || UI_COPY.de[key] || key;
UI_COPY.en.addOwnSounds = "Add your Music";
UI_COPY.de.addOwnSounds = "Eigene Musik hinzufügen";

const WORKSPACE_TEST_AUDIO = {
  id: "workspace-test-mp3",
  name: "Sample Song",
  fileName: "test.mp3",
  url: "/audio/test.mp3",
  duration: "Bereit zum Anhören",
  workspaceFile: true,
};

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return total ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}` : "--:--";
};

const encodeWav = (audioBuffer) => {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const frameCount = audioBuffer.length;
  const bytesPerSample = 2;
  const dataSize = frameCount * channels * bytesPerSample;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);
  const writeText = (offset, value) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  writeText(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeText(8, "WAVE");
  writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, 16, true);
  writeText(36, "data"); view.setUint32(40, dataSize, true);
  const audioChannels = Array.from({ length: channels }, (_, channel) => audioBuffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, audioChannels[channel][frame] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }
  return wav;
};

const encodeMp3 = (audioBuffer) => {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const encoder = new Mp3Encoder(channels, audioBuffer.sampleRate, 192);
  const left = audioBuffer.getChannelData(0);
  const right = channels === 2 ? audioBuffer.getChannelData(1) : null;
  const chunks = [];
  const blockSize = 1152;
  const toPcm16 = (source, start, length) => {
    const pcm = new Int16Array(length);
    for (let index = 0; index < length; index += 1) {
      const sample = Math.max(-1, Math.min(1, source[start + index] || 0));
      pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return pcm;
  };
  for (let start = 0; start < audioBuffer.length; start += blockSize) {
    const length = Math.min(blockSize, audioBuffer.length - start);
    const leftPcm = toPcm16(left, start, length);
    const encoded = channels === 2 ? encoder.encodeBuffer(leftPcm, toPcm16(right, start, length)) : encoder.encodeBuffer(leftPcm);
    if (encoded.length) chunks.push(new Int8Array(encoded));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Int8Array(tail));
  return new Blob(chunks, { type: "audio/mpeg" });
};

const safeFileName = (value) => (value || "Mein Mixtape").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ") || "Mein Mixtape";

function Waveform({ type = "low", density = 1 }) {
  const bars = useMemo(() => Array.from({ length: Math.min(280, Math.round(140 * density)) }, (_, i) => {
    let n = Math.abs(Math.sin(i * 1.77) * 0.7 + Math.sin(i * 0.29) * 0.45);
    if (type === "high") n = Math.abs(Math.sin(i * 2.8)) * .9;
    if (type === "voice") n = Math.abs(Math.sin(i * .62) * .5 + Math.sin(i * 2.2) * .3);
    if (type === "full") n = Math.abs(Math.sin(i * .46) * .65 + Math.cos(i * 2.1) * .23);
    if (type === "ticks") n = i % 6 === 0 ? .95 : .12;
    if (type === "rise") n = (i / 56) * .8 + Math.abs(Math.sin(i * .9)) * .18;
    if (type === "ambient") n = .18 + Math.abs(Math.sin(i * .33)) * .27;
    return Math.max(12, Math.round(n * 100));
  }), [type, density]);
  return <div className="waveform">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>;
}

function RoundedPlay({ size = 16, width = size, ...props }) {
  return <svg className="rounded-play" width={width} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}><path fill="currentColor" d="M8.35 4.25C6.8 3.3 4.9 4.4 4.9 6.22v11.56c0 1.82 1.9 2.92 3.45 1.97l9.36-5.77c1.52-.94 1.52-3.16 0-4.1L8.35 4.25Z"/></svg>;
}

function Play({ size = 16, ...props }) {
  return <RoundedPlay size={size} {...props}/>;
}

function LibraryView({ imported, onUpload, onPreview, onRemove, activePreview, language }) {
  const t = key => translate(language, key);
  return <section className="collection-view"><div className="collection-hero"><div><div className="eyebrow">{t("yourMusic")}</div><h1>Library</h1><p>{t("libraryLead")}</p></div></div><div className="collection-tabs"><button className="active-tab">{t("allFiles")}</button><button>{t("recentlyAdded")}</button><button>{t("favorites")}</button></div>{imported.length ? <div className="library-grid">{imported.map(item => <article className="library-card" key={item.id}><button className="library-play" onClick={() => onPreview(item)} title={t("preview")}>{activePreview === item.id ? <Pause size={16} fill="currentColor"/> : <RoundedPlay size={16}/>}</button><div className="library-meta"><b>{item.name}</b><span>{item.duration}</span></div><button className="library-delete" onClick={() => onRemove(item.id)} title={t("delete")}><Trash2 size={17}/></button></article>)}</div> : <div className="empty-library"><Music2 size={27}/><h2>{t("libraryEmpty")}</h2><p>{t("libraryEmptyLead")}</p><button className="upload" onClick={onUpload}><Upload size={15}/> {t("firstMp3")}</button></div>}</section>;
}

function SoundsView({ samples, query, setQuery, selectedCategory, setSelectedCategory, onPreview, onAdd, onToggleFavorite, favoriteIds, activePreview, language }) {
  const t = key => translate(language, key);
  const favoritesOnly = selectedCategory === "__favorites";
  const normalizeSearch = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const editDistance = (first, second) => {
    const rows = Array.from({ length: first.length + 1 }, (_, index) => [index]);
    for (let column = 0; column <= second.length; column += 1) rows[0][column] = column;
    for (let row = 1; row <= first.length; row += 1) for (let column = 1; column <= second.length; column += 1) rows[row][column] = first[row - 1] === second[column - 1] ? rows[row - 1][column - 1] : Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + 1);
    return rows[first.length][second.length];
  };
  const sampleMatchesSearch = sample => {
    const searchText = normalizeSearch(`${sample.name} ${sample.category} ${sample.format} ${sample.artist} ${sample.genre} ${sample.path} ${sample.id}`);
    const words = searchText.split(/[^a-z0-9]+/).filter(Boolean);
    return normalizeSearch(query).split(/\s+/).filter(Boolean).every(term => searchText.includes(term) || (term.length >= 3 && words.some(word => editDistance(term.replace(/[cg]/g, "k"), word.replace(/[cg]/g, "k").slice(0, term.length + 1)) <= 1)));
  };
  const visibleSamples = samples.filter(sample => sampleMatchesSearch(sample) && (!selectedCategory || (favoritesOnly ? favoriteIds.includes(sample.id) : sample.category === selectedCategory)));
  const categories = [...new Set(samples.map(sample => sample.category))];
  return <section className="collection-view sounds-view"><div className="collection-hero"><div><div className="eyebrow">{t("samplingCollection")}</div><h1>{t("sounds")}</h1><p>{t("soundsLead")}</p></div></div><div className="sample-search"><Search size={18}/><input value={query} onChange={event => { setQuery(event.target.value); if (event.target.value.trim()) setSelectedCategory(""); }} placeholder={t("searchSounds")}/><span>{visibleSamples.length} {t("soundCount")}</span></div>{samples.length ? <><div className="category-pills"><button className={favoritesOnly ? "category-active" : ""} onClick={() => setSelectedCategory(favoritesOnly ? "" : "__favorites")}><Heart size={13} fill={favoritesOnly ? "currentColor" : "none"}/>{t("favorites")}{favoritesOnly && <span className="category-clear" onClick={event => { event.stopPropagation(); setSelectedCategory(""); }} title={language === "de" ? "Favoriten abwählen" : "Clear favorites filter"}><X size={13}/></span>}</button>{categories.map(category => <button className={selectedCategory === category ? "category-active" : ""} key={category} onClick={() => setSelectedCategory(category)}>{category}{selectedCategory === category && <span className="category-clear" onClick={event => { event.stopPropagation(); setSelectedCategory(""); }} title={language === "de" ? "Kategorie abwählen" : "Clear category filter"}><X size={13}/></span>}</button>)}</div><div className="sample-browser">{visibleSamples.map(sample => <article className="sample-browser-card" key={sample.id}><button className="library-play" onClick={() => onPreview({ id: sample.id, name: sample.name, url: sample.path })}>{activePreview === sample.id ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button><div><b>{sample.name}</b><span>{formatDuration(sample.duration)}</span></div><button className={favoriteIds.includes(sample.id) ? "sample-favorite is-favorite" : "sample-favorite"} onClick={() => onToggleFavorite(sample.id)} title={favoriteIds.includes(sample.id) ? (language === "de" ? "Aus Favoriten entfernen" : "Remove from favorites") : (language === "de" ? "Zu Favoriten hinzufügen" : "Add to favorites")}><Heart size={16} fill={favoriteIds.includes(sample.id) ? "currentColor" : "none"}/></button><button className="sample-add" onClick={() => onAdd(sample)} title={language === "de" ? "Zum Mix hinzufügen" : "Add to mix"}><Plus size={17}/></button></article>)}</div></> : <div className="sounds-info"><Sparkles size={18}/><div><b>{t("sampleReady")}</b><p>{t("sampleReadyLead")}</p></div></div>}</section>;
}

function MixesView({ projects, activeProjectId, onOpen, onContextMenu, language }) {
  const t = key => translate(language, key);
  return <section className="collection-view mixes-view"><div className="collection-hero"><div><div className="eyebrow">{t("yourProjects")}</div><h1>{t("mixtapes")}</h1><p>{t("mixesLead")}</p></div></div><div className="mix-project-grid">{projects.map(project => <button className={`mix-project-card ${project.id === activeProjectId ? "active-project-card" : ""}`} onClick={() => onOpen(project.id)} onContextMenu={event => { event.preventDefault(); onContextMenu(event, project.id); }} key={project.id}><div className="mix-project-art"><Layers size={22}/></div><div><b>{project.name}</b><span>{formatDuration(project.duration)} <i>·</i> {project.description}</span></div><ChevronRight size={18}/></button>)}</div></section>;
}

function FlowtapeLanding() {
  useEffect(() => {
    document.body.classList.add("landing-body");
    document.documentElement.lang = "en";
    document.title = "flowtape — Make your mix";
    return () => document.body.classList.remove("landing-body");
  }, []);
  return <main className="landing-page">
    <nav className="landing-nav"><a className="landing-brand" href="?landing"><span>f</span>flowtape</a><div className="landing-nav-links"><a href="#features">Features</a><a href="#download">Download</a></div><a className="landing-nav-cta" href="#download">Get Flowtape <ArrowDownToLine size={15}/></a></nav>
    <section className="landing-hero"><div className="landing-hero-copy"><div className="landing-kicker"><i/> MULTI-TRACK MIXING, MADE CALM</div><h1>Make your next<br/><em>mix</em> feel effortless.</h1><p>Flowtape is a focused desktop studio for building mixtapes, shaping voice, and layering the sounds you love.</p><div className="landing-actions"><a className="landing-primary" href="#download">Get Flowtape <ArrowDownToLine size={17}/></a><a className="landing-secondary" href="#features">See what’s inside <ChevronRight size={16}/></a></div><div className="landing-availability"><span>Available for</span><b>macOS</b><i/> <b>Windows</b></div></div><div className="landing-preview" aria-label="Flowtape studio preview"><div className="preview-top"><span className="preview-logo">f</span><span>Late Summer</span><div><i/><i/><i/></div></div><div className="preview-project"><small>MIXTAPE</small><b>Late Summer</b><span>A quiet ride towards morning.</span></div><div className="preview-transport"><button><SkipBack size={15}/></button><button className="preview-play"><Play size={18}/></button><span>0:33 <i>/</i> 6:00</span><button><Repeat2 size={14}/></button><b>92 <small>BPM</small></b></div><div className="preview-timeline"><div className="preview-ruler"><span>TRACKS <b>03</b></span><i>0:00</i><i>1:30</i><i>3:00</i><i>4:30</i></div>{[["Drums","#d8ff6a","#9bbf5d",12,37,"wide"],["Voice","#ee9dff","#9a699a",29,26,"medium"],["Textures","#7db8ff","#5878b1",5,51,"long"]].map(([name,dot,color,start,width,type]) => <div className="preview-track" key={name}><div><span style={{background:dot}}/><b>{name}</b><small>◦ ◦ ◦</small></div><section><article className={type} style={{left:`${start}%`,width:`${width}%`,background:color}}><b>{name === "Voice" ? "soft spoken" : name === "Drums" ? "daylight break" : "vinyl room"}</b><div>{Array.from({length:24},(_,i)=><i key={i} style={{height:`${20 + ((i * 17) % 52)}%`}}/>)}</div></article></section></div>)}</div><div className="preview-library"><span>YOUR SOUND COLLECTION</span><div><button><Play size={14}/></button><b>Sample Song<small>3:36</small></b><i/></div></div></div></section>
    <section className="landing-statement"><p>Everything you need to make something that <em>sounds like you.</em></p></section>
    <section className="landing-features" id="features"><div className="landing-section-head"><div className="landing-kicker"><i/> BUILT FOR THE MOMENT BETWEEN IDEA AND MIX</div><h2>Move from sound<br/>to story.</h2><p>A compact set of tools that stays out of your way until you need it.</p></div><div className="feature-grid"><article><span><Layers size={19}/></span><h3>Build in layers</h3><p>Arrange unlimited tracks, drag clips into place, snap them together, and make precise cuts.</p></article><article><span><Music2 size={19}/></span><h3>Your sounds, ready</h3><p>Bring in MP3 and WAV files, browse your samples, preview them, and drop them straight onto the timeline.</p></article><article><span><Mic size={19}/></span><h3>Record the moment</h3><p>Capture a voice note or a take directly in the studio, then trim, fade, and move it like any other clip.</p></article><article><span><Sparkles size={19}/></span><h3>Shape the feeling</h3><p>Add fades, track effects, tempo, and a metronome. Keep every transition intentional.</p></article></div></section>
    <section className="landing-workflow"><div className="workflow-copy"><div className="landing-kicker"><i/> ONE QUIET WORKSPACE</div><h2>From a folder<br/>full of sounds<br/>to one complete mix.</h2><p>Your library travels with each project, so every sample stays close to the mix it belongs to.</p><ul><li><span>01</span> Drag samples exactly where they belong</li><li><span>02</span> Edit with keyboard shortcuts and a visual timeline</li><li><span>03</span> Export only the audio you actually use</li></ul></div><div className="workflow-orb"><div className="orb-ring orb-ring-one"/><div className="orb-ring orb-ring-two"/><div className="orb-core"><span>f</span></div><small>YOUR SOUNDS<br/>IN FLOW</small></div></section>
    <section className="landing-download" id="download"><div><div className="landing-kicker"><i/> FLOWTAPE DESKTOP</div><h2>Make room for your<br/><em>next idea.</em></h2></div><div className="download-options"><a href="#download"><span></span><div><small>AVAILABLE FOR</small><b>macOS</b><em>Apple silicon & Intel</em></div><ChevronRight size={18}/></a><a href="#download"><span>⊞</span><div><small>AVAILABLE FOR</small><b>Windows</b><em>Intel & AMD</em></div><ChevronRight size={18}/></a></div></section>
    <footer className="landing-footer"><a className="landing-brand" href="?landing"><span>f</span>flowtape</a><p>Made for mixes with feeling.</p><span>© 2026 Flowtape</span></footer>
  </main>;
}

function FlowtapeLandingV2() {
  const [downloadOverlayOpen, setDownloadOverlayOpen] = useState(false);
  useEffect(() => {
    document.body.classList.add("landing-body");
    document.documentElement.lang = "en";
    document.title = "flowtape — Make your mix";
    const setScrollProgress = () => setLandingScroll(Math.min(1, window.scrollY / 620));
    window.addEventListener("scroll", setScrollProgress, { passive: true });
    setScrollProgress();
    return () => { document.body.classList.remove("landing-body"); window.removeEventListener("scroll", setScrollProgress); };
  }, []);
  const [landingScroll, setLandingScroll] = useState(0);
  return <main className="landing-v3">
    <header className="landing-v3-nav"><a href="?landing" className="landing-v3-brand"><span>f</span>flowtape</a><div className="landing-v3-platforms"><button type="button" onClick={() => setDownloadOverlayOpen(true)}><span></span> macOS</button><button type="button" onClick={() => setDownloadOverlayOpen(true)}><span>⊞</span> Windows</button></div></header>
    <section className="landing-v3-hero"><div className="landing-v3-kicker"><i/> TURN A FEELING INTO A MIX</div><h1>Make your ideas<br/><em>move</em></h1><p>Build a mixtape, shape a transition, and make every sound feel exactly where it belongs.</p><div className="landing-v3-actions"><button type="button" onClick={() => setDownloadOverlayOpen(true)}><span>Explore the studio <ChevronRight size={17}/></span></button></div><div className="landing-v3-proof"><span>Apple silicon & Intel</span><i/> <span>Windows ready</span><i/> <span>Local-first</span></div></section>
    <section className="landing-v3-stage-wrap landing-v3-screenshot-wrap" aria-label="Flowtape studio preview"><div className="landing-v3-stage-shadow"/><figure className="landing-v3-screenshot" style={{ transform: `scale(${0.86 + landingScroll * 0.14}) translateY(${(1 - landingScroll) * 42}px)` }}><img src="/flowtape-studio-preview-v2.png" alt="Flowtape Studio with multi-track audio timeline"/></figure></section>
    <section className="landing-v3-features" id="features"><div><span>01</span><h2>Made to stay simple.</h2><p>Drag, trim, split, fade, and arrange clips on a clear multi-track timeline.</p></div><div><span>02</span><h2>A library that stays ready.</h2><p>Browse included samples, import MP3 or WAV files, search, favourite, preview, and drag them right into your mix.</p></div><div><span>03</span><h2>Shape every transition.</h2><p>Record voice, add effects, use tempo and metronome tools, then export only the audio you use.</p></div></section>
    <section className="landing-v3-download-section" id="download"><div><div className="landing-v3-kicker"><i/> FLOWTAPE DESKTOP</div><h2>Ready when the<br/><em>idea arrives</em></h2></div><div className="landing-v3-download-options"><a href="https://github.com/SandroIeva/flowtape/releases/download/v0.1.0/Flowtape.Studio_0.1.0_universal.dmg" className="landing-v3-download"><span></span> Download for macOS</a><a href="https://github.com/SandroIeva/flowtape/releases/download/v0.1.0/Flowtape.Studio_0.1.0_x64-setup.exe" className="landing-v3-windows"><span>⊞</span> Download for Windows</a></div></section>
    <footer className="landing-v3-footer"><a href="?landing" className="landing-v3-brand"><span>f</span>flowtape</a><span>Made for mixes with feeling.</span><nav><a href="/imprint.html">Imprint</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav></footer>
    {downloadOverlayOpen && <div className="landing-download-overlay" role="presentation" onPointerDown={() => setDownloadOverlayOpen(false)}><section className="landing-download-dialog" role="dialog" aria-modal="true" aria-labelledby="download-title" onPointerDown={(event) => event.stopPropagation()}><button className="landing-download-close" type="button" aria-label="Close download options" onClick={() => setDownloadOverlayOpen(false)}><X size={18}/></button><div className="landing-v3-kicker"><i/> FLOWTAPE DESKTOP</div><h2 id="download-title">Choose your platform.</h2><p>One local-first studio, built for the way you make music.</p><div className="landing-download-grid"><a href="https://github.com/SandroIeva/flowtape/releases/download/v0.1.0/Flowtape.Studio_0.1.0_universal.dmg"><span></span><b>macOS</b><small>Universal installer<br/>Apple Silicon & Intel</small><em>Download <ChevronRight size={14}/></em></a><a href="https://github.com/SandroIeva/flowtape/releases/download/v0.1.0/Flowtape.Studio_0.1.0_x64-setup.exe"><span>⊞</span><b>Windows</b><small>x64 installer<br/>Intel & AMD</small><em>Download <ChevronRight size={14}/></em></a></div></section></div>}
  </main>;
}

function App() {
  const [playing, setPlaying] = useState(false);
  const [activeNav, setActiveNav] = useState("Studio");
  const [muted, setMuted] = useState([]);
  const [solo, setSolo] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([{ role: "ai", text: "Hey! Ich bin bereit. Sag mir einfach, was du in deinem Mixtape verändern möchtest." }]);
  const [toast, setToast] = useState("");
  const [imported, setImported] = useState([]);
  const [timelineClips, setTimelineClips] = useState(clips);
  const [trackList, setTrackList] = useState(tracks);
  const [activePreview, setActivePreview] = useState(null);
  const [playbackTime, setPlaybackTime] = useState(33);
  const [editingPlaybackTime, setEditingPlaybackTime] = useState(false);
  const [playbackTimeDraft, setPlaybackTimeDraft] = useState("0:33");
  const [projectDuration, setProjectDuration] = useState(360);
  const [projectName, setProjectName] = useState("Late Summer");
  const [projectDescription, setProjectDescription] = useState("Eine ruhige Nachtfahrt Richtung Morgen.");
  const [projectSetupMode, setProjectSetupMode] = useState(null);
  const [projects, setProjects] = useState(loadProjects);
  const [activeProjectId, setActiveProjectId] = useState(() => window.localStorage.getItem("flowtape-active-project") || "late-summer");
  const [draftProjectName, setDraftProjectName] = useState("Late Summer");
  const [draftProjectDescription, setDraftProjectDescription] = useState("Eine ruhige Nachtfahrt Richtung Morgen.");
  const [draftProjectMinutes, setDraftProjectMinutes] = useState(6);
  const [loopActive, setLoopActive] = useState(false);
  const [bpm, setBpm] = useState(92);
  const [tempoPopoverOpen, setTempoPopoverOpen] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomePopoverOpen, setMetronomePopoverOpen] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(65);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiLayout, setAiLayout] = useState("side");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [snapAnimatingClipId, setSnapAnimatingClipId] = useState(null);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [fades, setFades] = useState({});
  const [seeking, setSeeking] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [clipboardClip, setClipboardClip] = useState(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [trackDrag, setTrackDrag] = useState(null);
  const [trackVolumes, setTrackVolumes] = useState([75, 75, 75]);
  const [volumePopoverTrack, setVolumePopoverTrack] = useState(null);
  const [trackContextMenu, setTrackContextMenu] = useState(null);
  const [mixtapeContextMenu, setMixtapeContextMenu] = useState(null);
  const [effectsPopoverTrack, setEffectsPopoverTrack] = useState(null);
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [editingTrack, setEditingTrack] = useState(null);
  const [trackNameDraft, setTrackNameDraft] = useState("");
  const [history, setHistory] = useState({ past: [], future: [] });
  const [listening, setListening] = useState(false);
  const [librarySamples, setLibrarySamples] = useState([]);
  const [importedSounds, setImportedSounds] = useState(() => {
    try { const stored = JSON.parse(window.localStorage.getItem("flowtape-imported-sounds")); return Array.isArray(stored) ? stored : []; } catch { return []; }
  });
  const allLibrarySamples = useMemo(() => [...importedSounds, ...librarySamples], [importedSounds, librarySamples]);
  const [sampleQuery, setSampleQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [favoriteSampleIds, setFavoriteSampleIds] = useState(() => {
    try { const stored = JSON.parse(window.localStorage.getItem("flowtape-favorite-samples")); return Array.isArray(stored) ? stored : []; } catch { return []; }
  });
  const [exporting, setExporting] = useState(false);
  const [draggedLibraryItemId, setDraggedLibraryItemId] = useState(null);
  const [libraryDropTrack, setLibraryDropTrack] = useState(null);
  const [libraryDropPreview, setLibraryDropPreview] = useState(null);
  const [pendingImportRemoval, setPendingImportRemoval] = useState(null);
  const [pendingMixtapeRemoval, setPendingMixtapeRemoval] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appLanguage, setAppLanguage] = useState(() => window.localStorage.getItem("flowtape-language") || "de");
  const [userName, setUserName] = useState(() => window.localStorage.getItem("flowtape-user-name") || "");
  const [welcomeOpen, setWelcomeOpen] = useState(() => !window.localStorage.getItem("flowtape-user-name"));
  const [welcomeNameDraft, setWelcomeNameDraft] = useState("");
  const [defaultTrackCount, setDefaultTrackCount] = useState(() => Math.min(8, Math.max(1, Number(window.localStorage.getItem("flowtape-default-tracks")) || 3)));
  const [exportFormat, setExportFormat] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("flowtape-export-formats"));
      if (stored === "mp3") return "mp3";
      if (Array.isArray(stored) && stored.length === 1 && stored[0] === "mp3") return "mp3";
      return "wav";
    } catch { return "wav"; }
  });
  const fileInput = useRef(null);
  const soundFileInput = useRef(null);
  const projectHydratedRef = useRef(false);
  const projectSwitchingRef = useRef(false);
  const previewAudio = useRef(null);
  const previewId = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioEffectGraphs = useRef(new WeakMap());
  const metronomeContextRef = useRef(null);
  const metronomeBeatRef = useRef(null);
  const playbackTimeRef = useRef(playbackTime);
  const timelineAudioPlayers = useRef(new Map());
  const durationRequests = useRef(new Map());
  const historySnapshotRef = useRef(null);
  const draggedLibraryItemRef = useRef(null);
  const libraryPointerDragRef = useRef(null);
  const playheadPointerDragRef = useRef(false);
  const t = key => translate(appLanguage, key);
  const metronomeVolumeLabel = appLanguage === "de" ? "Lautstärke" : "Volume";
  const shortcutsCopy = appLanguage === "de" ? {
    eyebrow: "TASTENKÜRZEL", title: "Schnell arbeiten", lead: "Die wichtigsten Befehle für die Timeline auf einen Blick.",
    rows: [["Leertaste", "Wiedergabe starten oder stoppen"], ["⌘ Z", "Letzten Schritt rückgängig machen"], ["+ / −", "Timeline vergrößern oder verkleinern"], ["← / →", "Abspielkopf in kleinen Schritten bewegen"], ["⇧ + ← / →", "Abspielkopf in großen Schritten bewegen"], ["S", "Abspielkopf an den Anfang setzen"], ["⌘ B", "Ausgewählten Clip an der Abspielposition teilen"], ["⌫ / Entf", "Ausgewählten Clip löschen"]], close: "Fertig"
  } : {
    eyebrow: "KEYBOARD SHORTCUTS", title: "Work faster", lead: "The most useful timeline controls at a glance.",
    rows: [["Space", "Start or stop playback"], ["⌘ Z", "Undo the last edit"], ["+ / −", "Zoom the timeline in or out"], ["← / →", "Move the playhead in small steps"], ["⇧ + ← / →", "Move the playhead in large steps"], ["S", "Move the playhead to the start"], ["⌘ B", "Split the selected clip at the playhead"], ["⌫ / Del", "Delete the selected clip"]], close: "Done"
  };
  const notify = (text) => { setToast(text); window.setTimeout(() => setToast(""), 2400); };
  const changeTempo = (value) => setBpm(Math.max(40, Math.min(240, Math.round(Number(value) || 40))));
  const toggleMetronome = () => {
    const next = !metronomeEnabled;
    if (next) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) {
        metronomeContextRef.current ||= new Context();
        metronomeContextRef.current.resume().catch(() => {});
      }
    }
    setMetronomeEnabled(next);
    setMetronomePopoverOpen(next);
  };
  const finishWelcome = () => {
    const name = welcomeNameDraft.trim();
    if (!name) { notify("Gib bitte deinen Namen ein"); return; }
    setUserName(name);
    window.localStorage.setItem("flowtape-user-name", name);
    setWelcomeOpen(false);
  };
  const toggle = (list, setList, item) => setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  useEffect(() => {
    window.localStorage.setItem("flowtape-language", appLanguage);
    document.documentElement.lang = appLanguage;
    setTrackList(current => current.map(track => {
      const defaultName = track.name.match(/^(?:Spur|Track) (\d{2})$/);
      if (!defaultName || !["Leer", "Empty"].includes(track.detail)) return track;
      return { ...track, name: trackNameForLanguage(Number(defaultName[1]), appLanguage), detail: emptyTrackDetailForLanguage(appLanguage) };
    }));
  }, [appLanguage]);
  useEffect(() => { window.localStorage.setItem("flowtape-default-tracks", String(defaultTrackCount)); }, [defaultTrackCount]);
  useEffect(() => { window.localStorage.setItem("flowtape-export-formats", JSON.stringify(exportFormat)); }, [exportFormat]);
  useEffect(() => {
    const storable = projects.map(project => {
      const importedItems = (project.imported || []).filter(item => !String(item.url || "").startsWith("blob:"));
      const availableIds = new Set(importedItems.map(item => item.id));
      return { ...project, imported: importedItems, timelineClips: (project.timelineClips || []).filter(clip => !clip.audioItemId || availableIds.has(clip.audioItemId)) };
    });
    window.localStorage.setItem("flowtape-projects", JSON.stringify(storable));
    window.localStorage.setItem("flowtape-active-project", activeProjectId);
  }, [projects, activeProjectId]);
  const resolveAudioDuration = (item) => {
    const knownDuration = Number(item.durationSeconds);
    if (Number.isFinite(knownDuration) && knownDuration > 0) return Promise.resolve(knownDuration);
    if (durationRequests.current.has(item.id)) return durationRequests.current.get(item.id);
    const request = new Promise((resolve, reject) => {
      const audio = new Audio();
      const timeout = window.setTimeout(() => finish(null), 8000);
      const finish = (duration) => {
        window.clearTimeout(timeout);
        if (Number.isFinite(duration) && duration > 0) resolve(duration);
        else reject(new Error("Audio duration unavailable"));
      };
      audio.preload = "metadata";
      audio.onloadedmetadata = () => finish(audio.duration);
      audio.onerror = () => finish(null);
      audio.src = item.url;
      audio.load();
    });
    durationRequests.current.set(item.id, request);
    request.then(() => durationRequests.current.delete(item.id), () => durationRequests.current.delete(item.id));
    return request;
  };
  const fitProjectToClip = (startSeconds, duration) => {
    const requiredDuration = Math.max(1, startSeconds + duration);
    const nextDuration = Math.max(projectDuration, requiredDuration);
    if (Math.abs(nextDuration - projectDuration) > .01) {
      const scale = projectDuration / nextDuration;
      setTimelineClips(current => current.map(clip => ({ ...clip, start: clip.start * scale, width: clip.width * scale })));
      setProjectDuration(nextDuration);
      setPlaybackTime(current => Math.min(current, nextDuration));
    }
    return nextDuration;
  };
  const routeTrackAudioEffects = (audio, effects = {}) => {
    const hasWebAudio = window.AudioContext || window.webkitAudioContext;
    if (!hasWebAudio) return;
    try {
      const hasActiveEffects = TRACK_EFFECTS.some(effect => (Number(effects[effect.id]) || 0) > 0);
      let graph = audioEffectGraphs.current.get(audio);
      if (!hasActiveEffects) {
        if (graph?.signature !== "dry") {
          graph?.nodes.forEach(node => { try { node.disconnect(); } catch {} });
          graph?.source.disconnect();
          graph?.source.connect(graph.context.destination);
          if (graph) { graph.nodes = []; graph.signature = "dry"; }
        }
        return;
      }
      const signature = TRACK_EFFECTS.map(effect => effects[effect.id] || 0).join(":");
      if (graph?.signature === signature) { graph.context.resume().catch(() => {}); return; }
      if (!graph) {
        const context = new hasWebAudio();
        graph = { context, source: context.createMediaElementSource(audio), nodes: [] };
        audioEffectGraphs.current.set(audio, graph);
      }
      graph.nodes.forEach(node => { try { node.disconnect(); } catch {} });
      graph.nodes = [];
      graph.source.disconnect();
      const { context } = graph;
      let input = graph.source;
      const nodes = graph.nodes;
      const addWetEffect = (createWet) => {
        const mix = context.createGain();
        const wet = createWet();
        input.connect(mix);
        input.connect(wet);
        wet.connect(mix);
        nodes.push(mix, wet);
        input = mix;
      };
      const echo = effects.echo || 0;
      if (echo > 0) {
        const delay = context.createDelay(1.4);
        const feedback = context.createGain();
        delay.delayTime.value = .08 + (echo / 100) * .55;
        feedback.gain.value = .12 + (echo / 100) * .48;
        addWetEffect(() => { delay.connect(feedback); feedback.connect(delay); nodes.push(delay, feedback); return delay; });
      }
      const reverb = effects.reverb || 0;
      if (reverb > 0) addWetEffect(() => {
        const convolver = context.createConvolver();
        const length = Math.floor(context.sampleRate * (.3 + (reverb / 100) * 1.7));
        const impulse = context.createBuffer(2, length, context.sampleRate);
        for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
          const data = impulse.getChannelData(channel);
          for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
        convolver.buffer = impulse;
        return convolver;
      });
      const warmth = effects.warmth || 0;
      if (warmth > 0) {
        const shelf = context.createBiquadFilter();
        shelf.type = "lowshelf"; shelf.frequency.value = 260; shelf.gain.value = (warmth / 100) * 12;
        input.connect(shelf); nodes.push(shelf); input = shelf;
      }
      const filter = effects.filter || 0;
      if (filter > 0) {
        const bass = context.createBiquadFilter();
        bass.type = "lowshelf"; bass.frequency.value = 180; bass.gain.value = (filter / 100) * 16;
        const lowpass = context.createBiquadFilter();
        lowpass.type = "lowpass"; lowpass.frequency.value = Math.max(360, 20000 - (filter / 100) * 19600);
        input.connect(bass); bass.connect(lowpass); nodes.push(bass, lowpass); input = lowpass;
      }
      const drive = effects.drive || 0;
      if (drive > 0) {
        const shaper = context.createWaveShaper();
        const curve = new Float32Array(256);
        const amount = 1 + (drive / 100) * 28;
        for (let i = 0; i < curve.length; i += 1) { const x = (i * 2) / curve.length - 1; curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
        shaper.curve = curve; shaper.oversample = "2x";
        input.connect(shaper); nodes.push(shaper); input = shaper;
      }
      input.connect(context.destination);
      nodes.push(input);
      graph.signature = signature;
      context.resume().catch(() => {});
    } catch {
      // Playback falls back to the browser's normal audio output when Web Audio is unavailable.
    }
  };
  const currentProjectSnapshot = (overrides = {}) => ({
    id: activeProjectId,
    name: projectName,
    description: projectDescription,
    duration: projectDuration,
    trackList: trackList.map(track => ({ ...track, effects: track.effects ? { ...track.effects } : undefined })),
    timelineClips: timelineClips.map(clip => ({ ...clip })),
    imported: imported.map(item => ({ ...item })),
    muted: [...muted],
    solo: [...solo],
    trackVolumes: [...trackVolumes],
    fades: Object.fromEntries(Object.entries(fades).map(([id, fade]) => [id, { ...fade }])),
    ...overrides,
  });
  const updateProjectCollection = (updater) => setProjects(current => typeof updater === "function" ? updater(current) : updater);
  const openProject = (id) => {
    const next = projects.find(project => project.id === id);
    if (!next || id === activeProjectId) { setActiveNav("Studio"); return; }
    projectSwitchingRef.current = true;
    updateProjectCollection(current => current.map(project => project.id === activeProjectId ? currentProjectSnapshot() : project));
    setActiveProjectId(next.id);
    setProjectName(next.name);
    setProjectDescription(next.description);
    setProjectDuration(next.duration);
    setTrackList(next.trackList?.map(track => ({ ...track, effects: track.effects ? { ...track.effects } : undefined })) || createDefaultTracks(defaultTrackCount, appLanguage));
    setTimelineClips(next.timelineClips?.map(clip => ({ ...clip })) || []);
    setImported(next.imported?.map(item => ({ ...item })) || []);
    setMuted(next.muted || []); setSolo(next.solo || []); setTrackVolumes(next.trackVolumes || []); setFades(next.fades || {});
    setHistory({ past: [], future: [] }); setSelectedClipId(null); setPlaybackTime(0); setPlaying(false); setActivePreview(null); setActiveNav("Studio");
  };
  const openMixtapeContextMenu = (event, id) => setMixtapeContextMenu({ id, x: event.clientX, y: event.clientY });
  const duplicateMixtape = (id) => {
    const source = id === activeProjectId ? currentProjectSnapshot() : projects.find(project => project.id === id);
    if (!source) return;
    const copyStamp = Date.now();
    const copy = {
      ...source,
      id: `mixtape-${copyStamp}`,
      name: `${source.name} ${appLanguage === "de" ? "Kopie" : "Copy"}`,
      trackList: (source.trackList || []).map(track => ({ ...track, effects: track.effects ? { ...track.effects } : undefined })),
      timelineClips: (source.timelineClips || []).map((clip, index) => ({ ...clip, id: `${clip.id}-copy-${copyStamp}-${index}` })),
      imported: (source.imported || []).map(item => ({ ...item })),
      muted: [...(source.muted || [])], solo: [...(source.solo || [])], trackVolumes: [...(source.trackVolumes || [])],
      fades: Object.fromEntries(Object.entries(source.fades || {}).map(([clipId, fade]) => [`${clipId}-copy-${copyStamp}-${(source.timelineClips || []).findIndex(clip => clip.id === clipId)}`, { ...fade }])),
    };
    updateProjectCollection(current => [...current.map(project => project.id === activeProjectId ? currentProjectSnapshot() : project), copy]);
    setMixtapeContextMenu(null);
    notify(appLanguage === "de" ? "Mixtape dupliziert" : "Mixtape duplicated");
  };
  const requestMixtapeRemoval = (id) => {
    const project = id === activeProjectId ? currentProjectSnapshot() : projects.find(item => item.id === id);
    if (!project) return;
    setMixtapeContextMenu(null);
    setPendingMixtapeRemoval({ id, name: project.name });
  };
  const deleteMixtape = (id) => {
    const withCurrentState = projects.map(project => project.id === activeProjectId ? currentProjectSnapshot() : project);
    let remaining = withCurrentState.filter(project => project.id !== id);
    if (!remaining.length) {
      const fallbackTracks = createDefaultTracks(defaultTrackCount, appLanguage);
      remaining = [{ ...DEFAULT_PROJECT, id: `mixtape-${Date.now()}`, name: appLanguage === "de" ? "Mein Mixtape" : "My Mixtape", trackList: fallbackTracks, timelineClips: [], imported: [], muted: [], solo: [], trackVolumes: Array.from({ length: defaultTrackCount }, () => 75), fades: {} }];
    }
    setProjects(remaining);
    if (id === activeProjectId) {
      const next = remaining[0];
      projectSwitchingRef.current = true;
      setActiveProjectId(next.id); setProjectName(next.name); setProjectDescription(next.description); setProjectDuration(next.duration);
      setTrackList(next.trackList?.map(track => ({ ...track, effects: track.effects ? { ...track.effects } : undefined })) || createDefaultTracks(defaultTrackCount, appLanguage));
      setTimelineClips(next.timelineClips?.map(clip => ({ ...clip })) || []); setImported(next.imported?.map(item => ({ ...item })) || []);
      setMuted(next.muted || []); setSolo(next.solo || []); setTrackVolumes(next.trackVolumes || []); setFades(next.fades || {});
      setHistory({ past: [], future: [] }); setSelectedClipId(null); setPlaybackTime(0); setPlaying(false); setActivePreview(null);
    }
    setPendingMixtapeRemoval(null); setActiveNav("Mixes");
    notify(appLanguage === "de" ? "Mixtape gelöscht" : "Mixtape deleted");
  };
  useEffect(() => {
    if (projectHydratedRef.current) return;
    const initialProject = projects.find(project => project.id === activeProjectId) || projects[0];
    if (!initialProject) return;
    projectHydratedRef.current = true;
    projectSwitchingRef.current = true;
    if (initialProject.id !== activeProjectId) setActiveProjectId(initialProject.id);
    setProjectName(initialProject.name);
    setProjectDescription(initialProject.description);
    setProjectDuration(initialProject.duration);
    setTrackList(initialProject.trackList?.map(track => ({ ...track, effects: track.effects ? { ...track.effects } : undefined })) || createDefaultTracks(defaultTrackCount, appLanguage));
    setTimelineClips(initialProject.timelineClips?.map(clip => ({ ...clip })) || []);
    setImported(initialProject.imported?.map(item => ({ ...item })) || []);
    setMuted(initialProject.muted || []); setSolo(initialProject.solo || []); setTrackVolumes(initialProject.trackVolumes || []); setFades(initialProject.fades || {});
  }, [projects, activeProjectId, appLanguage, defaultTrackCount]);
  useEffect(() => {
    if (!projectHydratedRef.current) return;
    if (projectSwitchingRef.current) { projectSwitchingRef.current = false; return; }
    const nextSnapshot = currentProjectSnapshot();
    updateProjectCollection(current => {
      const index = current.findIndex(project => project.id === activeProjectId);
      if (index === -1) return [...current, nextSnapshot];
      if (JSON.stringify(current[index]) === JSON.stringify(nextSnapshot)) return current;
      return current.map(project => project.id === activeProjectId ? nextSnapshot : project);
    });
  }, [activeProjectId, projectName, projectDescription, projectDuration, trackList, timelineClips, imported, muted, solo, trackVolumes, fades]);
  const openProjectSetup = (mode) => {
    setDraftProjectName(mode === "edit" ? projectName : "Mein neues Mixtape");
    setDraftProjectDescription(mode === "edit" ? projectDescription : "");
    setDraftProjectMinutes(mode === "edit" ? Math.max(1, Math.ceil(projectDuration / 60)) : 6);
    setProjectSetupMode(mode);
  };
  const saveProjectSetup = (event) => {
    event.preventDefault();
    const minutes = Number(draftProjectMinutes);
    const requestedDuration = Math.min(120 * 60, Math.max(30, (Number.isFinite(minutes) && minutes > 0 ? minutes : 6) * 60));
    const furthestClipEnd = timelineClips.reduce((latest, clip) => Math.max(latest, ((clip.start + clip.width) / 100) * projectDuration), 0);
    const nextDuration = projectSetupMode === "create" ? requestedDuration : Math.max(requestedDuration, furthestClipEnd);
    if (projectSetupMode === "create") {
      const nextName = draftProjectName.trim() || "Unbenanntes Mixtape";
      const nextDescription = draftProjectDescription.trim() || "Neues Mixtape";
      const nextId = `mixtape-${Date.now()}`;
      const nextTracks = createDefaultTracks(defaultTrackCount, appLanguage);
      const nextProject = { id: nextId, name: nextName, description: nextDescription, duration: nextDuration, trackList: nextTracks, timelineClips: [], imported: [], muted: [], solo: [], trackVolumes: Array.from({ length: defaultTrackCount }, () => 75), fades: {} };
      projectSwitchingRef.current = true;
      updateProjectCollection(current => [...current.map(project => project.id === activeProjectId ? currentProjectSnapshot() : project), nextProject]);
      setActiveProjectId(nextId);
      setProjectName(nextName);
      setProjectDescription(nextDescription);
      setProjectDuration(nextDuration);
      setTimelineClips([]);
      setTrackList(nextTracks);
      setImported([]);
      setTrackVolumes(Array.from({ length: defaultTrackCount }, () => 75));
      setMuted([]); setSolo([]); setFades({}); setHistory({ past: [], future: [] });
      setPlaybackTime(33); setSelectedClipId(null); setPlaying(false);
      notify("Neues Mixtape angelegt");
    } else {
      const scale = projectDuration / nextDuration;
      setProjectName(draftProjectName.trim() || projectName);
      setProjectDescription(draftProjectDescription.trim() || "Ohne Beschreibung");
      if (Math.abs(nextDuration - projectDuration) > .01) {
        recordHistory();
        setTimelineClips(current => current.map(clip => ({ ...clip, start: clip.start * scale, width: clip.width * scale })));
        setProjectDuration(nextDuration);
        setPlaybackTime(current => Math.min(current, nextDuration));
      }
      notify(nextDuration > requestedDuration ? "Länge wurde bis zum letzten Clip beibehalten" : "Projekteinstellungen gespeichert");
    }
    setProjectSetupMode(null);
    setActiveNav("Studio");
  };
  const visibleRange = 100 / timelineZoom;
  const visibleTimelineSeconds = projectDuration * (visibleRange / 100);
  const beatGridPercent = Math.max(.2, ((60 / bpm) / visibleTimelineSeconds) * 100);
  const playheadPercent = Math.max(0, Math.min(100, ((((playbackTime / projectDuration) * 100) - viewStart) / visibleRange) * 100));
  const audioTimelineClips = timelineClips.filter(clip => clip.audioItemId && !clip.recording && imported.some(item => item.id === clip.audioItemId));
  const timelineAudioEnd = audioTimelineClips.reduce((latest, clip) => Math.max(latest, ((clip.start + clip.width) / 100) * projectDuration), 0);
  const audibleTimelineEnd = audioTimelineClips
    .filter(clip => !muted.includes(clip.track) && (!solo.length || solo.includes(clip.track)))
    .reduce((latest, clip) => Math.max(latest, ((clip.start + clip.width) / 100) * projectDuration), 0);
  const audioMarkerWidth = Math.max(0, Math.min(100, ((((timelineAudioEnd / projectDuration) * 100) - viewStart) / visibleRange) * 100));
  const snapshot = () => ({
    timelineClips: timelineClips.map(clip => ({ ...clip })),
    imported: imported.map(item => ({ ...item })),
    trackList: trackList.map(track => ({ ...track, effects: track.effects ? { ...track.effects } : undefined })),
    muted: [...muted],
    solo: [...solo],
    trackVolumes: [...trackVolumes],
    fades: Object.fromEntries(Object.entries(fades).map(([id, fade]) => [id, { ...fade }])),
    projectDuration,
    playbackTime,
    selectedClipId,
  });
  historySnapshotRef.current = snapshot();
  const recordHistory = () => {
    const currentSnapshot = historySnapshotRef.current;
    if (!currentSnapshot) return;
    setHistory(current => ({ past: [...current.past, currentSnapshot].slice(-50), future: [] }));
  };
  const applySnapshot = (value) => {
    setTimelineClips(value.timelineClips); setImported(value.imported || []); setTrackList(value.trackList); setMuted(value.muted); setSolo(value.solo); setTrackVolumes(value.trackVolumes); setFades(value.fades);
    setProjectDuration(value.projectDuration); setPlaybackTime(value.playbackTime); setSelectedClipId(value.selectedClipId);
  };
  const undo = () => {
    if (!history.past.length) return;
    const previous = history.past.at(-1);
    const currentSnapshot = historySnapshotRef.current;
    setHistory(current => ({ past: current.past.slice(0, -1), future: [currentSnapshot, ...current.future].slice(0, 50) }));
    applySnapshot(previous);
  };
  const redo = () => {
    if (!history.future.length) return;
    const next = history.future[0];
    const currentSnapshot = historySnapshotRef.current;
    setHistory(current => ({ past: [...current.past, currentSnapshot].slice(-50), future: current.future.slice(1) }));
    applySnapshot(next);
  };
  useEffect(() => {
    fetch(WORKSPACE_TEST_AUDIO.url, { method: "HEAD" })
      .then(response => { if (response.ok) setImported(current => current.some(item => item.id === WORKSPACE_TEST_AUDIO.id) ? current.map(item => item.id === WORKSPACE_TEST_AUDIO.id ? { ...item, name: WORKSPACE_TEST_AUDIO.name } : item) : [WORKSPACE_TEST_AUDIO, ...current]); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/audio/samples/manifest.json")
      .then(response => response.ok ? response.json() : [])
      .then(samples => setLibrarySamples(samples))
      .catch(() => setLibrarySamples([]));
  }, []);
  useEffect(() => {
    window.localStorage.setItem("flowtape-imported-sounds", JSON.stringify(importedSounds.map(({ url, ...sample }) => sample)));
  }, [importedSounds]);
  useEffect(() => {
    if (!isDesktopApp()) return;
    const restoreStoredUrl = item => item.storedPath ? { ...item, url: storedAudioUrl(item.storedPath) } : item;
    setImportedSounds(current => current.map(restoreStoredUrl));
    setProjects(current => current.map(project => ({ ...project, imported: (project.imported || []).map(restoreStoredUrl) })));
    setImported(current => current.map(restoreStoredUrl));
  }, []);
  useEffect(() => {
    window.localStorage.setItem("flowtape-favorite-samples", JSON.stringify(favoriteSampleIds));
  }, [favoriteSampleIds]);
  const toggleSampleFavorite = (id) => setFavoriteSampleIds(current => current.includes(id) ? current.filter(sampleId => sampleId !== id) : [...current, id]);
  useEffect(() => {
    imported.filter(item => !item.durationSeconds && item.url).forEach(item => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => setImported(current => current.map(entry => entry.id === item.id ? { ...entry, duration: formatDuration(audio.duration), durationSeconds: audio.duration } : entry));
      audio.src = item.url;
      audio.load();
    });
  }, [imported]);
  const submitPrompt = (value = prompt) => {
    if (!value.trim()) return;
    const reply = executeAssistantCommand(value);
    setMessages(m => [...m, { role: "user", text: value }, { role: "ai", text: reply }]);
    setPrompt("");
  };
  const startVoiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { notify("Spracherkennung wird von diesem Browser nicht unterstützt"); return; }
    if (listening) { recognitionRef.current?.stop(); return; }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.continuous = false;
    let submitted = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript?.trim();
      if (result?.isFinal && transcript && !submitted) {
        submitted = true;
        setPrompt(transcript);
        submitPrompt(transcript);
      }
    };
    recognition.onerror = () => { setListening(false); notify("Spracheingabe konnte nicht gestartet werden"); };
    recognition.onend = () => setListening(false);
    recognition.start();
  };
  const importFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith("audio/"));
    const tracks = (await Promise.all(files.map(async file => {
      try {
        const stored = await persistAudioFile(file, "library");
        return { id: `${file.name}-${file.lastModified}-${Date.now()}`, name: file.name.replace(/\.[^/.]+$/, ""), fileName: file.name, ...stored, duration: "Bereit zum Anhören" };
      } catch {
        notify(`„${file.name}“ konnte nicht in Flowtape gespeichert werden`);
        return null;
      }
    }))).filter(Boolean);
    setImported(prev => [...prev, ...tracks]);
    if (files.length) notify(`${files.length} Audio-Datei${files.length > 1 ? "en" : ""} hinzugefügt`);
    if (event.target) event.target.value = "";
  };
  const importSoundFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith("audio/"));
    const sounds = (await Promise.all(files.map(async (file, index) => {
      try {
        const stored = await persistAudioFile(file, "sounds");
        const item = { id: `user-sound-${Date.now()}-${index}`, name: file.name.replace(/\.[^/.]+$/, ""), path: stored.url, storedPath: stored.storedPath, format: file.name.split(".").pop()?.toUpperCase() || "AUDIO", duration: 0, category: "Imported", artist: "", genre: "" };
        try { item.duration = await resolveAudioDuration({ ...item, url: item.path }); } catch { /* The item is still available; duration will resolve on preview. */ }
        return item;
      } catch {
        notify(`„${file.name}“ konnte nicht in Flowtape gespeichert werden`);
        return null;
      }
    }))).filter(Boolean);
    setImportedSounds(current => [...sounds, ...current]);
    if (sounds.length) notify(`${sounds.length} Sound${sounds.length > 1 ? "s" : ""} importiert`);
    if (event.target) event.target.value = "";
  };
  useEffect(() => {
    if (!playing) return undefined;
    if (!audibleTimelineEnd) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setPlaybackTime(time => {
        const next = time + .05;
        if (next >= audibleTimelineEnd) {
          if (loopActive) return 0;
          setPlaying(false);
          return audibleTimelineEnd;
        }
        if (next < projectDuration) return next;
        if (loopActive) return 0;
        setPlaying(false);
        return projectDuration;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, projectDuration, loopActive, audibleTimelineEnd]);
  useEffect(() => { playbackTimeRef.current = playbackTime; }, [playbackTime]);
  useEffect(() => {
    if (!playing || !metronomeEnabled) return undefined;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return undefined;
    const context = metronomeContextRef.current || new Context();
    metronomeContextRef.current = context;
    context.resume().catch(() => {});
    metronomeBeatRef.current = null;
    let timer;
    const click = (accent) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = accent ? 1260 : 880;
      gain.gain.setValueAtTime((accent ? .075 : .048) * (metronomeVolume / 100), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .045);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + .05);
    };
    const scheduleBeat = () => {
      const beatLength = 60 / bpm;
      const currentTime = playbackTimeRef.current;
      const beat = Math.floor(currentTime / beatLength + .0001);
      if (metronomeBeatRef.current !== beat) {
        metronomeBeatRef.current = beat;
        click(beat % 4 === 0);
      }
      const untilNextBeat = Math.max(20, ((beat + 1) * beatLength - currentTime) * 1000);
      timer = window.setTimeout(scheduleBeat, Math.min(80, untilNextBeat));
    };
    scheduleBeat();
    return () => window.clearTimeout(timer);
  }, [playing, metronomeEnabled, bpm, metronomeVolume]);
  const formatTime = (seconds) => {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };
  const togglePreview = (item) => {
    if (activePreview === item.id && previewAudio.current) {
      previewAudio.current.pause();
      setActivePreview(null);
      setPlaying(false);
      return;
    }
    if (previewAudio.current) previewAudio.current.pause();
    const audio = previewId.current === item.id ? previewAudio.current : new Audio(item.url);
    previewAudio.current = audio;
    previewId.current = item.id;
    audio.loop = loopActive;
    audio.onloadedmetadata = () => {
      setImported(current => current.map(entry => entry.id === item.id ? { ...entry, duration: formatTime(audio.duration), durationSeconds: audio.duration } : entry));
      setTimelineClips(current => current.map(clip => clip.id === `imported-${item.id}` ? { ...clip, width: Math.min(100 - clip.start, Math.max(2, (audio.duration / projectDuration) * 100)) } : clip));
    };
    audio.onended = () => { setActivePreview(null); setPlaying(false); };
    audio.play().then(() => setActivePreview(item.id)).catch(() => { setPlaying(false); notify("Diese Datei kann nicht wiedergegeben werden"); });
  };
  const addToTimeline = async (item) => {
    const existing = timelineClips.find(clip => clip.id === `imported-${item.id}`);
    if (existing) { setSelectedClipId(existing.id); notify(`${item.name} liegt bereits auf einer eigenen Spur`); return; }
    notify(`Ermittle die Länge von „${item.name}“ …`);
    let duration;
    try {
      duration = await resolveAudioDuration(item);
    } catch {
      notify(`Die Länge von „${item.name}“ konnte nicht gelesen werden`);
      return;
    }
    setImported(current => current.map(entry => entry.id === item.id ? { ...entry, duration: formatDuration(duration), durationSeconds: duration } : entry));
    recordHistory();
    const trackIndex = trackList.length;
    const isFirstClip = timelineClips.length === 0;
    const startSeconds = isFirstClip ? 0 : playbackTime;
    const timelineDuration = fitProjectToClip(startSeconds, duration);
    setTrackList(current => [...current, { name: item.name, detail: "Importierte MP3", color: "#9bdc84" }]);
    const newClip = { id: `imported-${item.id}`, audioItemId: item.id, track: trackIndex, start: (startSeconds / timelineDuration) * 100, width: Math.max(.5, (duration / timelineDuration) * 100), label: item.name, color: "lime", waveform: "full", sourceOffset: 0 };
    setTimelineClips(current => [...current, newClip]);
    setSelectedClipId(newClip.id);
    notify(`${item.name} hat jetzt eine eigene Spur`);
  };
  const findOpenClipStart = (rawStart, width, trackIndex, ignoredClipId, clips = timelineClips) => {
    const otherClips = clips.filter(clip => clip.id !== ignoredClipId && clip.track === trackIndex).sort((a, b) => a.start - b.start);
    const availableRanges = [];
    let cursor = 0;
    otherClips.forEach(clip => {
      const rangeEnd = clip.start - width;
      if (rangeEnd >= cursor) availableRanges.push([cursor, rangeEnd]);
      cursor = Math.max(cursor, clip.start + clip.width);
    });
    if (cursor <= 100 - width) availableRanges.push([cursor, 100 - width]);
    if (!availableRanges.length) return null;
    const edges = [...otherClips.flatMap(clip => [clip.start - width, clip.start + clip.width]), ...Array.from({ length: 9 }, (_, index) => index * 12.5)];
    const nearest = edges.reduce((closest, point) => Math.abs(point - rawStart) < Math.abs(closest - rawStart) ? point : closest, rawStart);
    const snapped = Math.abs(nearest - rawStart) < 1.8 ? Math.max(0, Math.min(100 - width, nearest)) : rawStart;
    return availableRanges.map(([from, to]) => Math.max(from, Math.min(to, snapped))).reduce((closest, point) => Math.abs(point - snapped) < Math.abs(closest - snapped) ? point : closest);
  };
  const updateLibraryDropPreview = (itemId, trackIndex, clientX, lane) => {
    const item = imported.find(entry => entry.id === itemId);
    if (!item || !lane || !Number.isInteger(trackIndex)) { setLibraryDropPreview(null); return; }
    const rect = lane.getBoundingClientRect();
    const pointerPercent = viewStart + Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * visibleRange;
    const duration = Math.max(1, Number(item.durationSeconds) || 8);
    const width = Math.max(.5, Math.min(100, (duration / projectDuration) * 100));
    const rawStart = Math.max(0, Math.min(100 - width, pointerPercent));
    const start = findOpenClipStart(rawStart, width, trackIndex);
    setLibraryDropPreview(start === null ? null : { trackIndex, start, width, label: item.name });
  };
  const placeLibraryItemOnTrack = async ({ itemId, trackIndex, clientX, lane }) => {
    const item = imported.find(entry => entry.id === itemId);
    if (!item) return;
    let duration;
    try {
      duration = await resolveAudioDuration(item);
    } catch {
      notify(`Die Länge von „${item.name}“ konnte nicht gelesen werden`);
      return;
    }
    const rect = lane.getBoundingClientRect();
    const pointerPercent = viewStart + Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * visibleRange;
    const startSeconds = (pointerPercent / 100) * projectDuration;
    const timelineDuration = fitProjectToClip(startSeconds, duration);
    const width = Math.max(.5, (duration / timelineDuration) * 100);
    const rawStart = Math.max(0, Math.min(100 - width, (startSeconds / timelineDuration) * 100));
    const scale = projectDuration / timelineDuration;
    const placedClips = Math.abs(scale - 1) > .0001 ? timelineClips.map(clip => ({ ...clip, start: clip.start * scale, width: clip.width * scale })) : timelineClips;
    const start = findOpenClipStart(rawStart, width, trackIndex, undefined, placedClips);
    if (start === null) { notify("Auf dieser Spur ist nicht genug Platz für den Clip"); return; }
    recordHistory();
    setImported(current => current.map(entry => entry.id === item.id ? { ...entry, duration: formatDuration(duration), durationSeconds: duration } : entry));
    const clip = { id: `clip-${item.id}-${Date.now()}`, audioItemId: item.id, track: trackIndex, start, width, label: item.name, color: "lime", waveform: "full", sourceOffset: 0 };
    setTimelineClips(current => [...current, clip]);
    setSelectedClipId(clip.id);
    notify(`${item.name} wurde auf ${trackList[trackIndex].name} platziert`);
  };
  const dropLibraryItemOnTrack = (event, trackIndex) => {
    event.preventDefault();
    const itemId = draggedLibraryItemRef.current || event.dataTransfer.getData("application/x-flowtape-audio") || event.dataTransfer.getData("text/plain") || draggedLibraryItemId;
    const lane = event.currentTarget;
    draggedLibraryItemRef.current = null;
    setLibraryDropTrack(null); setLibraryDropPreview(null); setDraggedLibraryItemId(null);
    void placeLibraryItemOnTrack({ itemId, trackIndex, clientX: event.clientX, lane });
  };
  const startLibraryPointerDrag = (event, item) => {
    if (event.button !== 0) return;
    const drag = { itemId: item.id, startX: event.clientX, startY: event.clientY, moved: false };
    libraryPointerDragRef.current = drag;
    draggedLibraryItemRef.current = item.id;
    setDraggedLibraryItemId(item.id);
    const getLaneAtPointer = pointerEvent => document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest(".track-lane");
    const update = pointerEvent => {
      if (!libraryPointerDragRef.current) return;
      if (!drag.moved && Math.hypot(pointerEvent.clientX - drag.startX, pointerEvent.clientY - drag.startY) < 6) return;
      drag.moved = true;
      const lane = getLaneAtPointer(pointerEvent);
      const trackIndex = Number(lane?.dataset.trackIndex);
      setLibraryDropTrack(Number.isInteger(trackIndex) ? trackIndex : null);
      updateLibraryDropPreview(drag.itemId, trackIndex, pointerEvent.clientX, lane);
    };
    const finish = pointerEvent => {
      update(pointerEvent);
      const lane = getLaneAtPointer(pointerEvent);
      const trackIndex = Number(lane?.dataset.trackIndex);
      if (drag.moved && lane && Number.isInteger(trackIndex)) void placeLibraryItemOnTrack({ itemId: drag.itemId, trackIndex, clientX: pointerEvent.clientX, lane });
      libraryPointerDragRef.current = null;
      draggedLibraryItemRef.current = null;
      setDraggedLibraryItemId(null);
      setLibraryDropTrack(null);
      setLibraryDropPreview(null);
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
    window.addEventListener("pointermove", update);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };
  const addLibrarySampleToMix = async (sample) => {
    const item = { id: `library-${sample.id}`, name: sample.name, url: sample.path, duration: sample.duration ? formatTime(sample.duration) : "Bereit zum Anhören", durationSeconds: sample.duration || 0, category: sample.category };
    const existing = timelineClips.find(clip => clip.audioItemId === item.id);
    if (existing) { setSelectedClipId(existing.id); setActiveNav("Studio"); notify(`${sample.name} liegt bereits im Mix`); return; }
    notify(`Ermittle die Länge von „${sample.name}“ …`);
    let duration;
    try {
      duration = await resolveAudioDuration(item);
    } catch {
      notify(`Die Länge von „${sample.name}“ konnte nicht gelesen werden`);
      return;
    }
    recordHistory();
    const trackIndex = trackList.length;
    const startSeconds = playbackTime;
    const timelineDuration = fitProjectToClip(startSeconds, duration);
    const clip = { id: `imported-${item.id}`, audioItemId: item.id, track: trackIndex, start: (startSeconds / timelineDuration) * 100, width: Math.max(.5, (duration / timelineDuration) * 100), label: item.name, color: "lime", waveform: "full", sourceOffset: 0 };
    setImported(current => current.some(entry => entry.id === item.id) ? current.map(entry => entry.id === item.id ? { ...entry, duration: formatDuration(duration), durationSeconds: duration } : entry) : [...current, { ...item, duration: formatDuration(duration), durationSeconds: duration }]);
    setTrackList(current => [...current, { name: sample.name, detail: sample.category, color: "#9bdc84" }]);
    setTrackVolumes(current => [...current, 75]);
    setTimelineClips(current => [...current, clip]);
    setSelectedClipId(clip.id);
    setActiveNav("Studio");
    notify(`${sample.name} wurde zum Mix hinzugefügt`);
  };
  const toggleTransport = () => {
    if (playing) {
      previewAudio.current?.pause();
      setActivePreview(null);
      setPlaying(false);
      return;
    }
    if (!audibleTimelineEnd) {
      notify("Lege zuerst einen hörbaren Clip auf die Timeline");
      return;
    }
    if (playbackTime >= audibleTimelineEnd) setPlaybackTime(0);
    if (previewAudio.current) previewAudio.current.pause();
    setActivePreview(null);
    setPlaying(true);
  };
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target.tagName;
      if (event.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "BUTTON") {
        event.preventDefault();
        toggleTransport();
      }
      if ((event.key === "+" || event.key === "=" || event.code === "NumpadAdd" || event.key === "-" || event.code === "NumpadSubtract") && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "BUTTON" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        changeZoom(event.key === "-" || event.code === "NumpadSubtract" ? -.5 : .5);
      }
      if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "BUTTON") {
        event.preventDefault();
        const step = event.shiftKey ? 5 : .25;
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setPlaybackTime(current => Math.max(0, Math.min(projectDuration, current + direction * step)));
      }
      if (event.key.toLowerCase() === "s" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "BUTTON" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setPlaybackTime(0);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && tag !== "INPUT" && tag !== "TEXTAREA") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      if (event.metaKey && event.key.toLowerCase() === "b" && tag !== "INPUT" && tag !== "TEXTAREA") {
        event.preventDefault();
        const clip = selectedClipId ? timelineClips.find(item => item.id === selectedClipId) : timelineClips.find(item => {
          const start = (item.start / 100) * projectDuration;
          const end = ((item.start + item.width) / 100) * projectDuration;
          return playbackTime > start && playbackTime < end;
        });
        if (!clip) { notify("Setze den Abspielkopf innerhalb eines Clips, um ihn zu teilen"); return; }
        splitClipAtTime(clip.id, playbackTime);
      }
      if ((event.key === "Backspace" || event.key === "Delete") && tag !== "INPUT" && tag !== "TEXTAREA" && selectedClipId) {
        event.preventDefault();
        removeClip(selectedClipId);
        notify("Clip gelöscht");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  const addEmptyTrack = () => {
    recordHistory();
    const number = trackList.length + 1;
    setTrackList(current => [...current, { name: trackNameForLanguage(number, appLanguage), detail: emptyTrackDetailForLanguage(appLanguage), color: "#b5b5b5" }]);
    setTrackVolumes(current => [...current, 75]);
    setTrackMenuOpen(false);
    notify(`Leere Spur ${String(number).padStart(2, "0")} hinzugefügt`);
  };
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify("Audioaufnahme wird von diesem Browser nicht unterstützt");
      return;
    }
    setTrackMenuOpen(false);
    const recordingName = appLanguage === "en" ? "Audio Track" : "Sprachaufnahme";
    const recordingDetail = appLanguage === "en" ? "Audio · Recording" : "Audio · Aufnahme läuft";
    const completedDetail = appLanguage === "en" ? "Audio recording" : "Audioaufnahme";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const id = `recording-${Date.now()}`;
      const startSeconds = playbackTime;
      const trackIndex = trackList.length;
      const startedAt = Date.now();
      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recordHistory();
      setTrackList(current => [...current, { name: recordingName, detail: recordingDetail, color: "#ff8e90" }]);
      setTrackVolumes(current => [...current, 75]);
      setTimelineClips(current => [...current, { id, track: trackIndex, start: (startSeconds / projectDuration) * 100, width: .5, label: recordingName, color: "warm", waveform: "voice", sourceOffset: 0, recording: true }]);
      setSelectedClipId(id);
      setRecording({ id, trackIndex, startSeconds, startedAt });
      setRecordingElapsed(0);
      recorder.ondataavailable = event => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const duration = Math.max(.5, (Date.now() - startedAt) / 1000);
        const timelineDuration = fitProjectToClip(startSeconds, duration);
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        let stored = { storedPath: "", url: URL.createObjectURL(blob) };
        try { stored = await persistAudioFile(new File([blob], `${recordingName}.webm`, { type: blob.type }), "library"); } catch { notify("Aufnahme konnte nicht dauerhaft gespeichert werden"); }
        const item = { id, name: recordingName, ...stored, duration: formatDuration(duration), durationSeconds: duration, format: "AUDIO" };
        setImported(current => [...current, item]);
        setTimelineClips(current => current.map(clip => clip.id === id ? { ...clip, audioItemId: id, start: (startSeconds / timelineDuration) * 100, width: Math.max(.5, (duration / timelineDuration) * 100), label: recordingName, recording: false } : clip));
        setTrackList(current => current.map((track, index) => index === trackIndex ? { ...track, detail: completedDetail } : track));
        stream.getTracks().forEach(track => track.stop());
        setRecording(null); setRecordingElapsed(0); mediaRecorderRef.current = null;
        notify("Sprachaufnahme wurde zur Spur hinzugefügt");
      };
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); setRecording(null); notify("Aufnahme konnte nicht gespeichert werden"); };
      recorder.start();
      notify("Aufnahme läuft – sprich einfach los");
    } catch {
      notify("Mikrofonfreigabe wurde nicht erteilt");
    }
  };
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  };
  const beginTrackRename = (event, index) => {
    event.stopPropagation();
    setTrackNameDraft(trackList[index].name);
    setEditingTrack(index);
  };
  const commitTrackRename = () => {
    if (editingTrack === null) return;
    const nextName = trackNameDraft.trim();
    if (nextName) setTrackList(current => current.map((track, index) => index === editingTrack ? { ...track, name: nextName } : track));
    setEditingTrack(null);
  };
  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - recording.startedAt) / 1000;
      setRecordingElapsed(elapsed);
      setTimelineClips(current => current.map(clip => clip.id === recording.id ? { ...clip, width: Math.min(100 - clip.start, Math.max(.5, (elapsed / projectDuration) * 100)) } : clip));
    }, 150);
    return () => window.clearInterval(timer);
  }, [recording, projectDuration]);
  const changeZoom = (amount) => {
    const next = Math.max(1, Math.min(24, Number((timelineZoom + amount).toFixed(1))));
    setTimelineZoom(next);
    setViewStart(current => Math.min(current, 100 - (100 / next)));
  };
  const beginPlaybackTimeEdit = () => {
    setPlaybackTimeDraft(formatTime(playbackTime));
    setEditingPlaybackTime(true);
  };
  const commitPlaybackTimeEdit = () => {
    const value = playbackTimeDraft.trim();
    const clock = value.match(/^(\d{1,3})\s*:\s*(\d{1,2})$/);
    const seconds = clock ? Number(clock[1]) * 60 + Number(clock[2]) : Number(value.replace(",", "."));
    if (Number.isFinite(seconds) && seconds >= 0) setPlaybackTime(Math.min(projectDuration, seconds));
    else notify("Gib eine Zeit wie 1:20 oder 80 ein");
    setEditingPlaybackTime(false);
  };
  const startTrackDrag = (event, index) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setTrackDrag({ from: index, target: index, startY: event.clientY });
  };
  const moveTrackDrag = (event) => {
    if (!trackDrag) return;
    const offset = Math.round((event.clientY - trackDrag.startY) / 82);
    const target = Math.max(0, Math.min(trackList.length - 1, trackDrag.from + offset));
    if (target !== trackDrag.target) setTrackDrag(current => current ? { ...current, target } : null);
  };
  const reorderTracks = (from, to) => {
    if (from === to) return;
    recordHistory();
    const oldOrder = trackList.map((_, index) => index);
    const [moved] = oldOrder.splice(from, 1);
    oldOrder.splice(to, 0, moved);
    setTrackList(current => oldOrder.map(index => current[index]));
    setTimelineClips(current => current.map(clip => ({ ...clip, track: oldOrder.indexOf(clip.track) })));
    setTrackVolumes(current => oldOrder.map(index => current[index]));
    setMuted(current => current.map(index => oldOrder.indexOf(index)));
    setSolo(current => current.map(index => oldOrder.indexOf(index)));
    notify("Spurreihenfolge aktualisiert");
  };
  const endTrackDrag = (event) => {
    if (!trackDrag) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    reorderTracks(trackDrag.from, trackDrag.target);
    setTrackDrag(null);
  };
  const openTrackContextMenu = (event, index) => {
    event.preventDefault();
    setTrackContextMenu({ index, x: event.clientX, y: event.clientY });
  };
  const deleteTrack = (index) => {
    if (trackList.length === 1) { notify("Mindestens eine Spur bleibt erhalten"); setTrackContextMenu(null); return; }
    recordHistory();
    setTrackList(current => current.filter((_, trackIndex) => trackIndex !== index));
    setTrackVolumes(current => current.filter((_, trackIndex) => trackIndex !== index));
    setMuted(current => current.filter(trackIndex => trackIndex !== index).map(trackIndex => trackIndex > index ? trackIndex - 1 : trackIndex));
    setSolo(current => current.filter(trackIndex => trackIndex !== index).map(trackIndex => trackIndex > index ? trackIndex - 1 : trackIndex));
    setTimelineClips(current => current.filter(clip => clip.track !== index).map(clip => clip.track > index ? { ...clip, track: clip.track - 1 } : clip));
    setTrackContextMenu(null);
    notify("Spur gelöscht");
  };
  const duplicateTrack = (index) => {
    recordHistory();
    const source = trackList[index];
    setTrackList(current => [...current.slice(0, index + 1), { ...source, name: `${source.name} Kopie` }, ...current.slice(index + 1)]);
    setTrackVolumes(current => [...current.slice(0, index + 1), current[index], ...current.slice(index + 1)]);
    setTimelineClips(current => current.flatMap(clip => {
      if (clip.track < index) return [clip];
      if (clip.track > index) return [{ ...clip, track: clip.track + 1 }];
      return [clip, { ...clip, id: `${clip.id}-copy-${Date.now()}`, track: index + 1, label: `${clip.label} Kopie` }];
    }));
    setTrackContextMenu(null);
    notify("Spur dupliziert");
  };
  const restartTransport = () => {
    setPlaybackTime(0);
    if (previewAudio.current) previewAudio.current.currentTime = 0;
    notify("Abspielkopf zurück auf 0:00");
  };
  const toggleLoop = () => {
    const next = !loopActive;
    setLoopActive(next);
    if (previewAudio.current) previewAudio.current.loop = next;
    notify(next ? "Loop ist aktiv" : "Loop ist aus");
  };
  const seekToPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setPlaybackTime(projectDuration * ((viewStart + progress * visibleRange) / 100));
  };
  const seekInLane = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setPlaybackTime(projectDuration * ((viewStart + progress * visibleRange) / 100));
  };
  const startSeeking = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setSeeking(true);
    seekToPointer(event);
  };
  const moveSeeking = (event) => { if (seeking) seekToPointer(event); };
  const endSeeking = (event) => {
    if (!seeking) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setSeeking(false);
  };
  const seekFromPlayheadPointer = (event) => {
    const lane = event.currentTarget.parentElement.querySelector(".track-lane");
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setPlaybackTime(projectDuration * ((viewStart + progress * visibleRange) / 100));
  };
  const startPlayheadDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    playheadPointerDragRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekFromPlayheadPointer(event);
  };
  const movePlayheadDrag = (event) => {
    if (playheadPointerDragRef.current) seekFromPlayheadPointer(event);
  };
  const endPlayheadDrag = (event) => {
    if (!playheadPointerDragRef.current) return;
    playheadPointerDragRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  useEffect(() => {
    const pauseAllTimelineAudio = () => {
      timelineAudioPlayers.current.forEach(({ audio }) => audio.pause());
    };
    if (!playing) {
      pauseAllTimelineAudio();
      return undefined;
    }
    const activeClips = timelineClips.flatMap(clip => {
      const clipStart = (clip.start / 100) * projectDuration;
      const clipEnd = clipStart + ((clip.width / 100) * projectDuration);
      const item = imported.find(entry => entry.id === clip.audioItemId);
      const audible = item && !clip.recording && !muted.includes(clip.track) && (!solo.length || solo.includes(clip.track));
      return audible && playbackTime >= clipStart && playbackTime < clipEnd ? [{ clip, item, clipStart, clipEnd }] : [];
    });
    const activeIds = new Set(activeClips.map(({ clip }) => clip.id));
    timelineAudioPlayers.current.forEach((player, clipId) => {
      if (!activeIds.has(clipId)) player.audio.pause();
    });
    activeClips.forEach(({ clip, item, clipStart, clipEnd }) => {
      let player = timelineAudioPlayers.current.get(clip.id);
      if (!player || player.itemId !== item.id) {
        player?.audio.pause();
        const audio = new Audio(item.url);
        player = { audio, itemId: item.id, pending: false, failed: false, lastTimelineTime: null };
        timelineAudioPlayers.current.set(clip.id, player);
      }
      const { audio } = player;
      const effects = trackList[clip.track]?.effects || {};
      const mickey = Number(effects.mickey) || 0;
      const horror = Number(effects.filter) || 0;
      const playbackRate = mickey > 0 ? 1 + (mickey / 100) * .75 : 1 - (horror / 100) * .6;
      const clipPosition = playbackTime - clipStart;
      const clipDuration = clipEnd - clipStart;
      const fade = fades[clip.id] || {};
      const fadeInDuration = clipDuration * ((fade.in || 0) / 100);
      const fadeOutDuration = clipDuration * ((fade.out || 0) / 100);
      let volume = 1;
      if (fadeInDuration && clipPosition < fadeInDuration) volume = clipPosition / fadeInDuration;
      if (fadeOutDuration && clipPosition > clipDuration - fadeOutDuration) volume = Math.min(volume, (clipDuration - clipPosition) / fadeOutDuration);
      routeTrackAudioEffects(audio, effects);
      audio.playbackRate = playbackRate;
      audio.preservesPitch = mickey === 0 && horror === 0;
      audio.webkitPreservesPitch = mickey === 0 && horror === 0;
      audio.loop = false;
      audio.volume = Math.max(0, Math.min(1, volume * ((trackVolumes[clip.track] ?? 75) / 100)));
      const expectedTime = (clip.sourceOffset || 0) + clipPosition * playbackRate;
      const timelineJumped = player.lastTimelineTime === null || Math.abs(playbackTime - player.lastTimelineTime) > .15;
      if (timelineJumped && Number.isFinite(expectedTime)) audio.currentTime = expectedTime;
      player.lastTimelineTime = playbackTime;
      if (audio.paused && !player.pending && !player.failed) {
        player.pending = true;
        audio.play().catch(() => {
          player.failed = true;
          notify(`„${item.name}“ kann nicht wiedergegeben werden`);
        }).finally(() => { player.pending = false; });
      }
    });
    return undefined;
  }, [playing, playbackTime, imported, timelineClips, projectDuration, fades, trackVolumes, muted, solo, trackList]);
  useEffect(() => () => {
    timelineAudioPlayers.current.forEach(({ audio }) => { audio.pause(); audio.src = ""; });
    timelineAudioPlayers.current.clear();
  }, []);
  const setFade = (id, edge, value) => { recordHistory(); setFades(current => ({ ...current, [id]: { ...current[id], [edge]: Number(value) } })); };
  const openContextMenu = (event, clip) => {
    event.preventDefault();
    setSelectedClipId(clip.id);
    setContextMenu({ clipId: clip.id, x: event.clientX, y: event.clientY });
  };
  const removeClip = (id) => {
    recordHistory();
    setTimelineClips(current => current.filter(clip => clip.id !== id));
    setFades(current => { const next = { ...current }; delete next[id]; return next; });
    setSelectedClipId(null);
    setContextMenu(null);
  };
  const removeImportedItem = (id, confirmed = false) => {
    const item = imported.find(entry => entry.id === id);
    if (!item) return;
    const matchingClipIds = timelineClips.filter(clip => clip.audioItemId === id).map(clip => clip.id);
    const referencedProjectNames = [...new Set([
      ...(matchingClipIds.length ? [projectName] : []),
      ...projects.filter(project => project.id !== activeProjectId && project.timelineClips?.some(clip => clip.audioItemId === id)).map(project => project.name),
    ])];
    if (referencedProjectNames.length && !confirmed) { setPendingImportRemoval({ id, name: item.name, projects: referencedProjectNames }); return; }
    recordHistory();
    if (previewAudio.current && previewId.current === id) {
      previewAudio.current.pause();
      previewAudio.current = null;
      previewId.current = null;
      setActivePreview(null);
    }
    matchingClipIds.forEach(clipId => {
      const player = timelineAudioPlayers.current.get(clipId);
      if (player) {
        player.audio.pause();
        player.audio.src = "";
        timelineAudioPlayers.current.delete(clipId);
      }
    });
    setTimelineClips(current => current.filter(clip => clip.audioItemId !== id));
    setFades(current => {
      const next = { ...current };
      matchingClipIds.forEach(clipId => delete next[clipId]);
      return next;
    });
    setImported(current => current.filter(entry => entry.id !== id));
    setSelectedClipId(current => matchingClipIds.includes(current) ? null : current);
    notify(`${item.name} wurde aus diesem Mix entfernt`);
  };
  const copyClip = (id, cut = false) => {
    const clip = timelineClips.find(item => item.id === id);
    if (!clip) return;
    setClipboardClip({ ...clip, id: `copy-${Date.now()}` });
    if (cut) removeClip(id); else setContextMenu(null);
    notify(cut ? "Clip ausgeschnitten" : "Clip kopiert");
  };
  const splitClipAtTime = (id, time) => {
    const clip = timelineClips.find(item => item.id === id);
    const splitPoint = (time / projectDuration) * 100;
    const minSplitWidth = (0.05 / projectDuration) * 100;
    if (!clip || splitPoint <= clip.start + minSplitWidth || splitPoint >= clip.start + clip.width - minSplitWidth) { notify("Setze den Abspielkopf innerhalb des Clips, um ihn zu teilen"); setContextMenu(null); return; }
    recordHistory();
    const leftWidth = splitPoint - clip.start;
    const rightWidth = clip.width - leftWidth;
    const secondsBeforeSplit = (leftWidth / 100) * projectDuration;
    const left = { ...clip, id: `${clip.id}-a`, width: leftWidth, label: `${clip.label} · 1` };
    const right = { ...clip, id: `${clip.id}-b`, start: splitPoint, width: rightWidth, label: `${clip.label} · 2`, sourceOffset: (clip.sourceOffset || 0) + secondsBeforeSplit };
    setTimelineClips(current => current.flatMap(item => item.id === id ? [left, right] : item));
    setFades(current => ({ ...current, [left.id]: { in: current[id]?.in || 0, out: 0 }, [right.id]: { in: 0, out: current[id]?.out || 0 } }));
    setSelectedClipId(right.id);
    setContextMenu(null);
    notify("Clip an der Abspielposition geteilt");
  };
  const splitClipAtPlayhead = (id) => splitClipAtTime(id, playbackTime);
  const parseCommandTime = (text) => {
    const clock = text.match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
    if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
    const spoken = text.match(/(\d+)\s*(?:minute|minuten|min)\s*(?:und\s*)?(\d+)?\s*(?:sekunde|sekunden|sek)?/i);
    if (spoken) return Number(spoken[1]) * 60 + Number(spoken[2] || 0);
    const seconds = text.match(/(?:bei|an)\s*(\d+)\s*(?:sekunde|sekunden|sek)/i);
    if (seconds) return Number(seconds[1]);
    const bareSeconds = text.match(/(?:bei|an)\s*(\d+)(?:\s|$)/i);
    return bareSeconds ? Number(bareSeconds[1]) : null;
  };
  const executeAssistantCommand = (rawText) => {
    const text = rawText.toLowerCase();
    const commandTime = parseCommandTime(text);
    if (/(schneid|teile|split)/.test(text)) {
      if (commandTime === null) return "Nenne mir bitte eine Zeit, zum Beispiel: Schneide bei 1:20.";
      const clip = timelineClips.find(item => {
        const start = (item.start / 100) * projectDuration;
        const end = ((item.start + item.width) / 100) * projectDuration;
        return commandTime > start && commandTime < end;
      });
      if (!clip) return `Bei ${formatTime(commandTime)} liegt kein Clip. Ziehe den Clip erst an diese Stelle oder nenne eine Zeit innerhalb eines Clips.`;
      setPlaybackTime(commandTime);
      splitClipAtTime(clip.id, commandTime);
      return `Erledigt: „${clip.label}“ wurde bei ${formatTime(commandTime)} geteilt.`;
    }
    if (/(fade.?out|ausblend|ausfaden)/.test(text) || /(fade.?in|einblend|einfaden)/.test(text)) {
      const clip = selectedClipId ? timelineClips.find(item => item.id === selectedClipId) : timelineClips.find(item => {
        const start = (item.start / 100) * projectDuration;
        const end = ((item.start + item.width) / 100) * projectDuration;
        return playbackTime >= start && playbackTime <= end;
      });
      if (!clip) return "Wähle zuerst einen Clip aus oder setze den Abspielkopf auf einen Clip.";
      const duration = (clip.width / 100) * projectDuration;
      const secondMatch = text.match(/(\d+)\s*(?:sekunde|sekunden|sek)/i);
      const percent = Math.min(40, Math.max(1, ((Number(secondMatch?.[1] || 3) / duration) * 100)));
      const edge = /(fade.?out|ausblend|ausfaden)/.test(text) ? "out" : "in";
      setFade(clip.id, edge, percent);
      return `Erledigt: ${edge === "out" ? "Fade-out" : "Fade-in"} für „${clip.label}“ wurde auf ${Math.round(Number(secondMatch?.[1] || 3))} Sekunden gesetzt.`;
    }
    return "Das kann ich schon verstehen: „Schneide bei 1:20“, „Fade-out für 3 Sekunden“ oder „Fade-in für 2 Sekunden“.";
  };
  const startClipDrag = (event, clip) => {
    recordHistory();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedClipId(clip.id);
    setDragging({ id: clip.id, start: clip.start, sourceTrack: clip.track, targetTrack: clip.track, clientX: event.clientX, clientY: event.clientY, moved: false });
  };
  const moveClip = (event, clip) => {
    if (!dragging || dragging.id !== clip.id) return;
    const laneWidth = event.currentTarget.parentElement.getBoundingClientRect().width;
    const raw = Math.max(0, Math.min(100 - clip.width, dragging.start + ((event.clientX - dragging.clientX) / laneWidth) * visibleRange));
    const trackShift = Math.round((event.clientY - dragging.clientY) / 82);
    const targetTrack = Math.max(0, Math.min(trackList.length - 1, dragging.sourceTrack + trackShift));
    const otherClips = timelineClips.filter(item => item.id !== clip.id && item.track === targetTrack).sort((a, b) => a.start - b.start);
    const availableRanges = [];
    let cursor = 0;
    otherClips.forEach(item => {
      const rangeEnd = item.start - clip.width;
      if (rangeEnd >= cursor) availableRanges.push([cursor, rangeEnd]);
      cursor = Math.max(cursor, item.start + item.width);
    });
    if (cursor <= 100 - clip.width) availableRanges.push([cursor, 100 - clip.width]);
    if (!availableRanges.length) {
      setDragging(current => current ? { ...current, targetTrack: dragging.sourceTrack, moved: true } : null);
      return;
    }
    const blockEdges = otherClips.flatMap(item => [item.start - clip.width, item.start + item.width]);
    const gridEdges = Array.from({ length: 9 }, (_, index) => index * 12.5);
    // Clip edges win over the time grid, so two neighbouring snippets really
    // pull together instead of stopping on a nearby grid line.
    const nearestClipEdge = blockEdges.reduce((closest, point) => Math.abs(point - raw) < Math.abs(closest - raw) ? point : closest, raw);
    const nearestGridEdge = gridEdges.reduce((closest, point) => Math.abs(point - raw) < Math.abs(closest - raw) ? point : closest, raw);
    // Give neighbouring clips a perceptible magnetic pull before their edges
    // touch. A 36px reach makes the attraction tangible without feeling loose.
    const snapThreshold = (12 / laneWidth) * visibleRange;
    const snapTarget = blockEdges.length && Math.abs(nearestClipEdge - raw) <= snapThreshold
      ? nearestClipEdge
      : Math.abs(nearestGridEdge - raw) <= snapThreshold ? nearestGridEdge : raw;
    const snapped = Math.max(0, Math.min(100 - clip.width, snapTarget));
    const nextStart = availableRanges
      .map(([from, to]) => Math.max(from, Math.min(to, snapped)))
      .reduce((closest, point) => Math.abs(point - snapped) < Math.abs(closest - snapped) ? point : closest);
    // Snap against the actual rendered edges. This makes the magnet feel the
    // same at every zoom level and avoids rounding differences in percentages.
    const targetLane = document.querySelector(`.track-lane[data-track-index="${targetTrack}"]`);
    const laneRect = targetLane?.getBoundingClientRect();
    let magneticStart = nextStart;
    if (targetLane && laneRect) {
      const previewLeft = laneRect.left + ((nextStart - viewStart) / visibleRange) * laneRect.width;
      const previewRight = previewLeft + (clip.width / visibleRange) * laneRect.width;
      const edgeDeltas = [...targetLane.querySelectorAll(".clip")]
        .filter(element => element.dataset.clipId !== clip.id)
        .flatMap(element => {
          const rect = element.getBoundingClientRect();
          return [rect.left - previewRight, rect.right - previewLeft];
        });
      const closestDelta = edgeDeltas.reduce((closest, delta) => Math.abs(delta) < Math.abs(closest) ? delta : closest, Infinity);
      if (Math.abs(closestDelta) <= 12) magneticStart = Math.max(0, Math.min(100 - clip.width, nextStart + (closestDelta / laneRect.width) * visibleRange));
    }
    setSnapAnimatingClipId(current => magneticStart !== nextStart || nextStart !== raw ? clip.id : current === clip.id ? null : current);
    setTimelineClips(current => current.map(item => item.id === clip.id ? { ...item, start: magneticStart } : item));
    setDragging(current => current ? { ...current, targetTrack, moved: true } : null);
  };
  const endClipDrag = (event, clip) => {
    if (!dragging || dragging.id !== clip.id) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const laneWidth = event.currentTarget.parentElement.getBoundingClientRect().width;
    const targetTrack = dragging.targetTrack;
    setTimelineClips(current => {
      const moving = current.find(item => item.id === clip.id);
      if (!moving) return current;
      const otherClips = current.filter(item => item.id !== clip.id && item.track === targetTrack);
      const edgeTargets = otherClips.flatMap(item => [item.start - moving.width, item.start + item.width]);
      const nearestEdge = edgeTargets.reduce((closest, point) => Math.abs(point - moving.start) < Math.abs(closest - moving.start) ? point : closest, moving.start);
      // Final safety net for quick drags: releasing near a neighbour docks it.
      const releaseSnapThreshold = (12 / laneWidth) * visibleRange;
      const start = edgeTargets.length && Math.abs(nearestEdge - moving.start) <= releaseSnapThreshold
        ? Math.max(0, Math.min(100 - moving.width, nearestEdge))
        : moving.start;
      return current.map(item => item.id === clip.id ? { ...item, track: targetTrack, start } : item);
    });
    if (dragging.moved) notify(dragging.targetTrack !== dragging.sourceTrack ? "Clip in andere Spur verschoben · Snap aktiv" : "Clip verschoben · Snap aktiv");
    setDragging(null);
    window.setTimeout(() => setSnapAnimatingClipId(current => current === clip.id ? null : current), 220);
  };
  const toggleTrackMute = (index) => { recordHistory(); toggle(muted, setMuted, index); };
  const toggleTrackSolo = (index) => { recordHistory(); toggle(solo, setSolo, index); };
  const setTrackVolume = (index, value) => { recordHistory(); setTrackVolumes(current => current.map((volume, trackIndex) => trackIndex === index ? Number(value) : volume)); };
  const setTrackEffect = (index, effectId, value) => { recordHistory(); setTrackList(current => current.map((track, trackIndex) => trackIndex === index ? { ...track, effects: { ...track.effects, [effectId]: Number(value), ...(effectId === "mickey" && Number(value) > 0 ? { echo: 0 } : {}) } } : track)); };
  const exportMix = async () => {
    const exportableClips = timelineClips.filter(clip => clip.audioItemId && !clip.recording && imported.some(item => item.id === clip.audioItemId) && !muted.includes(clip.track) && (!solo.length || solo.includes(clip.track)));
    if (!exportableClips.length) {
      notify("Lege zuerst mindestens einen hörbaren Clip auf die Timeline");
      return;
    }
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const DecodeContext = window.AudioContext || window.webkitAudioContext;
    if (!OfflineContext || !DecodeContext) {
      notify("Audio-Export wird von diesem Browser nicht unterstützt");
      return;
    }
    setExporting(true);
    notify("Mix wird vorbereitet …");
    let decodeContext;
    try {
      const sampleRate = 44100;
      const mixEnd = Math.max(...exportableClips.map(clip => ((clip.start + clip.width) / 100) * projectDuration));
      const offline = new OfflineContext(2, Math.max(1, Math.ceil(mixEnd * sampleRate)), sampleRate);
      decodeContext = new DecodeContext();
      const decodedBuffers = new Map();
      const getBuffer = async (item) => {
        if (!decodedBuffers.has(item.id)) {
          decodedBuffers.set(item.id, fetch(item.url)
            .then(response => {
              if (!response.ok) throw new Error("Audio source unavailable");
              return response.arrayBuffer();
            })
            .then(data => decodeContext.decodeAudioData(data)));
        }
        return decodedBuffers.get(item.id);
      };
      const addWetEffect = (input, amount, createEffect) => {
        const mix = offline.createGain();
        const dry = offline.createGain();
        const wet = offline.createGain();
        dry.gain.value = 1;
        wet.gain.value = Math.min(.85, .12 + (amount / 100) * .73);
        input.connect(dry); dry.connect(mix);
        const effect = createEffect();
        input.connect(effect); effect.connect(wet); wet.connect(mix);
        return mix;
      };
      let renderedClips = 0;
      await Promise.all(exportableClips.map(async clip => {
        const item = imported.find(entry => entry.id === clip.audioItemId);
        if (!item) return;
        try {
          const buffer = await getBuffer(item);
          const start = (clip.start / 100) * projectDuration;
          const clipDuration = (clip.width / 100) * projectDuration;
          const offset = Math.max(0, clip.sourceOffset || 0);
          const effects = trackList[clip.track]?.effects || {};
          const mickey = Number(effects.mickey) || 0;
          const horror = Number(effects.filter) || 0;
          const playbackRate = mickey > 0 ? 1 + (mickey / 100) * .75 : 1 - (horror / 100) * .6;
          const sourceDuration = Math.min(Math.max(0, buffer.duration - offset), clipDuration * playbackRate);
          if (!sourceDuration || !Number.isFinite(sourceDuration)) return;
          const source = offline.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.setValueAtTime(playbackRate, start);
          let output = source;
          if (effects.echo > 0) output = addWetEffect(output, effects.echo, () => {
            const delay = offline.createDelay(1.4);
            const feedback = offline.createGain();
            delay.delayTime.value = .08 + (effects.echo / 100) * .55;
            feedback.gain.value = .12 + (effects.echo / 100) * .48;
            delay.connect(feedback); feedback.connect(delay);
            return delay;
          });
          if (effects.reverb > 0) output = addWetEffect(output, effects.reverb, () => {
            const convolver = offline.createConvolver();
            const length = Math.floor(sampleRate * (.3 + (effects.reverb / 100) * 1.2));
            const impulse = offline.createBuffer(2, length, sampleRate);
            for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
              const data = impulse.getChannelData(channel);
              for (let frame = 0; frame < length; frame += 1) data[frame] = (Math.random() * 2 - 1) * Math.pow(1 - frame / length, 2.5);
            }
            convolver.buffer = impulse;
            return convolver;
          });
          if (effects.warmth > 0) {
            const shelf = offline.createBiquadFilter();
            shelf.type = "lowshelf"; shelf.frequency.value = 260; shelf.gain.value = (effects.warmth / 100) * 12;
            output.connect(shelf); output = shelf;
          }
          if (effects.filter > 0) {
            const bass = offline.createBiquadFilter();
            const lowpass = offline.createBiquadFilter();
            bass.type = "lowshelf"; bass.frequency.value = 180; bass.gain.value = (effects.filter / 100) * 16;
            lowpass.type = "lowpass"; lowpass.frequency.value = Math.max(360, 20000 - (effects.filter / 100) * 19600);
            output.connect(bass); bass.connect(lowpass); output = lowpass;
          }
          if (effects.drive > 0) {
            const shaper = offline.createWaveShaper();
            const curve = new Float32Array(256);
            const amount = 1 + (effects.drive / 100) * 28;
            for (let point = 0; point < curve.length; point += 1) { const x = (point * 2) / curve.length - 1; curve[point] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
            shaper.curve = curve; shaper.oversample = "2x";
            output.connect(shaper); output = shaper;
          }
          const gain = offline.createGain();
          const fullVolume = (trackVolumes[clip.track] ?? 75) / 100;
          const fade = fades[clip.id] || {};
          const fadeIn = clipDuration * ((fade.in || 0) / 100);
          const fadeOut = clipDuration * ((fade.out || 0) / 100);
          gain.gain.setValueAtTime(fadeIn ? 0 : fullVolume, start);
          if (fadeIn) gain.gain.linearRampToValueAtTime(fullVolume, start + fadeIn);
          if (fadeOut) {
            const fadeOutStart = Math.max(start + fadeIn, start + clipDuration - fadeOut);
            gain.gain.setValueAtTime(fullVolume, fadeOutStart);
            gain.gain.linearRampToValueAtTime(0, start + clipDuration);
          }
          output.connect(gain); gain.connect(offline.destination);
          source.start(start, offset, sourceDuration);
          renderedClips += 1;
        } catch (error) {
          console.error(`Could not export ${item.name}`, error);
        }
      }));
      if (!renderedClips) throw new Error("No exportable clips");
      const rendered = await offline.startRendering();
      const downloads = [];
      if (exportFormat === "wav") downloads.push({ extension: "wav", blob: new Blob([encodeWav(rendered)], { type: "audio/wav" }) });
      if (exportFormat === "mp3") downloads.push({ extension: "mp3", blob: encodeMp3(rendered) });
      downloads.forEach(({ extension, blob }) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${safeFileName(projectName)}.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      notify(`Mix exportiert als ${downloads.map(download => download.extension.toUpperCase()).join(" + ")} · ${formatDuration(mixEnd)} · ${renderedClips} Clip${renderedClips === 1 ? "" : "s"}`);
    } catch (error) {
      console.error(error);
      notify("Der Mix konnte nicht exportiert werden");
    } finally {
      decodeContext?.close?.().catch?.(() => {});
      setExporting(false);
    }
  };
  const selectedClip = timelineClips.find(clip => clip.id === selectedClipId);
  return <main className={`app-shell ${aiLayout === "bottom" ? "ai-bottom" : ""} ${aiPanelOpen ? "" : "ai-hidden"} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} onPointerDown={() => { setVolumePopoverTrack(null); setEffectsPopoverTrack(null); setTempoPopoverOpen(false); setMetronomePopoverOpen(false); }}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">f</span><span>flowtape</span></div>
      <button className="project-switch" onClick={() => setActiveNav("Mixes")}><div className="project-art"><span /></div><div><b>{projectName}</b><small>Mixtape</small></div><ChevronDown size={15}/></button>
      <nav>
        {[["Studio", Layers, "studio"], ["Library", Library, "library"], ["Sounds", Music2, "sounds"], ["Mixes", ListMusic, "mixtapes"]].map(([label, Icon, labelKey]) => <button className={activeNav === label ? "nav-active" : ""} onClick={() => setActiveNav(label)} key={label}><Icon size={18}/><span>{t(labelKey)}</span>{label === "Library" && <em>{imported.length}</em>}</button>)}
      </nav>
      <div className="side-bottom">
        <div className="user"><div className="avatar">{(userName || "F").trim().charAt(0).toUpperCase()}</div><div><b>{userName || "Flowtape"}</b><small>Free plan</small></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <div className="breadcrumbs"><button className="collapse-button" onClick={() => setSidebarCollapsed(v => !v)} title="Navigation ein-/ausklappen"><ChevronLeft size={18}/></button></div>
        {activeNav === "Studio" ? <div className="top-actions">{aiPanelOpen && <div className="layout-wrap"><button className="layout-button layout-toggle" onClick={() => setAiLayout(current => current === "side" ? "bottom" : "side")} title={aiLayout === "side" ? "KI-Bereich nach unten verschieben" : "KI-Bereich nach rechts verschieben"}><span className={`layout-icon ${aiLayout === "side" ? "side-icon" : "bottom-icon"}`}/></button></div>}<div className="history-controls"><button className="icon-btn" onClick={undo} disabled={!history.past.length} title={t("undo")}><Undo2 size={17}/></button><button className="icon-btn" onClick={redo} disabled={!history.future.length} title={t("redo")}><Redo2 size={17}/></button></div><button className={`export-btn ${timelineClips.length ? "" : "export-empty"}`} onClick={exportMix} disabled={exporting || !timelineClips.length}><Download size={16}/>{exporting ? t("exporting") : t("export")}</button></div> : <div className="top-actions"><button className="export-btn" onClick={activeNav === "Mixes" ? () => openProjectSetup("create") : activeNav === "Sounds" ? () => soundFileInput.current?.click() : () => fileInput.current?.click()}>{activeNav === "Mixes" ? <Plus size={16}/> : <Upload size={16}/>}{activeNav === "Mixes" ? t("newMixtape") : activeNav === "Sounds" ? t("importSamples") : t("addMusic")}</button></div>}
      </header>
      <input ref={fileInput} type="file" accept="audio/mp3,audio/*" multiple onChange={importFiles} hidden/>
      <input ref={soundFileInput} type="file" accept="audio/mp3,audio/*" multiple onChange={importSoundFiles} hidden/>
      {activeNav === "Library" ? <LibraryView imported={imported} onUpload={() => fileInput.current?.click()} onPreview={togglePreview} onRemove={removeImportedItem} activePreview={activePreview} language={appLanguage} /> : activeNav === "Sounds" ? <SoundsView samples={allLibrarySamples} query={sampleQuery} setQuery={setSampleQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} onPreview={togglePreview} onAdd={addLibrarySampleToMix} onToggleFavorite={toggleSampleFavorite} favoriteIds={favoriteSampleIds} activePreview={activePreview} language={appLanguage} /> : activeNav === "Mixes" ? <MixesView projects={projects} activeProjectId={activeProjectId} onOpen={openProject} onContextMenu={openMixtapeContextMenu} language={appLanguage} /> : <>
      <div className="mix-header">
        <div><div className="eyebrow">MIXTAPE</div><div className="project-title"><h1>{projectName}</h1><button onClick={() => openProjectSetup("edit")} title={t("projectEdit")}><Pencil size={14}/></button></div><p>{projectDescription}</p></div>
        {recording ? <div className="transport recording-transport"><button className="record-stop" onClick={stopVoiceRecording}><i/> Aufnahme stoppen</button><span className="time">{formatTime(recordingElapsed)}</span></div> : <div className="transport"><button className="round-control" onClick={restartTransport} title={t("restart")}><SkipBack size={17}/></button><button className="play-button" onClick={toggleTransport}>{activePreview || playing ? <Pause fill="currentColor" size={19}/> : <Play fill="currentColor" size={19}/>}</button>{editingPlaybackTime ? <input className="transport-time-input" autoFocus value={playbackTimeDraft} onChange={event => setPlaybackTimeDraft(event.target.value)} onBlur={commitPlaybackTimeEdit} onKeyDown={event => { if (event.key === "Enter") commitPlaybackTimeEdit(); if (event.key === "Escape") setEditingPlaybackTime(false); }} aria-label="Abspielposition eingeben"/> : <button className="time time-button" onDoubleClick={beginPlaybackTimeEdit} title="Doppelklicken, um die Abspielposition einzugeben">{formatTime(playbackTime)} <i>/</i> {formatTime(projectDuration)}</button>}<button className={loopActive ? "round-control loop-active" : "round-control"} onClick={toggleLoop} title={t("loop")}><Repeat2 size={16}/></button><div className="tempo-wrap" onPointerDown={event => event.stopPropagation()}><button className="tempo" onClick={() => setTempoPopoverOpen(current => !current)} title={t("tempo")}><b>{bpm}</b> <small>BPM</small></button>{tempoPopoverOpen && <div className="tempo-popover"><div><span>{t("tempo")}</span><small>40–240 BPM</small></div><div className="tempo-control"><button onClick={() => changeTempo(bpm - 1)} aria-label="Tempo verringern">−</button><input type="number" min="40" max="240" value={bpm} onChange={event => changeTempo(event.target.value)} onBlur={() => changeTempo(bpm)} aria-label="BPM"/><button onClick={() => changeTempo(bpm + 1)} aria-label="Tempo erhöhen">+</button></div></div>}</div><div className="metronome-wrap" onPointerDown={event => event.stopPropagation()}><button className={metronomeEnabled ? "round-control metronome-active" : "round-control"} onClick={toggleMetronome} title={t("metronome")}><Command size={16}/></button>{metronomePopoverOpen && <div className="metronome-popover"><div><span>{t("metronome")}</span><small>{bpm} BPM · 4/4</small></div><label><span>{metronomeVolumeLabel}</span><input type="range" min="0" max="100" value={metronomeVolume} onChange={event => setMetronomeVolume(Number(event.target.value))}/><b>{metronomeVolume}%</b></label><p>{t("tempoHint")}</p></div>}</div></div>}
      </div>
      <div className="editor" style={{ height: `${Math.max(356, 38 + trackList.length * 82)}px`, "--beat-grid": `${beatGridPercent}%`, "--bar-grid": `${beatGridPercent * 4}%` }}>
        <div className="track-head"><span>{t("tracks")} <b>{String(trackList.length).padStart(2, "0")}</b></span>{!recording && <div className="track-add-wrap"><button onClick={() => setTrackMenuOpen(current => !current)}><span>{t("addTrack")}</span><Plus size={16}/></button>{trackMenuOpen && <div className="track-add-menu"><button onClick={addEmptyTrack}><Plus size={15}/> {t("emptyTrack")}</button><button onClick={startVoiceRecording}><Mic size={15}/> {t("recordAudio")}</button></div>}</div>}</div>
        <div className={`timeline-ruler ${seeking ? "is-seeking" : ""}`} onPointerDown={startSeeking} onPointerMove={moveSeeking} onPointerUp={endSeeking} title="Klicken oder ziehen, um den Abspielkopf zu positionieren">{audioMarkerWidth > 0 && <i className="audio-extent-marker" style={{ width: `${audioMarkerWidth}%`, "--fade-start": `${Math.min(100, (33 / timelineAudioEnd) * 100)}%` }} title={`Audio bis ${formatTime(timelineAudioEnd)}`}/>} {Array.from({ length: 9 }, (_, index) => <span key={index}>{formatTime(projectDuration * ((viewStart + (visibleRange * index) / 8) / 100))}</span>)}</div>
        <div className="track-list">
          {trackList.map((track, index) => <div className={`track-row ${muted.includes(index) ? "track-muted" : ""} ${trackDrag?.from === index ? "track-row-dragging" : ""} ${trackDrag?.target === index && trackDrag?.from !== index ? "track-row-drop-target" : ""} ${dragging?.targetTrack === index && dragging?.sourceTrack !== index ? "clip-track-drop-target" : ""} ${libraryDropTrack === index ? "library-track-drop-target" : ""}`} key={`${track.name}-${index}`}>
            <div className="track-info" onContextMenu={event => openTrackContextMenu(event, index)}><button className="grip" title="Spur verschieben" onPointerDown={event => startTrackDrag(event, index)} onPointerMove={moveTrackDrag} onPointerUp={endTrackDrag}><GripVertical size={15}/></button><div className="track-dot" style={{ background: track.color }} /><div className="track-name" onDoubleClick={event => beginTrackRename(event, index)}>{editingTrack === index ? <input autoFocus value={trackNameDraft} onPointerDown={event => event.stopPropagation()} onChange={event => setTrackNameDraft(event.target.value)} onBlur={commitTrackRename} onKeyDown={event => { if (event.key === "Enter") commitTrackRename(); if (event.key === "Escape") setEditingTrack(null); }}/> : <><b title={track.name}>{track.name}</b><small title={track.detail}>{track.detail}</small></>}</div><button className={muted.includes(index) ? "track-toggle active-toggle" : "track-toggle"} onClick={() => toggleTrackMute(index)} title="Spur stummschalten">M</button><button className={solo.includes(index) ? "track-toggle solo-toggle" : "track-toggle"} onClick={() => toggleTrackSolo(index)} title="Nur diese Spur hören">S</button><button className={`track-effects ${TRACK_EFFECTS.some(effect => (track.effects?.[effect.id] || 0) > 0) ? "effects-active" : ""}`} onPointerDown={event => event.stopPropagation()} onClick={() => setEffectsPopoverTrack(current => current === index ? null : index)} title="Effekte"><Wand2 size={13}/></button>{effectsPopoverTrack === index && <div className="effects-popover" onPointerDown={event => event.stopPropagation()}><div className="effects-popover-head"><span>Effekte</span><small>{TRACK_EFFECTS.filter(effect => (track.effects?.[effect.id] || 0) > 0).length} aktiv</small></div>{TRACK_EFFECTS.map(effect => { const value = track.effects?.[effect.id] || 0; return <div className="effect-control" key={effect.id}><button className={value > 0 ? "effect-enabled" : ""} onClick={() => setTrackEffect(index, effect.id, value > 0 ? 0 : 45)}><span><b>{effect.label}</b><small>{effect.hint}</small></span><i/></button><div><input type="range" min="0" max="100" value={value} onChange={event => setTrackEffect(index, effect.id, event.target.value)}/><em>{value}%</em></div></div>; })}</div>}<button className="mini-volume" onPointerDown={event => event.stopPropagation()} onClick={() => setVolumePopoverTrack(current => current === index ? null : index)} title="Spurlautstärke"><i style={{width: `${trackVolumes[index] ?? 75}%`}} /></button>{volumePopoverTrack === index && <div className="volume-popover" onPointerDown={event => event.stopPropagation()}><div><span>Lautstärke</span><b>{trackVolumes[index] ?? 75}%</b></div><input type="range" min="0" max="100" value={trackVolumes[index] ?? 75} onChange={event => setTrackVolume(index, event.target.value)}/></div>}</div>
            <div className="track-lane" data-track-index={index} style={{ "--minor-grid": `${Math.max(1.5625, 6.25 / timelineZoom)}%` }} onPointerDown={event => { if (event.target === event.currentTarget) seekInLane(event); }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setLibraryDropTrack(index); }} onDragLeave={event => { if (event.currentTarget === event.target) { setLibraryDropTrack(null); setLibraryDropPreview(null); } }} onDrop={event => dropLibraryItemOnTrack(event, index)}>{libraryDropPreview?.trackIndex === index && <div className="library-drop-preview" style={{ left: `${((libraryDropPreview.start - viewStart) / visibleRange) * 100}%`, width: `${(libraryDropPreview.width / visibleRange) * 100}%`, "--preview-color": track.color, backgroundColor: `${track.color}32` }}><span>{libraryDropPreview.label}</span></div>}{timelineClips.filter(c => c.track === index).map(clip => <div key={clip.id} data-clip-id={clip.id} className={`clip ${clip.color} ${clip.recording ? "clip-recording" : ""} ${selectedClipId === clip.id ? "clip-selected" : ""} ${dragging?.id === clip.id ? "clip-dragging" : ""} ${snapAnimatingClipId === clip.id ? "clip-snap-easing" : ""}`} style={{ left: `${((clip.start - viewStart) / visibleRange) * 100}%`, width: `${(clip.width / visibleRange) * 100}%`, ...clipAppearance(clip, track, dragging, trackList) }} onPointerDown={event => startClipDrag(event, clip)} onPointerMove={event => moveClip(event, clip)} onPointerUp={event => endClipDrag(event, clip)} onContextMenu={event => openContextMenu(event, clip)}><span>{clip.recording ? `Aufnahme läuft · ${formatTime(recordingElapsed)}` : clip.label}</span><div className="clip-fades"><i className="fade-in" style={{ width: `${fades[clip.id]?.in || 0}%` }} /><i className="fade-out" style={{ width: `${fades[clip.id]?.out || 0}%` }} /></div><Waveform type={clip.waveform} density={timelineZoom}/></div>)}</div>
          </div>)}
          <div className="playhead" style={{ left: `calc(${playheadPercent}% + ${270 - (playheadPercent * 2.7)}px)` }} onPointerDown={startPlayheadDrag} onPointerMove={movePlayheadDrag} onPointerUp={endPlayheadDrag} onPointerCancel={endPlayheadDrag} title="Abspielkopf ziehen"><div className="playhead-tag">{formatTime(playbackTime)}</div></div>
        </div>
      </div>
      <div className="tool-strip"><div className="tool-group"><button className={aiPanelOpen ? "selected-tool" : ""} onClick={() => { setAiLayout("side"); setAiPanelOpen(current => !current); }} title={t("aiOpen")}><Wand2 size={18}/></button><button onClick={() => setSettingsOpen(true)} title={t("settings")}><SlidersHorizontal size={18}/></button><button onClick={() => setShortcutsOpen(true)} title={t("quickTools")}><Zap size={18}/></button></div>{selectedClip ? <div className="clip-inspector"><span><Sparkles size={14}/> {selectedClip.label}</span><label>Fade in <input type="range" min="0" max="40" value={fades[selectedClip.id]?.in || 0} onChange={event => setFade(selectedClip.id, "in", event.target.value)} /></label><label>Fade out <input type="range" min="0" max="40" value={fades[selectedClip.id]?.out || 0} onChange={event => setFade(selectedClip.id, "out", event.target.value)} /></label></div> : <div className="snap-note">{t("dragSnap")}</div>}<div className="zoom"><button onClick={() => changeZoom(-.5)} aria-label={t("zoomOut")}>−</button><input type="range" min="0" max={Math.max(0, 100 - visibleRange)} step="0.1" value={viewStart} onChange={event => setViewStart(Number(event.target.value))} disabled={timelineZoom === 1} aria-label={t("timelinePan")}/><button onClick={() => changeZoom(.5)} aria-label={t("zoomIn")}>+</button></div></div>
      <section className="sample-dock"><div className="dock-head"><div><div className="eyebrow">{t("mixCollection")}</div><h2>{t("soundsForMix")}</h2></div><div className="dock-actions"><div className="search"><Search size={16}/><input placeholder={t("searchSamples")}/></div><button className="upload" onClick={() => fileInput.current?.click()}><Upload size={16}/> {t("addMp3")}</button></div></div>{imported.length ? <><div className="sample-cards">{imported.map(item => { const isUsed = timelineClips.some(clip => clip.audioItemId === item.id); return <div className="sample-card imported" key={item.id} onPointerDown={event => startLibraryPointerDrag(event, item)} title={appLanguage === "de" ? "In eine Spur ziehen" : "Drag onto a track"}><button className="sample-play" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); togglePreview(item); }} title={t("preview")}>{activePreview === item.id ? <Pause fill="currentColor" size={13}/> : <Play fill="currentColor" size={13}/>}</button><div className="sample-copy"><b>{item.name}</b><small>{item.duration}</small></div>{isUsed && <span className="sample-used-dot" title={appLanguage === "de" ? "Wird in dieser Timeline verwendet" : "Used on this timeline"}/>}<button className="remove-import" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); removeImportedItem(item.id); }} title={t("removeFromMix")}><Trash2 size={16}/></button></div>; })}</div><p className="upload-hint"><Headphones size={14}/> {t("sampleHint")}</p></> : <button className="empty-sounds" onClick={() => fileInput.current?.click()}><Upload size={18}/><span><b>{t("addOwnSounds")}</b><small>{t("addOwnSoundsLead")}</small></span></button>}</section>
      </>}
    </section>
    <aside className="ai-panel">
      <header><div className="ai-title"><div className="ai-star"><Sparkles size={16}/></div><span>flow AI</span><em>BETA</em></div><button onClick={() => setAiPanelOpen(false)} title={t("closeAi")}><X size={18}/></button></header>
      <div className="ai-intro"><div className="ai-orb"><span></span></div><h2>{t("ideaTitle")}</h2><p>{t("aiLead")}</p></div>
      <div className="quick-ideas"><button onClick={() => submitPrompt("Mach den Übergang zum Refrain weicher")}>Mach den Übergang zum Refrain weicher <ChevronRight size={15}/></button><button onClick={() => submitPrompt("Schneide die Stille vor dem Drop weg")}>Schneide die Stille vor dem Drop weg <ChevronRight size={15}/></button><button onClick={() => submitPrompt("Gib dem Mix mehr Wärme")}>Gib dem Mix mehr Wärme <ChevronRight size={15}/></button></div>
      <div className="chat">{messages.map((message, i) => <div key={i} className={`message ${message.role}`}><span>{message.role === "ai" ? "✦" : "S"}</span><p>{message.text}</p></div>)}</div>
      <div className="prompt-box"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitPrompt(); } }} placeholder={t("describeChange")}/><div><button className={listening ? "mic mic-listening" : "mic"} onClick={startVoiceInput}><Mic size={17}/><span>{listening ? t("listening") : t("speak")}</span></button><button className="send" onClick={() => submitPrompt()} disabled={!prompt.trim()}><ArrowDownToLine size={17}/></button></div></div>
    </aside>
    {contextMenu && <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => setContextMenu(null)}><button onClick={() => splitClipAtPlayhead(contextMenu.clipId)}><Scissors size={15}/> {t("splitAtPlayhead")}</button><span/><button onClick={() => copyClip(contextMenu.clipId, true)}><Scissors size={15}/> {t("cut")}</button><button onClick={() => copyClip(contextMenu.clipId)}><Copy size={15}/> {t("copy")}</button><span/><button className="danger" onClick={() => removeClip(contextMenu.clipId)}><Trash2 size={15}/> {t("delete")}</button></div>}
    {trackContextMenu && <div className="context-menu track-context-menu" style={{ left: trackContextMenu.x, top: trackContextMenu.y }} onMouseLeave={() => setTrackContextMenu(null)}><button onClick={() => duplicateTrack(trackContextMenu.index)}><Copy size={15}/> {t("duplicateTrack")}</button><span/><button className="danger" onClick={() => deleteTrack(trackContextMenu.index)}><Trash2 size={15}/> {t("deleteTrack")}</button></div>}
    {mixtapeContextMenu && <div className="context-menu mixtape-context-menu" style={{ left: mixtapeContextMenu.x, top: mixtapeContextMenu.y }} onMouseLeave={() => setMixtapeContextMenu(null)}><button onClick={() => duplicateMixtape(mixtapeContextMenu.id)}><Copy size={15}/> {appLanguage === "de" ? "Mixtape duplizieren" : "Duplicate Mixtape"}</button><span/><button className="danger" onClick={() => requestMixtapeRemoval(mixtapeContextMenu.id)}><Trash2 size={15}/> {appLanguage === "de" ? "Mixtape löschen" : "Delete Mixtape"}</button></div>}
    {projectSetupMode && <div className="project-modal-backdrop" onPointerDown={() => setProjectSetupMode(null)}><form className="project-modal" onSubmit={saveProjectSetup} onPointerDown={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setProjectSetupMode(null)}><X size={18}/></button><div className="eyebrow">{projectSetupMode === "create" ? t("newProject") : t("projectSettings")}</div><h2>{projectSetupMode === "create" ? t("createMixtape") : t("editMixtape")}</h2><p>{t("projectLead")}</p><label>{t("name")}<input autoFocus value={draftProjectName} onChange={event => setDraftProjectName(event.target.value)} placeholder="z. B. Summer Drive"/></label><label>{t("description")} <small>{t("optional")}</small><input value={draftProjectDescription} onChange={event => setDraftProjectDescription(event.target.value)} placeholder="Worum geht es in diesem Mix?"/></label><label>{t("totalLength")}<div className="duration-input"><input type="number" min="0.5" max="120" step="0.5" value={draftProjectMinutes} onChange={event => { const value = event.target.value; if (value === "" || Number(value) <= 120) setDraftProjectMinutes(value); }}/><span>{t("minutes")}</span></div></label><div className="modal-actions"><button type="button" onClick={() => setProjectSetupMode(null)}>{t("cancel")}</button><button className="modal-primary" type="submit">{projectSetupMode === "create" ? t("create") : t("saveChanges")}</button></div></form></div>}
    {pendingImportRemoval && <div className="project-modal-backdrop" onPointerDown={() => setPendingImportRemoval(null)}><section className="project-modal removal-modal" onPointerDown={event => event.stopPropagation()}><h2>{appLanguage === "de" ? "Song wirklich entfernen?" : "Remove this song?"}</h2><p>{appLanguage === "de" ? <>„{pendingImportRemoval.name}“ wird in {pendingImportRemoval.projects.join(", ")} verwendet. Beim Entfernen werden auch die zugehörigen Clips aus diesem Mix gelöscht.</> : <>“{pendingImportRemoval.name}” is used in {pendingImportRemoval.projects.join(", ")}.<br/>Removing it will also delete its clips from this mix.</>}</p><div className="modal-actions"><button type="button" onClick={() => setPendingImportRemoval(null)}>{t("cancel")}</button><button className="modal-danger" type="button" onClick={() => { const id = pendingImportRemoval.id; setPendingImportRemoval(null); removeImportedItem(id, true); }}>{appLanguage === "de" ? "Entfernen" : "Remove"}</button></div></section></div>}
    {pendingMixtapeRemoval && <div className="project-modal-backdrop" onPointerDown={() => setPendingMixtapeRemoval(null)}><section className="project-modal removal-modal project-removal-modal" onPointerDown={event => event.stopPropagation()}><h2>{appLanguage === "de" ? "Mixtape löschen?" : "Delete mixtape?"}</h2><p>{appLanguage === "de" ? <>„{pendingMixtapeRemoval.name}“ und alle darin enthaltenen Spuren werden dauerhaft gelöscht.</> : <>“{pendingMixtapeRemoval.name}” and all of its tracks will be permanently deleted.</>}</p><div className="modal-actions"><button type="button" onClick={() => setPendingMixtapeRemoval(null)}>{t("cancel")}</button><button className="modal-danger" type="button" onClick={() => deleteMixtape(pendingMixtapeRemoval.id)}>{appLanguage === "de" ? "Löschen" : "Delete"}</button></div></section></div>}
    {welcomeOpen && <div className="project-modal-backdrop welcome-backdrop"><form className="project-modal welcome-modal" onSubmit={event => { event.preventDefault(); finishWelcome(); }}><div className="welcome-mark"><span className="brand-mark">f</span></div><div className="eyebrow">FLOWTAPE STUDIO</div><h2>Welcome to flowtape</h2><p>What should we call you?</p><input className="welcome-name-input" autoFocus value={welcomeNameDraft} onChange={event => setWelcomeNameDraft(event.target.value)} placeholder="Your name"/><div className="modal-actions"><button className="modal-primary" type="submit">Let’s go</button></div></form></div>}
    {settingsOpen && <div className="project-modal-backdrop" onPointerDown={() => setSettingsOpen(false)}><section className="project-modal settings-modal" onPointerDown={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setSettingsOpen(false)}><X size={18}/></button><h2>{t("settings")}</h2><p>{t("settingsLead")}</p><div className="settings-row"><div><b>{t("language")}</b><small>{t("interfaceLanguage")}</small></div><div className="settings-segment"><button className={appLanguage === "de" ? "selected" : ""} onClick={() => setAppLanguage("de")}>Deutsch</button><button className={appLanguage === "en" ? "selected" : ""} onClick={() => setAppLanguage("en")}>English</button></div></div><div className="settings-row"><div><b>{t("defaultTracks")}</b><small>{t("defaultTracksLead")}</small></div><div className="track-count-stepper"><button onClick={() => setDefaultTrackCount(value => Math.max(1, value - 1))} disabled={defaultTrackCount <= 1}>−</button><b>{defaultTrackCount}</b><button onClick={() => setDefaultTrackCount(value => Math.min(8, value + 1))} disabled={defaultTrackCount >= 8}>+</button></div></div><div className="settings-row"><div><b>{t("exportFormats")}</b><small>{t("exportFormatsLead")}</small></div><div className="settings-segment"><button className={exportFormat === "wav" ? "selected" : ""} onClick={() => setExportFormat("wav")}>WAV</button><button className={exportFormat === "mp3" ? "selected" : ""} onClick={() => setExportFormat("mp3")}>MP3</button></div></div><div className="modal-actions"><button className="modal-primary" onClick={() => { setSettingsOpen(false); notify("Einstellungen gespeichert"); }}>{t("done")}</button></div></section></div>}
    {shortcutsOpen && <div className="project-modal-backdrop" onPointerDown={() => setShortcutsOpen(false)}><section className="project-modal shortcuts-modal" onPointerDown={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShortcutsOpen(false)}><X size={18}/></button><div className="eyebrow">{shortcutsCopy.eyebrow}</div><h2>{shortcutsCopy.title}</h2><p>{shortcutsCopy.lead}</p><div className="shortcuts-list">{shortcutsCopy.rows.map(([shortcut, description]) => <div key={shortcut}><kbd>{shortcut}</kbd><span>{description}</span></div>)}</div><div className="modal-actions"><button className="modal-primary" onClick={() => setShortcutsOpen(false)}>{shortcutsCopy.close}</button></div></section></div>}
    {toast && <div className="toast"><Sparkles size={15}/>{toast}</div>}
  </main>;
}

const isHostedWebsite = /^https?:$/.test(window.location.protocol) && !["localhost", "127.0.0.1"].includes(window.location.hostname);
const showLandingPage = isHostedWebsite || window.location.search.includes("landing") || window.location.hash === "#landing" || window.location.pathname === "/landing";
createRoot(document.getElementById("root")).render(showLandingPage ? <FlowtapeLandingV2 /> : <App />);
