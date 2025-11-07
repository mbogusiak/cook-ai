import { describe, it, expect } from "vitest";
import { createPlanCommandSchema, updatePlanCommandSchema, getPlansQuerySchema } from "./plan";

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

describe("plan schemas - createPlanCommandSchema", () => {
  it("accepts valid input", () => {
    const future = isoDate(2);
    const parsed = createPlanCommandSchema.parse({
      daily_calories: 2000,
      plan_length_days: 7,
      start_date: future,
    });
    expect(parsed.daily_calories).toBe(2000);
    expect(parsed.plan_length_days).toBe(7);
    expect(parsed.start_date).toBe(future);
  });

  it("rejects invalid calories and length ranges", () => {
    const future = isoDate(2);
    expect(() =>
      createPlanCommandSchema.parse({ daily_calories: 799, plan_length_days: 7, start_date: future })
    ).toThrow();
    expect(() =>
      createPlanCommandSchema.parse({ daily_calories: 6001, plan_length_days: 7, start_date: future })
    ).toThrow();
    expect(() =>
      createPlanCommandSchema.parse({ daily_calories: 2000, plan_length_days: 0, start_date: future })
    ).toThrow();
    expect(() =>
      createPlanCommandSchema.parse({ daily_calories: 2000, plan_length_days: 366, start_date: future })
    ).toThrow();
  });

  it("rejects invalid or non-future start_date", () => {
    expect(() =>
      createPlanCommandSchema.parse({ daily_calories: 2000, plan_length_days: 7, start_date: "invalid" })
    ).toThrow();
    // definitely in the past
    expect(() =>
      createPlanCommandSchema.parse({ daily_calories: 2000, plan_length_days: 7, start_date: "2000-01-01" })
    ).toThrow();
  });
});

describe("plan schemas - updatePlanCommandSchema", () => {
  it("accepts allowed states", () => {
    for (const s of ["active", "archived", "cancelled", "completed"] as const) {
      const parsed = updatePlanCommandSchema.parse({ state: s });
      expect(parsed.state).toBe(s);
    }
  });

  it("rejects invalid state", () => {
    expect(() => updatePlanCommandSchema.parse({ state: "foo" as any })).toThrow();
  });
});

describe("plan schemas - getPlansQuerySchema", () => {
  it("coerces and validates pagination and state", () => {
    const parsed = getPlansQuerySchema.parse({ state: null, limit: "10", offset: "0" });
    expect(parsed.state).toBeUndefined();
    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(0);
  });

  it("rejects out-of-range limit and offset", () => {
    expect(() => getPlansQuerySchema.parse({ limit: "0", offset: "0" })).toThrow();
    expect(() => getPlansQuerySchema.parse({ limit: "51", offset: "0" })).toThrow();
    expect(() => getPlansQuerySchema.parse({ limit: "10", offset: "-1" })).toThrow();
  });
});
