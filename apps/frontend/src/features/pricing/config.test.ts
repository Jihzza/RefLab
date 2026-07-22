import { describe, expect, it } from "vitest";
import { PAID_PLANS_ENABLED } from "./config";

describe("launch billing gate", () => {
  it("keeps paid plan actions disabled unless explicitly enabled", () => {
    expect(PAID_PLANS_ENABLED).toBe(false);
  });
});
