import { describe, expect, it } from "vitest";

import { getServerSnapshot, importData, loadData, resetData } from "@/lib/rh/db";

describe("Reader Hub offline-store hydration", () => {
  it("keeps saved browser profile data out of the server snapshot until hydration", () => {
    const result = importData({ items: [], settings: { name: "Avery Reader" } });

    expect(result.ok).toBe(true);
    expect(getServerSnapshot().settings.name).toBe("");
    expect(loadData().settings.name).toBe("Avery Reader");

    resetData();
  });
});