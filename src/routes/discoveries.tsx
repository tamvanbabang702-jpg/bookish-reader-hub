import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, SourceChip, TabBar } from "@/components/rh/common";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { dateKey, prettyShort } from "@/lib/rh/stats";
import { DISCOVERY_KINDS, type DiscoveryEntry, type DiscoveryKind, type ReadingItem } from "@/lib/rh/types";

export const Route = createFileRoute("/discoveries")({
  head: () => ({
    meta: [
      { title: "Discoveries — Reader Hub" },
      { name: "description", content: "Concepts, vocabulary, people and questions you discovered while reading." },
      { property: "og:title", content: "Discoveries — Reader Hub" },
      { property: "og:description", content: "Concepts, vocabulary, people and questions you discovered while reading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoveriesPage,
});

type Tab = DiscoveryKind | "all";

function DiscoveriesPage() {
  const data = useRH();
  const [tab, setTab] = useState<Tab>("all");

  const itemsById = new Map(data.items.map((it) => [it.id, it]));
  const list = data.discoveries
    .filter((d) => (tab === "all" ? true : d.kind === tab))
    .sort((a, b) => b.createdAt - a.createdAt);

  const tabs = [
    { id: "all" as Tab, label: "All", count: data.discoveries.length },
    ...DISCOVERY_KINDS.map((k) => ({
      id: k.id as Tab,
      label: k.label,
      count: data.discoveries.filter((d) => d.kind === k.id).length,
    })),
  ];

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="animate-fade-up">
        <PageHeader
          title="Discoveries"
          subtitle="Ideas, words, people and questions worth chasing."
          action={<DiscoveryDialog trigger={<Button size="sm" className="shrink-0"><Plus className="h-4 w-4" /> Add</Button>} />}
        />
      </div>

      <div className="mt-3">
        <TabBar tabs={tabs} value={tab} onChange={(v) => setTab(v)} />
      </div>

      {list.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={data.discoveries.length === 0 ? "No discoveries yet" : "Nothing in this category"}
            hint="Jot down an interesting concept, a new word, or a question to investigate."
            action={
              <DiscoveryDialog
                trigger={
                  <Button size="sm" variant="secondary">
                    <Plus className="h-4 w-4" /> Log a discovery
                  </Button>
                }
              />
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {list.map((d) => (
            <DiscoveryCard key={d.id} entry={d} item={d.itemId ? itemsById.get(d.itemId) : undefined} />
          ))}
        </div>
      )}
    </main>
  );
}

function DiscoveryCard({ entry, item }: { entry: DiscoveryEntry; item?: ReadingItem | undefined }) {
  const label = DISCOVERY_KINDS.find((k) => k.id === entry.kind)?.label ?? entry.kind;
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-medium text-gold-deep dark:text-gold">
          {label}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Delete discovery"
          onClick={() => {
            actions.deleteDiscovery(entry.id);
            toast.success("Discovery removed");
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="mt-2 text-sm leading-relaxed">{entry.text}</p>
      <div className="mt-2.5 flex items-center gap-2 border-t border-border/60 pt-2.5">
        <SourceChip item={item} />
        <span className="text-[11px] text-muted-foreground">{prettyShort(dateKey(new Date(entry.createdAt)))}</span>
      </div>
    </article>
  );
}

function DiscoveryDialog({ trigger }: { trigger: React.ReactNode }) {
  const data = useRH();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DiscoveryKind>("concept");
  const [text, setText] = useState("");
  const [itemId, setItemId] = useState("");

  const save = () => {
    if (!text.trim()) {
      toast.error("Write the discovery first.");
      return;
    }
    actions.saveDiscovery({ kind, text: text.trim(), itemId: itemId || undefined });
    toast.success("Discovery saved");
    setText("");
    setItemId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">New discovery</DialogTitle>
          <DialogDescription>What did you stumble upon?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as DiscoveryKind)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCOVERY_KINDS.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="disc-text">Discovery</Label>
            <Textarea
              id="disc-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="A concept, word, person, theory, question or project idea…"
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>From item (optional)</Label>
            <Select value={itemId || "none"} onValueChange={(v) => setItemId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {data.items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.title.length > 26 ? it.title.slice(0, 26) + "…" : it.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save discovery</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
