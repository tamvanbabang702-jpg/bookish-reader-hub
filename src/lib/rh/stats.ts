import type {
  ReadingItem,
  ReadingSession,
  RHData,
  VaultEntry,
  VaultKind,
  Challenge,
} from "./types";

// ---------- date helpers (local dates, yyyy-mm-dd) ----------

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function daysAgoKey(n: number): string {
  return addDays(dateKey(), -n);
}

export function prettyDate(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function prettyShort(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function formatSeconds(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still awake";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ---------- item derived values ----------

export function itemProgress(item: ReadingItem): number {
  if (item.status === "completed") return 100;
  if (item.status === "abandoned") return 0;
  if (!item.totalPages || item.totalPages <= 0) return 0;
  const pct = Math.round((item.currentPage / item.totalPages) * 100);
  return Math.min(100, Math.max(0, pct));
}

export function isActiveStatus(s: ReadingItem["status"]): boolean {
  return s === "reading";
}

// ---------- aggregates ----------

export function dayTotalsMap(sessions: ReadingSession[]): Map<string, { minutes: number; pages: number }> {
  const map = new Map<string, { minutes: number; pages: number }>();
  for (const s of sessions) {
    const cur = map.get(s.date) ?? { minutes: 0, pages: 0 };
    cur.minutes += s.minutes;
    cur.pages += s.pages;
    map.set(s.date, cur);
  }
  return map;
}

export function lastNDays(n: number, endKey: string = dateKey()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(addDays(endKey, -i));
  return keys;
}

export function totalsInRange(
  totals: Map<string, { minutes: number; pages: number }>,
  keys: string[],
): { minutes: number; pages: number } {
  let minutes = 0;
  let pages = 0;
  for (const k of keys) {
    const t = totals.get(k);
    if (t) {
      minutes += t.minutes;
      pages += t.pages;
    }
  }
  return { minutes, pages };
}

export function dayActiveSet(sessions: ReadingSession[]): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) {
    if (s.minutes > 0 || s.pages > 0) set.add(s.date);
  }
  return set;
}

// Reading streak: consecutive active days ending today (or yesterday if today not yet active).
export function readingStreak(sessions: ReadingSession[]): number {
  const active = dayActiveSet(sessions);
  if (active.size === 0) return 0;
  let cursor = dateKey();
  if (!active.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!active.has(cursor)) return 0;
  }
  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(sessions: ReadingSession[]): number {
  const days = [...dayActiveSet(sessions)].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function consistencyPct(sessions: ReadingSession[], windowDays = 30): number {
  const keys = lastNDays(windowDays);
  const active = dayActiveSet(sessions);
  let hit = 0;
  for (const k of keys) if (active.has(k)) hit++;
  return Math.round((hit / windowDays) * 100);
}

export function booksCompletedThisYear(data: RHData): ReadingItem[] {
  const year = new Date().getFullYear();
  return data.items.filter(
    (it) =>
      it.status === "completed" &&
      it.completedDate &&
      it.completedDate.startsWith(String(year)),
  );
}

export function totalStats(data: RHData): { minutes: number; pages: number; entries: number } {
  const minutes = data.sessions.reduce((a, s) => a + s.minutes, 0);
  const pages = data.sessions.reduce((a, s) => a + s.pages, 0);
  return { minutes, pages, entries: data.vault.length };
}

// ---------- reports ----------

export interface PeriodReport {
  itemsFinished: number;
  minutes: number;
  pages: number;
  entriesCreated: number;
  activeDays: number;
}

export function reportForRange(
  data: RHData,
  fromKey: string,
  toKey: string,
): PeriodReport {
  const totals = dayTotalsMap(data.sessions);
  const keys: string[] = [];
  let cursor = fromKey;
  let guard = 0;
  while (cursor <= toKey && guard < 500) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  const t = totalsInRange(totals, keys);
  const itemsFinished = data.items.filter(
    (it) => it.completedDate && it.completedDate >= fromKey && it.completedDate <= toKey,
  ).length;
  const entriesCreated = data.vault.filter(
    (v) => dateKey(new Date(v.createdAt)) >= fromKey && dateKey(new Date(v.createdAt)) <= toKey,
  ).length;
  const activeDays = keys.filter((k) => totals.has(k)).length;
  return { itemsFinished, minutes: t.minutes, pages: t.pages, entriesCreated, activeDays };
}

export function topCategories(data: RHData, fromKey?: string): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const it of data.items) {
    if (fromKey && it.completedDate && it.completedDate < fromKey) continue;
    const c = it.category || "Uncategorized";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export interface Milestone {
  label: string;
  done: boolean;
  detail: string;
}

export function milestones(data: RHData): Milestone[] {
  const stats = totalStats(data);
  const completed = data.items.filter((i) => i.status === "completed").length;
  const streak = readingStreak(data.sessions);
  const reviews = data.reflections.length;
  return [
    { label: "First reading session", done: data.sessions.length >= 1, detail: `${data.sessions.length} sessions logged` },
    { label: "First entry in the Vault", done: data.vault.length >= 1, detail: `${data.vault.length} entries saved` },
    { label: "First book completed", done: completed >= 1, detail: `${completed} books completed` },
    { label: "5 hours of reading", done: stats.minutes >= 300, detail: formatMinutes(stats.minutes) + " total" },
    { label: "100 pages read", done: stats.pages >= 100, detail: `${stats.pages} pages total` },
    { label: "7-day streak", done: streak >= 7 || bestStreak(data.sessions) >= 7, detail: `Best streak: ${bestStreak(data.sessions)} days` },
    { label: "25 Vault entries", done: data.vault.length >= 25, detail: `${data.vault.length} entries saved` },
    { label: "First guided reflection", done: reviews >= 1, detail: `${reviews} reflections written` },
    { label: "5 books completed", done: completed >= 5, detail: `${completed} books completed` },
    { label: "50 hours of reading", done: stats.minutes >= 3000, detail: formatMinutes(stats.minutes) + " total" },
  ];
}

// ---------- challenge progress ----------

export function challengeProgress(data: RHData, ch: Challenge): { value: number; pct: number } {
  const year = String(new Date().getFullYear());
  let value = 0;
  if (ch.unit === "books") {
    value = booksCompletedThisYear(data).length;
  } else if (ch.unit === "minutes") {
    value = Math.round(data.sessions.reduce((a, s) => a + s.minutes, 0));
  } else if (ch.unit === "pages") {
    value = data.sessions.reduce((a, s) => a + s.pages, 0);
  } else {
    value = data.vault.length;
  }
  void year;
  const pct = ch.target > 0 ? Math.min(100, Math.round((value / ch.target) * 100)) : 0;
  return { value, pct };
}

// ---------- memory review ----------

export function entriesDaysAgo(data: RHData, days: number, tolerance = 2): VaultEntry[] {
  const target = new Date();
  target.setDate(target.getDate() - days);
  const lo = target.getTime() - tolerance * 86400000;
  const hi = target.getTime() + tolerance * 86400000;
  return data.vault.filter((v) => v.createdAt >= lo && v.createdAt <= hi);
}

export function vaultByKind(data: RHData, kind?: VaultKind): VaultEntry[] {
  return data.vault
    .filter((v) => (kind ? v.kind === kind : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function randomEntry(data: RHData, excludeId?: string): VaultEntry | null {
  const pool = data.vault.filter((v) => v.id !== excludeId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
