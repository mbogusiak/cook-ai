import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    const result = cn("p-2", "text-sm", "p-4", false && "hidden");
    expect(result).toBe("text-sm p-4");
  });

  it("ignores falsy values", () => {
    const result = cn("btn", undefined, null, "", 0 && "zero");
    expect(result).toBe("btn");
  });
});
