import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Home,
  LibraryBig,
  Settings,
  Timer,
  Vault,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getImage } from "@/lib/rh/db";
import { useRH } from "@/lib/rh/react";

// ---------- bottom navigation (mobile-first) ----------

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/library", label: "Library", icon: LibraryBig, match: (p: string) => p.startsWith("/library") },
  { to: "/reader", label: "Read", icon: Timer, match: (p: string) => p.startsWith("/reader") },
  { to: "/vault", label: "Vault", icon: Vault, match: (p: string) => p.startsWith("/vault") },
  { to: "/settings", label: "You", icon: Settings, match: (p: string) => p.startsWith("/settings") },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-gold-deep dark:text-gold" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-gold/20 dark:bg-gold/15",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- top header ----------

export function TopBar() {
  const data = useRH();
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (data.settings.avatarId) {
      getImage(data.settings.avatarId).then((u) => {
        if (alive) setAvatar(u ?? null);
      });
    } else {
      setAvatar(null);
    }
    return () => {
      alive = false;
    };
  }, [data.settings.avatarId]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Reader Hub</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition-colors hover:bg-accent"
          aria-label="Profile and settings"
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-display text-xs font-semibold text-forest dark:text-gold">
              {(data.settings.name || "R").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="max-w-24 truncate text-xs font-medium text-muted-foreground">
            {data.settings.name || "Reader"}
          </span>
        </Link>
      </div>
    </header>
  );
}
