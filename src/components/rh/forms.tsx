import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bold, Heading2, Italic, List, Quote as QuoteIcon, Trash2 } from "lucide-react";
import { fileToCoverDataUrl, putImage } from "@/lib/rh/db";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import {
  CONTENT_KINDS,
  READ_STATUSES,
  VAULT_KINDS,
  type ContentKind,
  type ReadingItem,
  type ReadStatus,
  type VaultEntry,
  type VaultKind,
} from "@/lib/rh/types";
import { VAULT_META } from "@/components/rh/common";
import { cn } from "@/lib/utils";

// ---------- reading item form (create / edit) ----------

export function ItemFormDialog({
  trigger,
  item,
  defaultStatus,
}: {
  trigger: ReactNode;
  item?: ReadingItem;
  defaultStatus?: ReadStatus;
}) {
  const data = useRH();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ContentKind>(item?.kind ?? "book");
  const [title, setTitle] = useState(item?.title ?? "");
  const [author, setAuthor] = useState(item?.author ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [tags, setTags] = useState(item?.tags.join(", ") ?? "");
  const [totalPages, setTotalPages] = useState(item?.totalPages ? String(item.totalPages) : "");
  const [status, setStatus] = useState<ReadStatus>(item?.status ?? defaultStatus ?? "want");
  const [coverId, setCoverId] = useState<string | undefined>(item?.coverId);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setKind(item?.kind ?? "book");
    setTitle(item?.title ?? "");
    setAuthor(item?.author ?? "");
    setCategory(item?.category ?? "");
    setTags(item?.tags.join(", ") ?? "");
    setTotalPages(item?.totalPages ? String(item.totalPages) : "");
    setStatus(item?.status ?? defaultStatus ?? "want");
    setCoverId(item?.coverId);
    setCoverPreview(null);
  };

  const pickCover = async (file: File) => {
    try {
      const dataUrl = await fileToCoverDataUrl(file);
      setCoverPreview(dataUrl);
      const id = await putImage(dataUrl);
      setCoverId(id);
    } catch {
      toast.error("Could not read that image.");
    }
  };

  const save = () => {
    if (!title.trim()) {
      toast.error("Give it a title first.");
      return;
    }
    setSaving(true);
    actions.saveItem({
      id: item?.id,
      kind,
      title: title.trim(),
      author: author.trim(),
      category: category || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      totalPages: totalPages ? Number(totalPages) : undefined,
      status,
      coverId,
      currentPage: item?.currentPage ?? 0,
      dateAdded: item?.dateAdded,
      startDate: item?.startDate,
      completedDate: item?.completedDate,
      rating: item?.rating,
      review: item?.review,
      favorite: item?.favorite ?? false,
      collectionIds: item?.collectionIds ?? [],
    });
    toast.success(item ? "Item updated" : "Added to your library");
    setSaving(false);
    setOpen(false);
    if (!item) reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{item ? "Edit item" : "Add to library"}</DialogTitle>
          <DialogDescription>
            {item ? "Update the details of this item." : "What are you planning to read?"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-dashed border-border bg-muted/50 transition-colors hover:bg-muted"
              aria-label="Choose cover image"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground">Cover</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickCover(f);
                e.target.value = "";
              }}
            />
            <div className="grid flex-1 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="item-kind">Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as ContentKind)}>
                  <SelectTrigger id="item-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_KINDS.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="item-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ReadStatus)}>
                  <SelectTrigger id="item-status" className="w-full">
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
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Atomic Habits"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-author">Author</Label>
            <Input
              id="item-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="James Clear"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {data.settings.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-pages">Total pages</Label>
              <Input
                id="item-pages"
                type="number"
                min={0}
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                placeholder="320"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="item-tags">Tags</Label>
            <Input
              id="item-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="habits, mindset"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {item ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- reading session log ----------

export function SessionDialog({
  trigger,
  itemId,
  defaultMinutes,
}: {
  trigger: ReactNode;
  itemId: string;
  defaultMinutes?: number;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(defaultMinutes ? String(Math.round(defaultMinutes)) : "");
  const [pages, setPages] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    const m = Number(minutes) || 0;
    const p = Number(pages) || 0;
    if (m <= 0 && p <= 0) {
      toast.error("Enter minutes or pages first.");
      return;
    }
    actions.addSession({
      itemId,
      date: dateKey(),
      minutes: m,
      pages: p,
      note: note.trim() || undefined,
      source: "manual",
    });
    toast.success("Session logged");
    setMinutes("");
    setPages("");
    setNote("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Log a session</DialogTitle>
          <DialogDescription>How much did you read?</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="sess-min">Minutes</Label>
            <Input
              id="sess-min"
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="25"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sess-pages">Pages</Label>
            <Input
              id="sess-pages"
              type="number"
              min={0}
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="12"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sess-note">Note (optional)</Label>
          <Textarea
            id="sess-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What stood out?"
            rows={2}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Log session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- vault entry form ----------

const wrapSelection = (el: HTMLTextAreaElement, before: string, after = "") => {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const value = el.value;
  const selected = value.slice(start, end);
  el.value = value.slice(0, start) + before + selected + after + value.slice(end);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + before.length, end + before.length + selected.length);
  });
};

export function VaultFormDialog({
  trigger,
  entry,
}: {
  trigger: ReactNode;
  entry?: VaultEntry;
}) {
  const data = useRH();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<VaultKind>(entry?.kind ?? "highlight");
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [itemId, setItemId] = useState(entry?.itemId ?? "");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    setKind(entry?.kind ?? "highlight");
    setTitle(entry?.title ?? "");
    setContent(entry?.content ?? "");
    setItemId(entry?.itemId ?? "");
    setTags(entry?.tags.join(", ") ?? "");
  };

  const insert = (before: string, after = "") => {
    const el = contentRef.current;
    if (el) wrapSelection(el, before, after);
  };

  const save = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Add a title and some content.");
      return;
    }
    actions.saveVault({
      id: entry?.id,
      kind,
      title: title.trim(),
      content: content.trim(),
      itemId: itemId || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      favorite: entry?.favorite ?? false,
      reviews: entry?.reviews ?? [],
      reviewedAt: entry?.reviewedAt,
    });
    toast.success(entry ? "Entry updated" : "Saved to your Vault");
    setOpen(false);
    if (!entry) reset();
  };

  const tools = [
    { icon: Bold, label: "Bold", before: "**", after: "**" },
    { icon: Italic, label: "Italic", before: "*", after: "*" },
    { icon: Heading2, label: "Heading", before: "## ", after: "" },
    { icon: List, label: "List", before: "- ", after: "" },
    { icon: QuoteIcon, label: "Quote", before: "> ", after: "" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{entry ? "Edit entry" : "New vault entry"}</DialogTitle>
          <DialogDescription>Save the ideas worth keeping.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-1.5">
            {VAULT_KINDS.map((k) => {
              const meta = VAULT_META[k.id];
              const Icon = meta.icon;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    kind === k.id
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="vault-title">Title</Label>
            <Input
              id="vault-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The 1% rule"
            />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="vault-content">Content</Label>
              <div className="flex gap-0.5">
                {tools.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    aria-label={t.label}
                    onClick={() => insert(t.before, t.after)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <t.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              id="vault-content"
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="text-note-md"
              placeholder={"## Key idea\nSmall improvements compound.\n\n> Quote worth remembering"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>From item</Label>
              <Select value={itemId || "none"} onValueChange={(v) => setItemId(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {data.items.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.title.length > 24 ? it.title.slice(0, 24) + "…" : it.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vault-tags">Tags</Label>
              <Input
                id="vault-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="habits, mindset"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{entry ? "Save changes" : "Save entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- collections manager ----------

export function CollectionsSheet({ trigger }: { trigger: ReactNode }) {
  const data = useRH();
  const [name, setName] = useState("");

  const counts = new Map<string, number>();
  for (const it of data.items) {
    for (const cid of it.collectionIds) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Collections</DialogTitle>
          <DialogDescription>Group your reading into collections.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {data.collections.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No collections yet.</p>
          ) : (
            data.collections.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{counts.get(c.id) ?? 0} items</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    actions.deleteCollection(c.id);
                    toast.success("Collection deleted");
                  }}
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New collection name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                actions.saveCollection({ name: name.trim() });
                setName("");
              }
            }}
          />
          <Button
            disabled={!name.trim()}
            onClick={() => {
              actions.saveCollection({ name: name.trim() });
              toast.success("Collection created");
              setName("");
            }}
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
