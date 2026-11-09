import { DEFAULT_SETTINGS } from "./types";
import type { RHData } from "./types";
import { dateKey } from "./stats";

const STORAGE_KEY = "reader-hub-data-v1";

// ---------- IndexedDB for images (covers, avatar) ----------

const IMG_DB = "reader-hub-images";
const IMG_STORE = "images";

function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IMG_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMG_STORE)) db.createObjectStore(IMG_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(dataUrl: string): Promise<string> {
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const db = await openImageDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMG_STORE, "readwrite");
    tx.objectStore(IMG_STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function getImage(id: string): Promise<string | undefined> {
  const db = await openImageDB();
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(IMG_STORE, "readonly");
    const req = tx.objectStore(IMG_STORE).get(id);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openImageDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMG_STORE, "readwrite");
    tx.objectStore(IMG_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Downscale an uploaded file to a compact JPEG dataURL before storing.
export async function fileToCoverDataUrl(file: File, max = 640): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- vanilla store ----------

function emptyData(): RHData {
  return {
    version: 1,
    items: [],
    sessions: [],
    vault: [],
    reflections: [],
    collections: [],
    quotes: [],
    discoveries: [],
    challenges: [],
    checklist: {},
    settings: { ...DEFAULT_SETTINGS, checklist: [...DEFAULT_SETTINGS.checklist] },
    timer: null,
    createdAt: Date.now(),
  };
}

// SSR and the browser's hydration pass must begin from the same empty snapshot.
// Browser persistence becomes visible immediately after hydration through loadData.
const serverSnapshot = emptyData();

export function getServerSnapshot(): RHData {
  return serverSnapshot;
}

function migrate(raw: Partial<RHData> | null | undefined): RHData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    items: raw.items ?? [],
    sessions: raw.sessions ?? [],
    vault: raw.vault ?? [],
    reflections: raw.reflections ?? [],
    collections: raw.collections ?? [],
    quotes: raw.quotes ?? [],
    discoveries: raw.discoveries ?? [],
    challenges: raw.challenges ?? [],
    checklist: raw.checklist ?? {},
  };
}

let data: RHData | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

export function loadData(): RHData {
  if (data) return data;
  let parsed: RHData | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) parsed = migrate(JSON.parse(raw));
    } catch {
      parsed = null;
    }
  }
  data = parsed ?? emptyData();
  return data;
}

function persist() {
  if (typeof window === "undefined" || !data) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full — keep app usable in memory
    }
  }, 250);
}

function emit() {
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot(): RHData {
  return loadData();
}

export function mutate(fn: (d: RHData) => void) {
  const d = loadData();
  fn(d);
  persist();
  emit();
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- backup / restore / reset ----------

export function importData(raw: unknown): { ok: boolean; error?: string } {
  try {
    const migrated = migrate(raw as Partial<RHData>);
    if (typeof migrated !== "object" || !Array.isArray(migrated.items)) {
      return { ok: false, error: "Not a Reader Hub backup file." };
    }
    data = migrated;
    persist();
    emit();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not read that backup file." };
  }
}

export function resetData() {
  data = emptyData();
  persist();
  emit();
}

// ---------- id helper for new records ----------

export function todayKey(): string {
  return dateKey();
}
