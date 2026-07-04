import { describe, expect, it } from "bun:test";
import { cn } from "../lib/utils";

describe("cn utility", () => {
  it("merges classes correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("handles conditional classes", () => {
    expect(cn("bg-red-500", false && "text-white", true && "font-bold")).toBe(
      "bg-red-500 font-bold"
    );
  });

  it("resolves Tailwind conflicts correctly", () => {
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
  });
});
