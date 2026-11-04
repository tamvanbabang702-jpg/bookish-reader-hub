import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Heart,
  Pencil,
  Play,
  Plus,
  Timer as TimerIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  Cover,
  ProgressBar,
  Stars,
  StatusChip,
  KindIcon,
  ConfirmDialog,
  SourceChip,
} from "@/components/rh/common";
import { ItemFormDialog, SessionDialog } from "@/components/rh/forms";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { deleteImage } from "@/lib/rh/db";
import { READ_STATUSES, REFLECTION_QUESTIONS, type ReadStatus } from "@/lib/rh/types";
import { formatMinutes, itemProgress, prettyShort } from "@/lib/rh/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library/$id")({
  head: () => ({
    meta: [
      { title: "Item — Reader Hub" },
      { name: "description", content: "Progress, sessions, reflections, and notes for this item." },
      { property: "og:title", content: "Item — Reader Hub" },
      { property: "og:description", content: "Progress, sessions, reflections, and notes for this item." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { id } = Route.useParams();
  const data = useRH();
  const navigate = useNavigate();
  const item = data.items.find((i) => i.id === id);

  const [reflection, setReflection] = useState<Record<string, string>>({});
  const [review, setReview] = useState("");
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    const doc = data.reflections.find((r) => r.itemId === id);
    setReflection(doc ? { ...doc.answers } : {});
  }, [data.reflections, id]);

  useEffect(() => {
    setReview(item?.review ?? "");
    setPageInput(item ? String(item.currentPage) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!item) {
    return (
      <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
        <EmptyState
          title="Item not found"
          hint="It may have been deleted. Head back to your library."
          action={<Button onClick={() => navigate({ to: "/library" })}>Go to library</Button>}
        />
      </main>
    );
  }

  const sessions = data.sessions
    .filter((s) => s.itemId === item.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
  const itemMinutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const vaultEntries = data.vault.filter((v) => v.itemId === item.id);
  const reflDoc = data.reflections.find((r) => r.itemId === item.id);

  const saveReview = () => {
    actions.saveItem({ id: item.id, kind: item.kind, title: item.title, review: review.trim() });
    toast.success("Review saved");
  };

  const saveReflection = () => {
    actions.saveReflection(item.id, reflection);
    toast.success("Reflection saved");
  };

  const applyPage = () => {
    const p = Number(pageInput);
    if (Number.isNaN(p) || p < 0) {
      toast.error("Enter a valid page number.");
      return;
    }
    actions.setCurrentPage(item.id, Math.round(p));
    toast.success("Progress updated");
  };

  const removeItem = () => {
    if (item.coverId) void deleteImage(item.coverId);
    actions.deleteItem(item.id);
    toast.success("Removed from library");
    void navigate({ to: "/library" });
  };

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: "/library" })}>
          <ArrowLeft className="h-4 w-4" /> Library
        </Button>
        <div className="flex gap-1">
          <ItemFormDialog
            item={item}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Edit item">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Delete item">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Delete this item?"
            description={`“${item.title}” and its sessions will be removed. Vault entries are kept.`}
            onConfirm={removeItem}
          />
        </div>
      </div>

      {/* header */}
      <div className="mt-2 flex gap-4">
        <Cover item={item} className="h-40 w-27 shrink-0" iconClass="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <KindIcon kind={item.kind} className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{item.category || "Uncategorized"}</span>
              </div>
              <h1 className="mt-0.5 font-display text-xl font-semibold leading-tight">{item.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.author || "Unknown author"}</p>
            </div>
            <button
              type="button"
              onClick={() => actions.toggleItemFavorite(item.id)}
              aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                "rounded-full p-2 transition-colors hover:bg-accent",
                item.favorite ? "text-gold-deep" : "text-muted-foreground",
              )}
            >
              <Heart className={cn("h-5 w-5", item.favorite && "fill-current")} />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusChip status={item.status} />
            <Stars
              value={item.rating ?? 0}
              onChange={(v) =>
                actions.saveItem({ id: item.id, kind: item.kind, title: item.title, rating: v })
              }
            />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <ProgressBar value={itemProgress(item)} className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {item.totalPages ? `${item.currentPage}/${item.totalPages}` : `${itemProgress(item)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <SessionDialog
          itemId={item.id}
          trigger={
            <Button variant="secondary" className="w-full">
              <Plus className="h-4 w-4" /> Log
            </Button>
          }
        />
        <Button variant="secondary" className="w-full" onClick={() => navigate({ to: "/reader" })}>
          <TimerIcon className="h-4 w-4" /> Read
        </Button>
        <Select
          value={item.status}
          onValueChange={(v) => {
            actions.setItemStatus(item.id, v as ReadStatus);
            toast.success("Status updated");
          }}
        >
          <SelectTrigger className="w-full" aria-label="Change status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {READ_STATUSES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* progress */}
      <SectionCard title="Progress" className="mt-4">
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="page-current">Current page</Label>
            <Input
              id="page-current"
              type="number"
              min={0}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
            />
          </div>
          <Button onClick={applyPage}>Update</Button>
        </div>
        {item.totalPages ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {Math.max(0, item.totalPages - item.currentPage)} pages left · {formatMinutes(itemMinutes)} read so far
          </p>
        ) : null}
      </SectionCard>

      {/* sessions */}
      <SectionCard
        title="Reading sessions"
        className="mt-4"
        action={<span className="text-xs text-muted-foreground">{sessions.length} logged</span>}
      >
        {sessions.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No sessions yet. Log one or start the timer from the Read tab.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatMinutes(s.minutes)}{s.pages ? ` · ${s.pages} pages` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {prettyShort(s.date)}{s.note ? ` — ${s.note}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label="Delete session"
                  onClick={() => actions.deleteSession(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* collections */}
      <SectionCard title="Collections" className="mt-4">
        {data.collections.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Create collections from the Library page to organize your reading.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.collections.map((c) => {
              const on = item.collectionIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => actions.toggleItemCollection(item.id, c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  {on ? <Check className="mr-1 inline h-3 w-3" /> : null}
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* linked vault entries */}
      <SectionCard
        title="From your Vault"
        className="mt-4"
        action={
          <Link to="/vault" className="text-xs font-medium text-gold-deep hover:underline dark:text-gold">
            Open Vault
          </Link>
        }
      >
        {vaultEntries.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Highlights and notes you link to this item will appear here.
          </p>
        ) : (
          <div className="grid gap-2">
            {vaultEntries.map((v) => (
              <div key={v.id} className="rounded-xl bg-secondary/50 px-3 py-2">
                <p className="truncate text-sm font-medium">{v.title}</p>
                <p className="truncate text-xs text-muted-foreground">{v.content.replace(/[#*>]/g, "").slice(0, 80)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* reflection */}
      <SectionCard
        title="Guided reflection"
        className="mt-4"
        action={reflDoc ? <span className="text-xs text-muted-foreground">Saved</span> : null}
      >
        <div className="grid gap-3">
          {REFLECTION_QUESTIONS.map((q, i) => (
            <div key={q} className="grid gap-1">
              <Label htmlFor={`refl-${i}`} className="text-xs font-medium text-muted-foreground">
                {q}
              </Label>
              <Textarea
                id={`refl-${i}`}
                rows={2}
                value={reflection[q] ?? ""}
                onChange={(e) => setReflection((prev) => ({ ...prev, [q]: e.target.value }))}
                placeholder="Your thoughts…"
              />
            </div>
          ))}
          <Button onClick={saveReflection}>Save reflection</Button>
        </div>
      </SectionCard>

      {/* review */}
      <SectionCard title="My review" className="mt-4">
        <div className="grid gap-2">
          <Stars
            value={item.rating ?? 0}
            size="h-5 w-5"
            onChange={(v) => actions.saveItem({ id: item.id, kind: item.kind, title: item.title, rating: v })}
          />
          <Textarea
            rows={4}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="What did you think? Would you recommend it?"
          />
          <Button onClick={saveReview}>Save review</Button>
        </div>
      </SectionCard>

    </main>
  );
}
