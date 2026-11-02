import type { RHData } from "./types";
import { prettyDate } from "./stats";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(data: RHData) {
  const stamp = new Date().toISOString().slice(0, 10);
  download(`reader-hub-backup-${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
}

function csvCell(v: string | number | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCSV(data: RHData) {
  const rows: string[] = [
    [
      "id", "type", "title", "author", "category", "tags", "status",
      "date_added", "start_date", "completed_date", "total_pages",
      "current_page", "progress_pct", "rating", "favorite", "collections",
      "sessions", "total_minutes_read", "total_pages_read", "review",
    ].join(","),
  ];
  const byItem = new Map<string, { sessions: number; minutes: number; pages: number }>();
  for (const s of data.sessions) {
    const cur = byItem.get(s.itemId) ?? { sessions: 0, minutes: 0, pages: 0 };
    cur.sessions++;
    cur.minutes += s.minutes;
    cur.pages += s.pages;
    byItem.set(s.itemId, cur);
  }
  for (const it of data.items) {
    const agg = byItem.get(it.id) ?? { sessions: 0, minutes: 0, pages: 0 };
    const total = it.totalPages && it.totalPages > 0
      ? Math.min(100, Math.round((it.currentPage / it.totalPages) * 100))
      : it.status === "completed" ? 100 : 0;
    rows.push(
      [
        it.id, it.kind, it.title, it.author, it.category ?? "", it.tags.join("; "),
        it.status, it.dateAdded, it.startDate ?? "", it.completedDate ?? "",
        it.totalPages ?? "", it.currentPage, total, it.rating ?? "",
        it.favorite ? "yes" : "no",
        it.collectionIds
          .map((cid) => data.collections.find((c) => c.id === cid)?.name ?? cid)
          .join("; "),
        agg.sessions, agg.minutes, agg.pages, it.review ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const stamp = new Date().toISOString().slice(0, 10);
  download(`reader-hub-reading-records-${stamp}.csv`, rows.join("\n"), "text/csv");
}

export function reportText(data: RHData, itemTitle: string, report: string[]): string {
  return [
    `Reader Hub — Book Report`,
    `${itemTitle}`,
    prettyDate(new Date().toISOString().slice(0, 10)),
    "",
    ...report,
  ].join("\n");
}

export function downloadText(filename: string, text: string) {
  download(filename, text, "text/plain");
}
