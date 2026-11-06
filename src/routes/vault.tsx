import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RotateCcw, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  SourceChip,
  TabBar,
  VAULT_META,
} from "@/components/rh/common";
import { VaultFormDialog } from "@/components/rh/forms";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { dateKey, prettyShort, entriesDaysAgo } from "@/lib/rh/stats";
import { RichContent } from "@/lib/rh/rich";
import { VAULT_KINDS, type ReadingItem, type VaultEntry, type VaultKind } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault — Reader Hub" },
      { name: "description", content: "Highlights, summaries, lessons and reflections worth keeping." },
      { property: "og:title", content: "Vault — Reader Hub" },
      { property: "og:description", content: "Highlights, summaries, lessons and reflections worth keeping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

type Tab = VaultKind | "all";

function VaultPage() {
  const data = useRH();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const memories = useMemo(() => entriesDaysAgo(data, 7), [data]);

  const entries = useMemo(() => {
    let list = [...data.vault].sort((a, b) => b.createdAt - a.createdAt);
    if (tab !== "all") list = list.filter((v) => v.kind === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.content.toLowerCase().includes(q) ||
          v.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data.vault, tab, query]);

  const itemsById = useMemo(() => {
    const m = new Map<string, (typeof data.items)[number]>();
    for (const it of data.items) m.set(it.id, it);
    return m;
  }, [data.items]);

  const tabs = [
    { id: "all" as Tab, label: "All", count: data.vault.length },
    ...VAULT_KINDS.map((k) => ({
      id: k.id as Tab,
      label: VAULT_META[k.id].label,
      count: data.vault.filter((v) => v.kind === k.id).length,
    })),
  ];

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="animate-fade-up">
        <PageHeader
          title="Vault"
          subtitle="The ideas worth keeping, from everything you read."
          action={
            <VaultFormDialog
              trigger={
                <Button size="sm" className="shrink-0">
                  <Plus className="h-4 w-4" /> New
                </Button>
              }
            />
          }
        />
      </div>

      {memories.length > 0 ? (
        <SectionCard title="Memory review" className="mt-4" contentClassName="grid gap-2">
          <p className="text-xs text-muted-foreground">
            Saved about a week ago — a quick look keeps ideas fresh.
          </p>
          {memories.slice(0, 3).map((v) => (
            <MemoryRow key={v.id} entry={v} />
          ))}
        </SectionCard>
      ) : null}

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your vault…"
          className="pl-9"
          aria-label="Search vault entries"
        />
      </div>

      <div className="mt-2">
        <TabBar tabs={tabs} value={tab} onChange={(v) => setTab(v)} />
      </div>

      {entries.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={data.vault.length === 0 ? "Your vault is empty" : "Nothing matches"}
            hint={
              data.vault.length === 0
                ? "Save a highlight, summary or lesson and it will live here."
                : "Try a different filter or search term."
            }
            action={
              <VaultFormDialog
                trigger={
                  <Button size="sm" variant="secondary">
                    <Plus className="h-4 w-4" /> Save your first entry
                  </Button>
                }
              />
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {entries.map((v) => (
            <VaultCard key={v.id} entry={v} item={v.itemId ? itemsById.get(v.itemId) : undefined} />
          ))}
        </div>
      )}
    </main>
  );
}

function MemoryRow({ entry }: { entry: VaultEntry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gold/10 px-3 py-2.5">
      <RotateCcw className="h-4 w-4 shrink-0 text-gold-deep dark:text-gold" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        <p className="text-[11px] text-muted-foreground">{VAULT_META[entry.kind].label}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 text-xs"
        onClick={() => actions.markVaultReviewed(entry.id)}
      >
        Reviewed
      </Button>
    </div>
  );
}

function VaultCard({ entry, item }: { entry: VaultEntry; item?: ReadingItem | undefined }) {
  const meta = VAULT_META[entry.kind];
  const Icon = meta.icon;
  const reviewed = entry.reviewedAt ? dateKey(new Date(entry.reviewedAt)) : null;

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium", meta.tone)}>
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        <button
          type="button"
          onClick={() => actions.toggleVaultFavorite(entry.id)}
          aria-label={entry.favorite ? "Remove favorite" : "Mark favorite"}
          className="rounded-full p-1 transition-colors hover:bg-accent"
        >
          <Star
            className={cn("h-4 w-4", entry.favorite ? "fill-gold-deep text-gold-deep dark:text-gold" : "text-muted-foreground")}
          />
        </button>
      </div>

      <h3 className="mt-2.5 font-display text-[15px] font-semibold leading-snug">{entry.title}</h3>
      <RichContent text={entry.content} className="mt-1 text-sm" />

      {entry.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {entry.tags.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <SourceChip item={item} />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {prettyShort(dateKey(new Date(entry.createdAt)))}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {reviewed ? (
            <span className="text-[11px] text-muted-foreground">Reviewed {reviewed}</span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => actions.markVaultReviewed(entry.id)}
            >
              Mark reviewed
            </Button>
          )}
          <VaultFormDialog
            entry={entry}
            trigger={
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                Edit
              </Button>
            }
          />
        </div>
      </div>

      {entry.reviews.length > 0 ? (
        <div className="mt-2 grid gap-1.5 rounded-xl bg-secondary/50 px-3 py-2">
          {entry.reviews.slice(-2).map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">You:</span> {r.text}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}
