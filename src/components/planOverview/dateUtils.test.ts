import { describe, it, expect } from "vitest";
import { getDayOfWeek, formatDate, formatDateRange } from "./dateUtils";

describe("dateUtils (PL locale)", () => {
  it("getDayOfWeek returns Polish day name", () => {
    expect(getDayOfWeek("2025-01-13")).toBe("poniedziałek"); // Monday
  });

  it('formatDate returns "d MMMM yyyy" in PL', () => {
    expect(formatDate("2025-01-13")).toBe("13 stycznia 2025");
  });

  it('formatDateRange returns "d MMM - d MMM yyyy" in PL', () => {
    expect(formatDateRange("2025-01-13", "2025-01-19")).toBe("13 sty - 19 sty 2025");
  });
});
