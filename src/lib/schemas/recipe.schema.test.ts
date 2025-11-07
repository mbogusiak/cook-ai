import { describe, it, expect } from "vitest";
import { GetRecipesQuerySchema } from "./recipe";

describe("recipe schemas - GetRecipesQuerySchema", () => {
  it("accepts valid query and coerces numbers", () => {
    const parsed = GetRecipesQuerySchema.parse({
      slot: "lunch",
      min_calories: "200",
      max_calories: "500",
      search: "salad",
      limit: "20",
      offset: "0",
    });
    expect(parsed.slot).toBe("lunch");
    expect(parsed.min_calories).toBe(200);
    expect(parsed.max_calories).toBe(500);
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("rejects when min_calories > max_calories", () => {
    expect(() => GetRecipesQuerySchema.parse({ min_calories: "600", max_calories: "500" })).toThrow();
  });

  it("rejects invalid slot", () => {
    expect(() => GetRecipesQuerySchema.parse({ slot: "brunch" as any })).toThrow();
  });

  it("rejects non-positive calories and invalid search length", () => {
    expect(() => GetRecipesQuerySchema.parse({ min_calories: "0" })).toThrow();
    expect(() => GetRecipesQuerySchema.parse({ max_calories: "0" })).toThrow();
    expect(() => GetRecipesQuerySchema.parse({ search: "" })).toThrow();
  });
});
