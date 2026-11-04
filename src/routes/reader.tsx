import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, EmptyState, ProgressRing, Cover, PageHeader } from "@/components/rh/common";
import { SessionDialog } from "@/components/rh/forms";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { dateKey, dayTotalsMap, formatMinutes, formatSeconds, itemProgress } from "@/lib/rh/stats";
import { prettyShort } from "@/lib/rh/stats";

export const Route = createFileRoute("/reader")({
  head: () => ({
    meta: [
      { title: "Read — Reader Hub" },
      { name: "description", content: "A focused reading timer that logs sessions for you." },
      { property: "og:title", content: "Read — Reader Hub" },
      { property: "og:description", content: "A focused reading timer that logs sessions for you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReaderPage,
});

function ReaderPage() {
  const data = useRH();
  const timer = data.timer;
  const [selectedId, setSelectedId] = useState("");
  const [goal, setGoal] = useState("25");
  const [finishPages, setFinishPages] = useState("");
  const [, forceTick] = useState(0);

  const candidates = useMemo(
    () => data.items.filter((i) => i.status === "reading" || i.status === "want"),
    [data.items],
  );

  // Tick every second while a timer runs.
  useEffect(() => {
    if (!timer?.running) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [timer?.running]);

  const timerItem = timer ? data.items.find((i) => i.id === timer.itemId) : undefined;
  const elapsedMin = timer
    ? timer.accumulatedMin + (timer.running ? (Date.now() - timer.startedAt) / 60000 : 0)
    : 0;
  const elapsedSec = Math.max(0, Math.floor(elapsedMin * 60));
  const goalMin = timer?.goalMin ?? 0;
  const goalPct = goalMin > 0 ? Math.min(100, Math.round((elapsedMin / goalMin) * 100)) : 0;

  const today = dateKey();
  const totals = dayTotalsMap(data.sessions).get(today) ?? { minutes: 0, pages: 0 };

  const start = () => {
    const id = selectedId || candidates[0]?.id;
    if (!id) return;
    actions.startTimer(id, Math.max(0, Number(goal) || 0) || undefined);
    toast.success("Timer started — happy reading!");
  };

  const finish = () => {
    if (!timer) return;
    const minutes = Math.max(1, Math.round(elapsedMin));
    const pages = Math.max(0, Number(finishPages) || 0);
    actions.addSession({
      itemId: timer.itemId,
      date: dateKey(),
      minutes,
      pages,
      source: "timer",
    });
    actions.clearTimer();
    setFinishPages("");
    toast.success(`Logged ${formatMinutes(minutes)} of reading`);
  };

  const discard = () => {
    actions.clearTimer();
    setFinishPages("");
    toast("Timer discarded");
  };

  const todaySessions = data.sessions
    .filter((s) => s.date === today)
    .sort((a, b) => b.id.localeCompare(a.id));

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <PageHeader title="Read" subtitle="Focus, then let Reader Hub log it for you." />

      {timer && timerItem ? (
        <>
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <Cover item={timerItem} className="h-28 w-20" iconClass="h-5 w-5" />
            <p className="mt-3 max-w-full truncate text-sm font-medium">{timerItem.title}</p>
            <p className="text-xs text-muted-foreground">{timerItem.author || "Unknown author"}</p>

            <div className="my-5">
              <ProgressRing
                value={goalMin > 0 ? goalPct : 100}
                size={168}
                label={<span className="font-display text-3xl font-semibold tabular-nums">{formatSeconds(elapsedSec)}</span>}
              />
            </div>
            {goalMin > 0 ? (
              <p className="text-xs text-muted-foreground">
                Goal: {formatMinutes(goalMin)} · {goalPct}% there
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Open-ended session</p>
            )}

            <div className="mt-5 flex w-full gap-2">
              {timer.running ? (
                <Button variant="secondary" className="flex-1" onClick={() => actions.pauseTimer()}>
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => actions.resumeTimer()}>
                  <Play className="h-4 w-4" /> Resume
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={discard}
              >
                <Square className="h-4 w-4" /> Discard
              </Button>
            </div>
          </div>

          <SectionCard title="Finish up" className="mt-4">
            <div className="grid gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="finish-pages">Pages read (optional)</Label>
                <Input
                  id="finish-pages"
                  type="number"
                  min={0}
                  value={finishPages}
                  onChange={(e) => setFinishPages(e.target.value)}
                  placeholder="12"
                />
              </div>
              <Button onClick={finish}>
                Log {formatMinutes(Math.max(1, Math.round(elapsedMin)))} and finish
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Keeps running while you pause to think — the page count is yours to add.
              </p>
            </div>
          </SectionCard>
        </>
      ) : candidates.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Play className="h-6 w-6" />}
            title="Nothing queued to read"
            hint="Add a book to your library and mark it as reading, then come back here to time your sessions."
            action={
              <Link
                to="/library"
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Open library
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <SectionCard title="Start a session" className="mt-4">
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>What are you reading?</Label>
                <div className="grid gap-1.5">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        (selectedId || candidates[0]?.id) === c.id
                          ? "border-gold-deep/60 bg-gold/10"
                          : "border-border bg-card hover:bg-accent/50"
                      }`}
                    >
                      <Cover item={c} className="h-12 w-8 shrink-0" iconClass="h-3 w-3" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{itemProgress(c)}% read</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="timer-goal">Session goal (minutes, optional)</Label>
                <Input
                  id="timer-goal"
                  type="number"
                  min={0}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="25"
                />
              </div>
              <Button onClick={start}>
                <Play className="h-4 w-4" /> Start timer
              </Button>
            </div>
          </SectionCard>
        </>
      )}

      <SectionCard
        title="Today's reading"
        className="mt-4"
        action={<span className="text-xs text-muted-foreground">{formatMinutes(totals.minutes)} · {totals.pages} pages</span>}
      >
        {todaySessions.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">Nothing logged today yet.</p>
        ) : (
          <div className="grid gap-1.5">
            {todaySessions.map((s) => {
              const it = data.items.find((i) => i.id === s.itemId);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it?.title ?? "Removed item"}</p>
                    <p className="text-xs text-muted-foreground">
                      {prettyShort(s.date)} · {formatMinutes(s.minutes)}
                      {s.pages ? ` · ${s.pages} pages` : ""} · {s.source === "timer" ? "timer" : "manual"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 text-center">
          <SessionDialog
            itemId={candidates[0]?.id ?? data.items[0]?.id ?? ""}
            trigger={
              <Button variant="ghost" size="sm" className="text-gold-deep dark:text-gold">
                Log a past session instead
              </Button>
            }
          />
        </div>
      </SectionCard>
    </main>
  );
}
