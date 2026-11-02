import { useSyncExternalStore } from "react";
import type { RHData } from "./types";
import { mutate, subscribe, loadData } from "./db";

export type { RHData };

// Re-export all mutation helpers through a single hook surface so pages
// never import the raw module (keeps usage consistent + tree-shakeable).
export function useRH(): RHData {
  return useSyncExternalStore(subscribe, loadData, loadData);
}

export function update(draft: (d: RHData) => void) {
  mutate(draft);
}
