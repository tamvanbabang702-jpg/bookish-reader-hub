import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check, Pencil, Plus, Target, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog, EmptyState, PageHeader, ProgressBar } from "@/components/rh/common";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { challengeProgress, prettyShort } from "@/lib/rh/stats";
import type { Challenge, ChallengeUnit } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — Reader Hub" },
      { name: "description", content: "Set reading goals and watch your progress add up." },
      { property: "og:title", content: "Challenges — Reader Hub" },
      { property: "og:description", content: "Set reading goals and watch your progress add up." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChallengesPage,
});

const UNITS: { id: ChallengeUnit; label: string }[] = [
  { id: "books", label: "Books finished (this year)" },
  { id: "minutes", label: "Minutes read (all time)" },
  { id: "pages", label: "Pages read (all time)" },
  { id: "entries", label: "Vault entries (all time)" },
];

function unitLabel(u: ChallengeUnit): string {
  return UNITS.find((x) => x.id === u)?.label ?? u;
}

function unitShort(u: ChallengeUnit): string {
  return u === "books" ? "books" : u === "minutes" ? "min" : u === "pages" ? "pages" : "entries";
}

function ChallengesPage() {
  const data = useRH();
  const list = [...data.challenges].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="animate-fade-up">
        <PageHeader
          title="Challenges"
          subtitle="Set a target and let the progress bar cheer you on."
          action={<ChallengeDialog trigger={<Button size="sm" className="shrink-0"><Plus className="h-4 w-4" /> New</Button>} />}
        />
      </div>

      {list.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="No challenges yet"
            hint="Try “12 books this year” or “1,000 minutes of reading”."
            action={
              <ChallengeDialog
                trigger={
                  <Button size="sm" variant="secondary">
                    <Plus className="h-4 w-4" /> Start a challenge
                  </Button>
                }
              />
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {list.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </main>
  );
}

function ChallengeCard({ challenge: c }: { challenge: Challenge }) {
  const { value, pct } = challengeProgress(useRH(), c);
  const reached = pct >= 100 || c.done;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        reached ? "border-gold/50" : "border-border/70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[15px] font-semibold">{c.name}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{unitLabel(c.unit)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={c.done ? "Mark as not done" : "Mark as done"}
            onClick={() => actions.toggleChallengeDone(c.id)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
              c.done
                ? "border-transparent bg-primary text-primary-foreground dark:bg-gold dark:text-foreground"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <ChallengeDialog
            challenge={c}
            trigger={
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Edit challenge">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <ConfirmDialog
            title="Delete this challenge?"
            description="Your reading data is not affected."
            trigger={
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Delete challenge">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
            onConfirm={() => {
              actions.deleteChallenge(c.id);
              toast.success("Challenge deleted");
            }}
          />
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={pct} />
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <b className="text-foreground">{value.toLocaleString()}</b> / {c.target.toLocaleString()} {unitShort(c.unit)}
          </span>
          {c.deadline ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> by {prettyShort(c.deadline)}
            </span>
          ) : reached ? (
            <span className="font-medium text-gold-deep dark:text-gold">Completed!</span>
          ) : (
            <span className="text-muted-foreground">{pct}%</span>
          )}
        </div>
      </div>
    </article>
  );
}

function ChallengeDialog({ trigger, challenge }: { trigger: React.ReactNode; challenge?: Challenge }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(challenge?.name ?? "");
  const [unit, setUnit] = useState<ChallengeUnit>(challenge?.unit ?? "books");
  const [target, setTarget] = useState(challenge?.target ? String(challenge.target) : "");
  const [deadline, setDeadline] = useState(challenge?.deadline ?? "");

  const save = () => {
    const t = Number(target);
    if (!name.trim() || !t || t <= 0) {
      toast.error("Give it a name and a target above zero.");
      return;
    }
    actions.saveChallenge({
      ...(challenge?.id ? { id: challenge.id } : {}),
      name: name.trim(),
      unit,
      target: Math.round(t),
      deadline: deadline || undefined,
    });
    toast.success(challenge ? "Challenge updated" : "Challenge created");
    if (!challenge) {
      setName("");
      setTarget("");
      setDeadline("");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{challenge ? "Edit challenge" : "New challenge"}</DialogTitle>
          <DialogDescription>What are you aiming for?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="chal-name">Name</Label>
            <Input
              id="chal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="12 books this year"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>What counts</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as ChallengeUnit)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="chal-target">Target</Label>
              <Input
                id="chal-target"
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="12"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="chal-deadline">Deadline (optional)</Label>
            <Input
              id="chal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>{challenge ? "Save changes" : "Create challenge"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
