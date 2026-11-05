import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Quote as QuoteIcon, Star, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, SectionCard, TabBar } from "@/components/rh/common";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { quoteOfDay, READING_QUOTES } from "@/lib/rh/quotes";
import { dateKey, prettyShort } from "@/lib/rh/stats";
import { todayKey } from "@/lib/rh/db";
import type { QuoteEntry } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes — Reader Hub" },
      { name: "description", content: "Your collected quotes plus a daily dose of reading wisdom." },
      { property: "og:title", content: "Quotes — Reader Hub" },
      { property: "og:description", content: "Your collected quotes plus a daily dose of reading wisdom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuotesPage,
});

type Tab = "mine" | "builtin";

function QuotesPage() {
  const data = useRH();
  const [tab, setTab] = useState<Tab>("mine");
  const [favOnly, setFavOnly] = useState(false);
  const today = todayKey();

  const mine = data.quotes
    .filter((q) => (favOnly ? q.favorite : true))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="animate-fade-up">
        <PageHeader
          title="Quotes"
          subtitle="Words worth remembering."
          action={<QuoteDialog trigger={<Button size="sm" className="shrink-0"><Plus className="h-4 w-4" /> Add</Button>} />}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-transparent p-4 shadow-sm">
        <div className="flex items-center gap-2 text-gold-deep dark:text-gold">
          <QuoteIcon className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Quote of the day</span>
        </div>
        <p className="mt-2 font-display text-[15px] leading-snug">“{quoteOfDay(today).text}”</p>
        <p className="mt-1.5 text-xs text-muted-foreground">— {quoteOfDay(today).author}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <TabBar
          tabs={[
            { id: "mine", label: "My quotes", count: data.quotes.length },
            { id: "builtin", label: "Collection" },
          ]}
          value={tab}
          onChange={(v) => setTab(v)}
        />
        {tab === "mine" ? (
          <button
            type="button"
            onClick={() => setFavOnly((v) => !v)}
            aria-label="Show favorites only"
            aria-pressed={favOnly}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
              favOnly ? "border-transparent bg-gold/25 text-gold-deep dark:text-gold" : "border-border text-muted-foreground",
            )}
          >
            <Star className={cn("h-4 w-4", favOnly && "fill-current")} />
          </button>
        ) : null}
      </div>

      {tab === "mine" ? (
        mine.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={data.quotes.length === 0 ? "No quotes saved yet" : "No favorites yet"}
              hint="Save a passage you loved and it will live here."
              action={
                <QuoteDialog
                  trigger={
                    <Button size="sm" variant="secondary">
                      <Plus className="h-4 w-4" /> Save a quote
                    </Button>
                  }
                />
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {mine.map((q) => (
              <QuoteCard key={q.id} quote={q} />
            ))}
          </div>
        )
      ) : (
        <SectionCard title="Built-in collection" className="mt-4" contentClassName="grid gap-2">
          {READING_QUOTES.map((q, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl bg-secondary/40 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">“{q.text}”</p>
                <p className="mt-1 text-[11px] text-muted-foreground">— {q.author}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                aria-label="Copy quote"
                onClick={() => {
                  void navigator.clipboard.writeText(`“${q.text}” — ${q.author}`);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </SectionCard>
      )}
    </main>
  );
}

function QuoteCard({ quote }: { quote: QuoteEntry }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="font-display text-[15px] leading-snug">“{quote.text}”</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{quote.author ? `— ${quote.author}` : "Unknown author"}</p>
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
        <span className="text-[11px] text-muted-foreground">{prettyShort(dateKey(new Date(quote.createdAt)))}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => actions.toggleQuoteFavorite(quote.id)}
            aria-label={quote.favorite ? "Remove favorite" : "Mark favorite"}
            className="rounded-full p-1.5 transition-colors hover:bg-accent"
          >
            <Star className={cn("h-4 w-4", quote.favorite ? "fill-gold-deep text-gold-deep dark:text-gold" : "text-muted-foreground")} />
          </button>
          <button
            type="button"
            aria-label="Copy quote"
            onClick={() => {
              void navigator.clipboard.writeText(`“${quote.text}”${quote.author ? ` — ${quote.author}` : ""}`);
              toast.success("Copied");
            }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Copy className="h-4 w-4" />
          </button>
          <QuoteDialog
            quote={quote}
            trigger={
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                Edit
              </Button>
            }
          />
          <button
            type="button"
            aria-label="Delete quote"
            onClick={() => {
              actions.deleteQuote(quote.id);
              toast.success("Quote deleted");
            }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function QuoteDialog({ trigger, quote }: { trigger: React.ReactNode; quote?: QuoteEntry }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(quote?.text ?? "");
  const [author, setAuthor] = useState(quote?.author ?? "");

  const save = () => {
    if (!text.trim()) {
      toast.error("Write the quote first.");
      return;
    }
    actions.saveQuote({
      ...(quote?.id ? { id: quote.id } : {}),
      text: text.trim(),
      author: author.trim() || undefined,
      ...(quote ? { favorite: quote.favorite } : {}),
    });
    toast.success(quote ? "Quote updated" : "Quote saved");
    if (!quote) {
      setText("");
      setAuthor("");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{quote ? "Edit quote" : "Save a quote"}</DialogTitle>
          <DialogDescription>A passage worth remembering.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="quote-text">Quote</Label>
            <Textarea
              id="quote-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Books are a uniquely portable magic."
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="quote-author">Author (optional)</Label>
            <Input
              id="quote-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Stephen King"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>{quote ? "Save changes" : "Save quote"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
