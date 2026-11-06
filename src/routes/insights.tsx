import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, FileText, Flame, Layers } from "lucide-react";
import { PageHeader, ProgressBar, ProgressRing, SectionCard } from "@/components/rh/common";
import { useRH } from "@/lib/rh/react";
import {
  bestStreak,
  booksCompletedThisYear,
  consistencyPct,
  dateKey,
  dayTotalsMap,
  daysAgoKey,
  formatMinutes,
  lastNDays,
  milestones,
  readingStreak,
  reportForRange,
  topCategories,
} from "@/lib/rh/stats";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Reader Hub" },
      { name: "description", content: "Your reading totals, streaks, milestones and period reports." },
      { property: "og:title", content: "Insights — Reader Hub" },
      { property: "og:description", content: "Your reading totals, streaks, milestones and period reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const data = useRH();
  const totals = dayTotalsMap(data.sessions);
  const today = dateKey();
  const days = useMemo(() => lastNDays(14), []);
  const todayMinutes = totals.get(today)?.minutes ?? 0;
  const goal = data.settings.dailyGoalValue || 1;
  const goalPct = Math.min(100, Math.round((todayMinutes / goal) * 100));

  const overall = {
    minutes: data.sessions.reduce((a, s) => a + s.minutes, 0),
    pages: data.sessions.reduce((a, s) => a + s.pages, 0),
    sessions: data.sessions.length,
  };
  const completed = booksCompletedThisYear(data);

  const periods = [
    { label: "Last 7 days", from: daysAgoKey(6) },
    { label: "Last 30 days", from: daysAgoKey(29) },
    { label: "Last 365 days", from: daysAgoKey(364) },
  ].map((p) => ({ ...p, report: reportForRange(data, p.from, today) }));

  const maxMinutes = Math.max(30, ...days.map((d) => totals.get(d)?.minutes ?? 0));
  const cats = topCategories(data).slice(0, 5);
  const maxCat = Math.max(1, ...cats.map((c) => c.count));
  const streak = readingStreak(data.sessions);
  const ms = milestones(data);

  const statCards = [
    { label: "Total time", value: formatMinutes(overall.minutes), icon: Clock },
    { label: "Pages read", value: String(overall.pages), icon: FileText },
    { label: "Sessions", value: String(overall.sessions), icon: Layers },
    { label: "Books this year", value: `${completed.length}/${data.settings.annualBookGoal}`, icon: Flame },
  ];

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="animate-fade-up">
        <PageHeader title="Insights" subtitle="How your reading adds up." />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm">
            <s.icon className="h-4 w-4 text-gold-deep dark:text-gold" />
            <p className="mt-2 font-display text-xl font-semibold leading-none">{s.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Daily goal"
        className="mt-4"
        contentClassName="flex items-center gap-4"
      >
        <ProgressRing
          value={goalPct}
          size={72}
          label={formatMinutes(todayMinutes)}
          sub={`of ${formatMinutes(goal)}`}
        />
        <div className="grid flex-1 gap-2">
          <p className="text-sm">
            <span className="font-display font-semibold">{streak}</span> day streak ·{" "}
            <span className="font-display font-semibold">{bestStreak(data.sessions)}</span> best
          </p>
          <p className="text-xs text-muted-foreground">
            {consistencyPct(data.sessions)}% of the last 30 days had reading time
          </p>
          <ProgressBar value={goalPct} />
        </div>
      </SectionCard>

      <SectionCard title="Last 14 days" className="mt-4">
        <div className="flex h-28 items-end gap-1.5">
          {days.map((d) => {
            const m = totals.get(d)?.minutes ?? 0;
            const h = Math.max(2, Math.round((m / maxMinutes) * 100));
            return (
              <div key={d} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    m > 0 ? "bg-gold-deep/85 dark:bg-gold/70" : "bg-muted",
                  )}
                  style={{ height: `${h}%` }}
                  title={`${d}: ${formatMinutes(m)}`}
                />
                <span className="text-[8px] text-muted-foreground">{d.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Period reports" className="mt-4" contentClassName="grid gap-3">
        {periods.map((p) => (
          <div key={p.label} className="rounded-xl bg-secondary/50 px-3 py-2.5">
            <p className="font-display text-sm font-semibold">{p.label}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <span><b className="text-foreground">{formatMinutes(p.report.minutes)}</b> read</span>
              <span><b className="text-foreground">{p.report.pages}</b> pages</span>
              <span><b className="text-foreground">{p.report.itemsFinished}</b> finished</span>
              <span><b className="text-foreground">{p.report.activeDays}</b> active days</span>
            </div>
          </div>
        ))}
      </SectionCard>

      {cats.length > 0 ? (
        <SectionCard title="Your categories" className="mt-4" contentClassName="grid gap-2.5">
          {cats.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate font-medium">{c.category}</span>
                <span className="text-muted-foreground">{c.count}</span>
              </div>
              <ProgressBar value={(c.count / maxCat) * 100} tone="forest" />
            </div>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title="Milestones" className="mt-4" contentClassName="grid gap-2">
        {ms.map((m) => (
          <div key={m.label} className="flex items-start gap-2.5 rounded-xl px-1 py-1">
            {m.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep dark:text-gold" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0">
              <p className={cn("text-sm", m.done ? "font-medium" : "text-muted-foreground")}>{m.label}</p>
              <p className="text-[11px] text-muted-foreground">{m.detail}</p>
            </div>
          </div>
        ))}
      </SectionCard>
    </main>
  );
}
