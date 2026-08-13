import { describe, it, expect } from "vitest";
import { formatCompletionDate } from "@/lib/utils/formatDate";

describe("formatCompletionDate", () => {
  it("formats a valid ISO date as short month + year", () => {
    const result = formatCompletionDate("2024-03-15T00:00:00.000Z");
    expect(result).toMatch(/Mar\s+2024/);
  });

  it("returns the original string when date is invalid", () => {
    expect(formatCompletionDate("not-a-date")).toBe("not-a-date");
  });
});
