import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Heart, Layers, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, SectionCard, EmptyState, TabBar, Cover, ProgressBar, StatusChip } from "@/components/rh/common";
import { ItemFormDialog, CollectionsSheet } from "@/components/rh/forms";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { READ_STATUSES, type ReadStatus } from "@/lib/rh/types";
import { itemProgress } from "@/lib/rh/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — Reader Hub" },
      { name: "description", content: "Your books, articles, and journals — planned, in progress, and finished." },
      { property: "og:title", content: "Library — Reader Hub" },
      { property: "og:description", content: "Your books, articles, and journals — planned, in progress, and finished." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

type Filter = "all" | ReadStatus | "favorites";

function LibraryPage() {
  const data = useRH();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<Filter, number>();
    map.set("all", data.items.length);
    for (const it of data.items) map.set(it.status, (map.get(it.status) ?? 0) + 1);
    return map;
  }, [data.items]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.items.filter((it) => {
      if (favoritesOnly && !it.favorite) return false;
      if (filter !== "all" && it.status !== filter) return false;
      if (q && !(`${it.title} ${it.author} ${it.tags.join(" ")}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data.items, filter, query, favoritesOnly]);

  const tabs: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: counts.get("all") ?? 0 },
    ...READ_STATUSES.map((s) => ({ id: s.id, label: s.label, count: counts.get(s.id) ?? 0 })),
  ];

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <PageHeader
        title="Library"
        subtitle={`${data.items.length} item${data.items.length === 1 ? "" : "s"} · ${data.items.filter((i) => i.status === "reading").length} in progress`}
        action={
          <ItemFormDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add
              </Button>
            }
          />
        }
      />

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, tag…"
            className="rounded-full pl-9"
            aria-label="Search library"
          />
        </div>
        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="icon"
          className="shrink-0 rounded-full"
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-label="Show favorites only"
          aria-pressed={favoritesOnly}
        >
          <Heart className={cn("h-4 w-4", favoritesOnly && "fill-current")} />
        </Button>
        <CollectionsSheet
          trigger={
            <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label="Manage collections">
              <Layers className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      <TabBar tabs={tabs} value={filter} onChange={setFilter} className="mt-2" />

      {items.length === 0 ? (
        <div className="mt-6">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<LibraryBig className="h-6 w-6" />}
              title="Your library is empty"
              hint="Add the book you're reading now, or one you plan to read next."
              action={
                <ItemFormDialog
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4" /> Add your first item
                    </Button>
                  }
                />
              }
            />
          ) : (
            <EmptyState
              title="Nothing matches"
              hint="Try a different filter or search term."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                    setFavoritesOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
            >
              <Link to="/library/$id" params={{ id: item.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <Cover item={item} className="h-16 w-11 shrink-0" iconClass="h-4 w-4" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.favorite ? <Heart className="h-3 w-3 shrink-0 fill-gold-deep text-gold-deep" /> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{item.author || "Unknown author"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={itemProgress(item)} className="max-w-28 flex-1" />
                    <span className="text-[11px] text-muted-foreground">{itemProgress(item)}%</span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-col items-end gap-1.5">
                <StatusChip status={item.status} />
                <div className="flex">
                  <ItemFormDialog
                    item={item}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${item.title}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <Link
                    to="/library/$id"
                    params={{ id: item.id }}
                    className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Open ${item.title}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Tap the heart on any item's page to mark it a favorite.
      </p>
      <SectionCard className="mt-4" title="Tip">
        <p className="text-sm text-muted-foreground">
          Use collections to group a reading path — like “Q4 focus” or “Research for thesis”. Everything stays on this
          device, even offline.
        </p>
      </SectionCard>
    </main>
  );
}
