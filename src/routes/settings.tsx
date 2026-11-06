import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ImagePlus, Moon, Sun, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog, PageHeader, SectionCard } from "@/components/rh/common";
import { actions } from "@/lib/rh/actions";
import { exportCSV, exportJSON } from "@/lib/rh/export";
import { fileToCoverDataUrl, getImage, importData, putImage, resetData, deleteImage } from "@/lib/rh/db";
import { useRH } from "@/lib/rh/react";
import { DEFAULT_CHECKLIST, SUGGESTED_CATEGORIES, type Settings } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Reader Hub" },
      { name: "description", content: "Personalize your reading goals, appearance, and local Reader Hub data." },
      { property: "og:title", content: "Settings — Reader Hub" },
      { property: "og:description", content: "Personalize your reading goals, appearance, and local Reader Hub data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function copySettings(settings: Settings): Settings {
  return { ...settings, categories: [...settings.categories], checklist: [...settings.checklist] };
}

function SettingsPage() {
  const data = useRH();
  const [draft, setDraft] = useState(() => copySettings(data.settings));
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(copySettings(data.settings));
    let alive = true;
    if (data.settings.avatarId) {
      getImage(data.settings.avatarId).then((url) => {
        if (alive) setAvatar(url ?? null);
      });
    } else {
      setAvatar(null);
    }
    return () => {
      alive = false;
    };
  }, [data.settings]);

  const updateDraft = (patch: Partial<Settings>) => setDraft((current) => ({ ...current, ...patch }));
  const saveSettings = () => {
    actions.updateSettings(draft);
    toast.success("Settings saved");
  };

  const saveAvatar = async (file: File) => {
    try {
      const dataUrl = await fileToCoverDataUrl(file, 512);
      const id = await putImage(dataUrl);
      const previousId = data.settings.avatarId;
      actions.updateSettings({ avatarId: id });
      setAvatar(dataUrl);
      if (previousId) void deleteImage(previousId);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Could not save that photo.");
    }
  };

  const addCategory = () => {
    const category = newCategory.trim();
    if (!category || draft.categories.includes(category)) return;
    updateDraft({ categories: [...draft.categories, category] });
    setNewCategory("");
  };

  const addChecklistItem = () => {
    const item = newChecklistItem.trim();
    if (!item || draft.checklist.includes(item)) return;
    updateDraft({ checklist: [...draft.checklist, item] });
    setNewChecklistItem("");
  };

  const restoreBackup = async (file: File) => {
    try {
      const result = importData(JSON.parse(await file.text()));
      if (!result.ok) {
        toast.error(result.error ?? "That backup could not be restored.");
        return;
      }
      toast.success("Backup restored on this device");
    } catch {
      toast.error("Choose a valid Reader Hub JSON backup.");
    }
  };

  return (
    <main className="page-bottom mx-auto max-w-lg px-4 pt-4">
      <PageHeader title="Settings" subtitle="Your profile, reading rhythm, and local data." />

      <SectionCard title="Your profile" className="mt-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-forest dark:text-gold"
            onClick={() => avatarRef.current?.click()}
            aria-label="Choose profile photo"
          >
            {avatar ? <img src={avatar} alt="Profile" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
          </button>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void saveAvatar(file);
              event.target.value = "";
            }}
          />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Reading goals" className="mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Daily goal measures</Label>
            <Select value={draft.dailyGoalType} onValueChange={(value) => updateDraft({ dailyGoalType: value as Settings["dailyGoalType"] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="pages">Pages</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberSetting label="Daily target" value={draft.dailyGoalValue} onChange={(value) => updateDraft({ dailyGoalValue: value })} />
          <NumberSetting label="Weekly minutes" value={draft.weeklyGoalMinutes} onChange={(value) => updateDraft({ weeklyGoalMinutes: value })} />
          <NumberSetting label="Monthly minutes" value={draft.monthlyGoalMinutes} onChange={(value) => updateDraft({ monthlyGoalMinutes: value })} />
          <NumberSetting label="Books per year" value={draft.annualBookGoal} onChange={(value) => updateDraft({ annualBookGoal: value })} />
        </div>
      </SectionCard>

      <SectionCard title="Appearance" className="mt-4">
        <div className="grid gap-4">
          <div>
            <Label className="mb-2 block">Color theme</Label>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((theme) => {
                const Icon = theme === "light" ? Sun : Moon;
                return (
                  <Button
                    key={theme}
                    type="button"
                    variant={draft.theme === theme ? "default" : "outline"}
                    onClick={() => updateDraft({ theme })}
                  >
                    <Icon className="h-4 w-4" /> {theme === "light" ? "Light" : "Dark"}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Reading note text size</Label>
            <div className="flex gap-2">
              {(["sm", "md", "lg"] as const).map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={draft.fontSize === size ? "default" : "outline"}
                  className={cn(size === "sm" && "text-xs", size === "lg" && "text-base")}
                  onClick={() => updateDraft({ fontSize: size })}
                >
                  {size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Reading categories" className="mt-4">
        <p className="mb-3 text-xs text-muted-foreground">Choose the categories available when organizing your library.</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CATEGORIES.map((category) => {
            const selected = draft.categories.includes(category);
            return (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={selected ? "secondary" : "outline"}
                aria-pressed={selected}
                onClick={() => updateDraft({ categories: selected ? draft.categories.filter((item) => item !== category) : [...draft.categories, category] })}
              >
                {category}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCategory(); } }}
            placeholder="Add a custom category"
            aria-label="Custom category"
          />
          <Button type="button" variant="outline" disabled={!newCategory.trim()} onClick={addCategory}>Add</Button>
        </div>
        {draft.categories.filter((category) => !SUGGESTED_CATEGORIES.includes(category as (typeof SUGGESTED_CATEGORIES)[number])).length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.categories.filter((category) => !SUGGESTED_CATEGORIES.includes(category as (typeof SUGGESTED_CATEGORIES)[number])).map((category) => (
              <Button key={category} type="button" size="sm" variant="secondary" onClick={() => updateDraft({ categories: draft.categories.filter((item) => item !== category) })}>
                {category} <span aria-hidden="true">×</span>
              </Button>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Daily checklist" className="mt-4">
        <div className="grid gap-2">
          {draft.checklist.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Input value={item} readOnly aria-label="Checklist item" />
              <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${item}`} onClick={() => updateDraft({ checklist: draft.checklist.filter((entry) => entry !== item) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newChecklistItem}
              onChange={(event) => setNewChecklistItem(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(); } }}
              placeholder="Add a checklist item"
              aria-label="New checklist item"
            />
            <Button type="button" variant="outline" disabled={!newChecklistItem.trim()} onClick={addChecklistItem}>Add</Button>
          </div>
          {draft.checklist.length === 0 ? (
            <Button type="button" variant="ghost" onClick={() => updateDraft({ checklist: [...DEFAULT_CHECKLIST] })}>Restore suggested checklist</Button>
          ) : null}
        </div>
      </SectionCard>

      <div className="mt-4">
        <Button className="w-full" onClick={saveSettings}>Save settings</Button>
      </div>

      <SectionCard title="Your local data" className="mt-4">
        <p className="mb-3 text-sm text-muted-foreground">Your library and notes stay on this device.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => exportJSON(data)}><Download className="h-4 w-4" /> Back up all data</Button>
          <Button variant="outline" onClick={() => exportCSV(data)}><Download className="h-4 w-4" /> Export reading records</Button>
          <Button variant="outline" onClick={() => backupRef.current?.click()}><Upload className="h-4 w-4" /> Restore a backup</Button>
          <input
            ref={backupRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void restoreBackup(file);
              event.target.value = "";
            }}
          />
        </div>
        <div className="mt-4 border-t border-border/70 pt-4">
          <p className="text-sm font-medium">Reset Reader Hub</p>
          <p className="mt-1 text-xs text-muted-foreground">This removes the reading data saved on this device.</p>
          <ConfirmDialog
            title="Erase all local reading data?"
            description="This permanently removes your library, notes, goals, and settings from this device. Export a backup first if you want to keep them."
            confirmLabel="Erase all data"
            trigger={<Button variant="destructive" size="sm" className="mt-3"><Trash2 className="h-4 w-4" /> Reset data</Button>}
            onConfirm={() => {
              resetData();
              toast.success("Local data reset");
            }}
          />
        </div>
      </SectionCard>

      <p className="mt-5 text-center text-xs text-muted-foreground">Reader Hub · Version 1.0.0</p>
    </main>
  );
}

function NumberSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const id = `setting-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={1} step={1} value={value} onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value) || 1)))} />
    </div>
  );
}