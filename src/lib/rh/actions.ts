import { mutate, uid, deleteImage } from "./db";
import { dateKey } from "./stats";
import type {
  ActiveTimer,
  Challenge,
  Collection,
  ContentKind,
  DiscoveryEntry,
  DiscoveryKind,
  QuoteEntry,
  ReadStatus,
  ReadingItem,
  ReadingSession,
  ReflectionDoc,
  Settings,
  VaultEntry,
  VaultKind,
} from "./types";

// All data mutations in one place. Every call persists automatically and
// triggers re-renders in components using useRH().

function withAutoStatus(item: ReadingItem): ReadingItem {
  if (
    item.totalPages &&
    item.totalPages > 0 &&
    item.currentPage >= item.totalPages &&
    (item.status === "reading" || item.status === "paused" || item.status === "want")
  ) {
    return { ...item, status: "completed", completedDate: item.completedDate || dateKey() };
  }
  return item;
}

export const actions = {
  // ----- reading items -----
  saveItem(
    input: Partial<ReadingItem> & { title: string; kind: ContentKind },
  ): ReadingItem {
    let saved!: ReadingItem;
    mutate((d) => {
      const now = dateKey();
      const existing = input.id ? d.items.find((i) => i.id === input.id) : undefined;
      if (existing) {
        Object.assign(existing, { ...input, id: existing.id });
        Object.assign(existing, withAutoStatus(existing));
        saved = existing;
      } else {
        const item: ReadingItem = {
          id: uid("item"),
          kind: input.kind,
          title: input.title,
          author: input.author ?? "",
          coverId: input.coverId,
          description: input.description ?? "",
          category: input.category ?? "",
          tags: input.tags ?? [],
          dateAdded: input.dateAdded ?? now,
          startDate: input.startDate ?? (input.status === "reading" ? now : undefined),
          completedDate: input.completedDate,
          status: input.status ?? "want",
          totalPages: input.totalPages,
          currentPage: input.currentPage ?? 0,
          rating: input.rating,
          review: input.review ?? "",
          favorite: input.favorite ?? false,
          collectionIds: input.collectionIds ?? [],
        };
        d.items.unshift(item);
        saved = item;
      }
    });
    return saved;
  },

  deleteItem(id: string) {
    mutate((d) => {
      const item = d.items.find((i) => i.id === id);
      if (item?.coverId) void deleteImage(item.coverId);
      d.items = d.items.filter((i) => i.id !== id);
      d.sessions = d.sessions.filter((s) => s.itemId !== id);
      d.vault = d.vault.map((v) => (v.itemId === id ? { ...v, itemId: undefined } : v));
      if (d.timer?.itemId === id) d.timer = null;
    });
  },

  toggleItemFavorite(id: string) {
    mutate((d) => {
      const it = d.items.find((i) => i.id === id);
      if (it) it.favorite = !it.favorite;
    });
  },

  setItemStatus(id: string, status: ReadStatus) {
    mutate((d) => {
      const it = d.items.find((i) => i.id === id);
      if (!it) return;
      it.status = status;
      if (status === "reading" && !it.startDate) it.startDate = dateKey();
      if (status === "completed" && !it.completedDate) it.completedDate = dateKey();
      if (status !== "completed") it.completedDate = undefined;
    });
  },

  setCurrentPage(id: string, page: number) {
    mutate((d) => {
      const it = d.items.find((i) => i.id === id);
      if (!it) return;
      it.currentPage = Math.max(0, page);
      Object.assign(it, withAutoStatus(it));
      if (it.status === "want" && it.currentPage > 0) {
        it.status = "reading";
        if (!it.startDate) it.startDate = dateKey();
      }
    });
  },

  // ----- sessions -----
  addSession(input: Omit<ReadingSession, "id">): ReadingSession {
    let saved!: ReadingSession;
    mutate((d) => {
      const session: ReadingSession = { id: uid("sess"), ...input };
      d.sessions.push(session);
      const it = d.items.find((i) => i.id === input.itemId);
      if (it) {
        if (input.pages > 0) it.currentPage += input.pages;
        if (it.status === "want") {
          it.status = "reading";
          if (!it.startDate) it.startDate = dateKey();
        }
        Object.assign(it, withAutoStatus(it));
      }
      saved = session;
    });
    return saved;
  },

  deleteSession(id: string) {
    mutate((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== id);
    });
  },

  // ----- timer -----
  startTimer(itemId: string, goalMin?: number) {
    const timer: ActiveTimer = {
      itemId,
      startedAt: Date.now(),
      accumulatedMin: 0,
      running: true,
      goalMin,
    };
    mutate((d) => {
      d.timer = timer;
    });
  },

  setTimer(patch: Partial<ActiveTimer>) {
    mutate((d) => {
      if (d.timer) d.timer = { ...d.timer, ...patch };
    });
  },

  pauseTimer() {
    mutate((d) => {
      if (d.timer?.running) {
        d.timer.accumulatedMin += (Date.now() - d.timer.startedAt) / 60000;
        d.timer.startedAt = Date.now();
        d.timer.running = false;
      }
    });
  },

  resumeTimer() {
    mutate((d) => {
      if (d.timer && !d.timer.running) {
        d.timer.startedAt = Date.now();
        d.timer.running = true;
      }
    });
  },

  clearTimer() {
    mutate((d) => {
      d.timer = null;
    });
  },

  // ----- vault -----
  saveVault(
    input: Partial<VaultEntry> & { title: string; content: string; kind: VaultKind },
  ): VaultEntry {
    let saved!: VaultEntry;
    mutate((d) => {
      const existing = input.id ? d.vault.find((v) => v.id === input.id) : undefined;
      if (existing) {
        Object.assign(existing, {
          ...input,
          id: existing.id,
          updatedAt: Date.now(),
        });
        saved = existing;
      } else {
        const entry: VaultEntry = {
          id: uid("vault"),
          kind: input.kind,
          title: input.title,
          content: input.content,
          itemId: input.itemId || undefined,
          tags: input.tags ?? [],
          favorite: input.favorite ?? false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          reviews: [],
        };
        d.vault.unshift(entry);
        saved = entry;
      }
    });
    return saved;
  },

  deleteVault(id: string) {
    mutate((d) => {
      d.vault = d.vault.filter((v) => v.id !== id);
    });
  },

  toggleVaultFavorite(id: string) {
    mutate((d) => {
      const v = d.vault.find((e) => e.id === id);
      if (v) v.favorite = !v.favorite;
    });
  },

  markVaultReviewed(id: string) {
    mutate((d) => {
      const v = d.vault.find((e) => e.id === id);
      if (v) v.reviewedAt = Date.now();
    });
  },

  addVaultReview(id: string, text: string) {
    mutate((d) => {
      const v = d.vault.find((e) => e.id === id);
      if (v && text.trim()) {
        v.reviews.push({ at: Date.now(), text: text.trim() });
        v.updatedAt = Date.now();
      }
    });
  },

  // ----- reflections -----
  saveReflection(itemId: string, answers: Record<string, string>) {
    mutate((d) => {
      const existing = d.reflections.find((r) => r.itemId === itemId);
      if (existing) {
        existing.answers = { ...answers };
        existing.updatedAt = Date.now();
      } else {
        const doc: ReflectionDoc = { id: uid("refl"), itemId, answers: { ...answers }, updatedAt: Date.now() };
        d.reflections.push(doc);
      }
    });
  },

  // ----- collections -----
  saveCollection(input: Partial<Collection> & { name: string }): Collection {
    let saved!: Collection;
    mutate((d) => {
      const existing = input.id ? d.collections.find((c) => c.id === input.id) : undefined;
      if (existing) {
        Object.assign(existing, { name: input.name, description: input.description });
        saved = existing;
      } else {
        const col: Collection = { id: uid("col"), name: input.name, description: input.description, createdAt: Date.now() };
        d.collections.push(col);
        saved = col;
      }
    });
    return saved;
  },

  deleteCollection(id: string) {
    mutate((d) => {
      d.collections = d.collections.filter((c) => c.id !== id);
      for (const it of d.items) {
        it.collectionIds = it.collectionIds.filter((cid) => cid !== id);
      }
    });
  },

  toggleItemCollection(itemId: string, collectionId: string) {
    mutate((d) => {
      const it = d.items.find((i) => i.id === itemId);
      if (!it) return;
      it.collectionIds = it.collectionIds.includes(collectionId)
        ? it.collectionIds.filter((c) => c !== collectionId)
        : [...it.collectionIds, collectionId];
    });
  },

  // ----- quotes -----
  saveQuote(input: Partial<QuoteEntry> & { text: string }): QuoteEntry {
    let saved!: QuoteEntry;
    mutate((d) => {
      if (input.id) {
        const q = d.quotes.find((x) => x.id === input.id);
        if (q) Object.assign(q, { text: input.text, author: input.author });
        if (q) saved = q;
      } else {
        const q: QuoteEntry = { id: uid("quote"), text: input.text, author: input.author, createdAt: Date.now(), favorite: false };
        d.quotes.unshift(q);
        saved = q;
      }
    });
    return saved;
  },

  deleteQuote(id: string) {
    mutate((d) => {
      d.quotes = d.quotes.filter((q) => q.id !== id);
    });
  },

  toggleQuoteFavorite(id: string) {
    mutate((d) => {
      const q = d.quotes.find((x) => x.id === id);
      if (q) q.favorite = !q.favorite;
    });
  },

  // ----- discoveries -----
  saveDiscovery(input: Partial<DiscoveryEntry> & { text: string; kind: DiscoveryKind }) {
    mutate((d) => {
      if (input.id) {
        const e = d.discoveries.find((x) => x.id === input.id);
        if (e) Object.assign(e, { text: input.text, kind: input.kind, itemId: input.itemId || undefined });
      } else {
        const e: DiscoveryEntry = { id: uid("disc"), kind: input.kind, text: input.text, itemId: input.itemId || undefined, createdAt: Date.now() };
        d.discoveries.unshift(e);
      }
    });
  },

  deleteDiscovery(id: string) {
    mutate((d) => {
      d.discoveries = d.discoveries.filter((x) => x.id !== id);
    });
  },

  // ----- challenges -----
  saveChallenge(input: Partial<Challenge> & { name: string; unit: Challenge["unit"]; target: number }) {
    mutate((d) => {
      if (input.id) {
        const c = d.challenges.find((x) => x.id === input.id);
        if (c) Object.assign(c, { name: input.name, unit: input.unit, target: input.target, deadline: input.deadline });
      } else {
        const c: Challenge = { id: uid("chal"), name: input.name, unit: input.unit, target: input.target, deadline: input.deadline, createdAt: Date.now(), done: false };
        d.challenges.push(c);
      }
    });
  },

  toggleChallengeDone(id: string) {
    mutate((d) => {
      const c = d.challenges.find((x) => x.id === id);
      if (c) c.done = !c.done;
    });
  },

  deleteChallenge(id: string) {
    mutate((d) => {
      d.challenges = d.challenges.filter((c) => c.id !== id);
    });
  },

  // ----- checklist -----
  toggleChecklist(date: string, label: string) {
    mutate((d) => {
      const done = d.checklist[date] ?? [];
      d.checklist[date] = done.includes(label)
        ? done.filter((l) => l !== label)
        : [...done, label];
    });
  },

  // ----- settings -----
  updateSettings(patch: Partial<Settings>) {
    mutate((d) => {
      d.settings = { ...d.settings, ...patch };
    });
  },
};
