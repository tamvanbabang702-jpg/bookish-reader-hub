import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Bookmark,
  FileText,
  Layers,
  Lightbulb,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getImage } from "@/lib/rh/db";
import type { ContentKind, ReadStatus, ReadingItem, VaultKind } from "@/lib/rh/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { itemProgress } from "@/lib/rh/stats";

// ---------- page header ----------

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 pb-1", className)}>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ---------- section card ----------

export function SectionCard({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-sm", className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

// ---------- empty state ----------

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-forest dark:text-gold">
        {icon ?? <BookOpen className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {hint ? <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

// ---------- pill tabs ----------

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === t.id
              ? "border-transparent bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {t.label}
          {typeof t.count === "number" ? (
            <span className={cn("ml-1.5 text-xs", value === t.id ? "opacity-80" : "opacity-60")}>
              {t.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ---------- cover ----------

const COVER_TONES = [
  "from-[oklch(0.35_0.05_168)] to-[oklch(0.26_0.035_170)]",
  "from-[oklch(0.45_0.06_150)] to-[oklch(0.3_0.04_155)]",
  "from-[oklch(0.5_0.07_70)] to-[oklch(0.35_0.05_72)]",
  "from-[oklch(0.4_0.05_200)] to-[oklch(0.28_0.035_205)]",
  "from-[oklch(0.42_0.06_300)] to-[oklch(0.3_0.045_300)]",
];

export function Cover({
  item,
  className,
  iconClass,
}: {
  item: Pick<ReadingItem, "coverId" | "title" | "id">;
  className?: string;
  iconClass?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (item.coverId) {
      getImage(item.coverId).then((u) => {
        if (!alive) return;
        if (u) setUrl(u);
        else setFailed(true);
      });
    } else {
      setUrl(null);
    }
    return () => {
      alive = false;
    };
  }, [item.coverId]);

  let tone = COVER_TONES[0];
  try {
    let hash = 0;
    for (let i = 0; i < item.title.length; i++) hash = (hash * 31 + item.title.charCodeAt(i)) >>> 0;
    tone = COVER_TONES[hash % COVER_TONES.length];
  } catch {
    // keep default tone
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br shadow-md",
        tone,
        className,
      )}
    >
      {url && !failed ? (
        <img src={url} alt={item.title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
          <BookOpen className={cn("opacity-80", iconClass ?? "h-6 w-6")} />
          <span className="line-clamp-2 font-display text-[11px] font-medium leading-tight text-white/90">
            {item.title}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- progress ----------

export function ProgressBar({
  value,
  className,
  tone = "gold",
}: {
  value: number;
  className?: string;
  tone?: "gold" | "forest";
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "gold" ? "bg-gold-deep" : "bg-primary",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 84,
  label,
  sub,
}: {
  value: number;
  size?: number;
  label: string;
  sub?: string;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="stroke-gold-deep transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold leading-none">{label}</span>
        {sub ? <span className="mt-0.5 text-[10px] text-muted-foreground">{sub}</span> : null}
      </div>
    </div>
  );
}

// ---------- star rating ----------

export function Stars({
  value,
  onChange,
  size = "h-4 w-4",
}: {
  value?: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === value ? 0 : n)}
          className={cn("transition-transform", onChange && "active:scale-90")}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg viewBox="0 0 24 24" className={cn(size, n <= (value ?? 0) ? "fill-gold-deep text-gold-deep" : "fill-none text-muted-foreground/50")} strokeWidth={1.5} stroke="currentColor">
            <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.3l-5.8 3 1.1-6.4L2.6 9.3l6.5-.9L12 2.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ---------- status & kind chips ----------

export const STATUS_TONE: Record<ReadStatus, string> = {
  want: "bg-secondary text-secondary-foreground",
  reading: "bg-gold/25 text-gold-deep dark:text-gold",
  completed: "bg-primary/12 text-primary dark:text-gold",
  paused: "bg-muted text-muted-foreground",
  abandoned: "bg-muted text-muted-foreground/70 line-through",
};

export function StatusChip({ status }: { status: ReadStatus }) {
  const labels: Record<ReadStatus, string> = {
    want: "Want to Read",
    reading: "Reading",
    completed: "Completed",
    paused: "Paused",
    abandoned: "Abandoned",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", STATUS_TONE[status])}>
      {labels[status]}
    </span>
  );
}

export function KindIcon({ kind, className }: { kind: ContentKind; className?: string }) {
  if (kind === "article") return <FileText className={cn("h-4 w-4", className)} />;
  if (kind === "journal") return <Layers className={cn("h-4 w-4", className)} />;
  return <BookOpen className={cn("h-4 w-4", className)} />;
}

export const VAULT_META: Record<VaultKind, { label: string; icon: typeof PenLine; tone: string }> = {
  highlight: { label: "Highlight", icon: Bookmark, tone: "bg-gold/20 text-gold-deep dark:text-gold" },
  summary: { label: "Summary", icon: FileText, tone: "bg-primary/10 text-primary dark:text-gold" },
  lesson: { label: "Lesson", icon: Lightbulb, tone: "bg-secondary text-secondary-foreground" },
  inspiration: { label: "Inspiration", icon: Lightbulb, tone: "bg-gold/20 text-gold-deep dark:text-gold" },
  personal: { label: "Reflection", icon: PenLine, tone: "bg-muted text-muted-foreground" },
};

// ---------- confirm dialog ----------

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  destructive = true,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-xs rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display flex items-center gap-2">
            {destructive ? <AlertTriangle className="h-5 w-5 text-destructive" /> : null}
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- linked item chip ----------

export function SourceChip({ item }: { item?: ReadingItem }) {
  if (!item) return null;
  return (
    <Link
      to="/library/$id"
      params={{ id: item.id }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <KindIcon kind={item.kind} className="h-3 w-3" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
