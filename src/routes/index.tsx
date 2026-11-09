import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, ChevronRight, Flame, Lightbulb, Plus, Quote as QuoteIcon, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, ProgressBar, ProgressRing, SectionCard } from "@/components/rh/common";
import { SessionDialog } from "@/components/rh/forms";
import { useRH } from "@/lib/rh/react";
import { actions } from "@/lib/rh/actions";
import { quoteOfDay } from "@/lib/rh/quotes";
import { todayKey } from "@/lib/rh/db";
import {
  consistencyPct,
  dayTotalsMap,
  formatMinutes,
  greeting,
  itemProgress,
  readingStreak,
} from "@/lib/rh/stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reader Hub — Your reading dashboard" },
      { name: "description", content: "Today's reading goals, streak, and the ideas you're collecting." },
      { property: "og:title", content: "Reader Hub — Your reading dashboard" },
      { property: "og:description", content: "Today's reading goals, streak, and the ideas you're collecting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const data = useRH();
  const today = todayKey();
  const totals = dayTotalsMap(data.sessions).get(today) ?? { minutes: 0, pages: 0 };
  const goal = data.settings.dailyGoalValue || 1;
  const goalValue = data.settings.dailyGoalType === "minutes" ? totals.minutes : totals.pages;
  const goalPct = Math.min(100, Math.round((goalValue / goal) * 100));
  const streak = readingStreak(data.sessions);
  const readingNow = data.items.filter((i) => i.status === "reading");
  const doneToday = data.checklist[today] ?? [];
  const quote = quoteOfDay(today);

  const quickLinks = [
    { to: "/insights", label: "Insights", icon: Sparkles },
    { to: "/challenges", label: "Challenges", icon: Target },
    { to: "/discoveries", label: "Discoveries", icon: Lightbulb },
    { to: "/quotes", label: "Quotes", icon: QuoteIcon },
  ] as const;

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <div className="animate-fade-up">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <PageHeader
          title={data.settings.name ? `${data.settings.name.split(" ")[0]}'s reading day` : "Your reading day"}
          className="mt-0 [&>div>h1]:mt-0"
        />
      </div>

      {/* goal + streak */}
      <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <ProgressRing
          value={goalPct}
          label={data.settings.dailyGoalType === "minutes" ? formatMinutes(totals.minutes) : `${totals.pages}`}
          sub={`of ${data.settings.dailyGoalType === "minutes" ? formatMinutes(goal) : `${goal} pages`}`}
        />
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-gold-deep" />
            <div>
              <p className="font-display text-xl font-semibold leading-none">{streak} day{streak === 1 ? "" : "s"}</p>
              <p className="text-xs text-muted-foreground">current streak · {consistencyPct(data.sessions)}% last 30 days</p>
            </div>
          </div>
          <ProgressBar value={goalPct} />
        </div>
      </div>

      {/* currently reading */}
      <SectionCard
        title="Currently reading"
        className="mt-4"
        action={
          <Link to="/library" className="text-xs font-medium text-gold-deep transition-colors hover:text-foreground dark:text-gold">
            Library <ChevronRight className="inline h-3 w-3" />
          </Link>
        }
      >
        {readingNow.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Nothing in progress.{" "}
            <Link to="/library" className="font-medium text-gold-deep underline-offset-2 hover:underline dark:text-gold">
              Pick something
            </Link>
          </p>
        ) : (
          <div className="grid gap-3">
            {readingNow.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Link
                  to="/library/$id"
                  params={{ id: item.id }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <ProgressBar value={itemProgress(item)} className="flex-1" />
                    <span className="shrink-0 text-[11px] text-muted-foreground">{itemProgress(item)}%</span>
                  </div>
                </Link>
                <SessionDialog
                  itemId={item.id}
                  trigger={
                    <Button size="sm" variant="secondary" className="shrink-0">
                      Log
                    </Button>
                  }
                />
              </div>
            ))}
            {readingNow.length > 4 ? (
              <p className="text-center text-xs text-muted-foreground">+{readingNow.length - 4} more in your library</p>
            ) : null}
          </div>
        )}
      </SectionCard>

      {/* checklist */}
      {data.settings.checklist.length > 0 ? (
        <SectionCard
          title="Today's checklist"
          className="mt-4"
          action={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid gap-2">
            {data.settings.checklist.map((label) => (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-accent/50"
              >
                <Checkbox
                  checked={doneToday.includes(label)}
                  onCheckedChange={() => actions.toggleChecklist(today, label)}
                />
                <span className={doneToday.includes(label) ? "text-muted-foreground line-through" : ""}>{label}</span>
              </label>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {/* quote of the day */}
      <Link to="/quotes" className="mt-4 block">
        <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-transparent p-4 shadow-sm transition-transform active:scale-[0.99]">
          <div className="flex items-center gap-2 text-gold-deep dark:text-gold">
            <QuoteIcon className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Quote of the day</span>
          </div>
          <p className="mt-2 font-display text-[15px] leading-snug">“{quote.text}”</p>
          <p className="mt-1.5 text-xs text-muted-foreground">— {quote.author}</p>
        </div>
      </Link>

      {/* quick links */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {quickLinks.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card px-2 py-3 text-center shadow-sm transition-colors hover:bg-accent"
          >
            <q.icon className="h-5 w-5 text-gold-deep dark:text-gold" />
            <span className="text-[11px] font-medium">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* vault recap */}
      <SectionCard
        title="Fresh from your vault"
        className="mt-4"
        action={
          <Link to="/vault" className="text-xs font-medium text-gold-deep transition-colors hover:text-foreground dark:text-gold">
            Open <ChevronRight className="inline h-3 w-3" />
          </Link>
        }
      >
        {data.vault.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Save your first highlight and it will appear here.
          </p>
        ) : (
          <div className="grid gap-2">
            {data.vault.slice(0, 3).map((v) => (
              <Link
                key={v.id}
                to="/vault"
                className="rounded-xl bg-secondary/60 px-3 py-2 transition-colors hover:bg-secondary"
              >
                <p className="truncate text-sm font-medium">{v.title}</p>
                <p className="truncate text-xs text-muted-foreground">{v.content.replace(/[#*>-]/g, "").slice(0, 70)}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <Link
        to="/library"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Add something new to read
      </Link>
    </main>
  );
}
