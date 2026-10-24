import { describe, it, expect } from "vitest";

// --- Pure helper functions duplicated from MainScene for testability ---

function daySeed(): number {
  const d = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
  return h || 1;
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shotPower(dx: number, dy: number): number {
  const raw = Math.hypot(dx, dy) * 4.5;
  return Math.max(0, Math.min(raw, 780));
}

function shareText(date: string, attempts: number): string {
  const emoji = attempts === 1 ? "🎯" : "⛳";
  return `Trickshot ${date} ${emoji} ${attempts}/${attempts} shots`;
}

// --- Tests ---

describe("daySeed", () => {
  it("returns a positive integer", () => {
    const seed = daySeed();
    expect(typeof seed).toBe("number");
    expect(seed).toBeGreaterThan(0);
  });

  it("is consistent within the same day", () => {
    expect(daySeed()).toBe(daySeed());
  });
});

describe("mulberry32", () => {
  it("outputs values in [0, 1) range", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic with the same seed", () => {
    const rng1 = mulberry32(99);
    const rng2 = mulberry32(99);
    for (let i = 0; i < 5; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    expect(rng1()).not.toBe(rng2());
  });
});

describe("shotPower", () => {
  it("returns 0 for zero drag", () => {
    expect(shotPower(0, 0)).toBe(0);
  });

  it("scales with drag distance", () => {
    const p1 = shotPower(10, 0);
    const p2 = shotPower(20, 0);
    expect(p2).toBeGreaterThan(p1);
  });

  it("clamps at 780 for large drag", () => {
    expect(shotPower(500, 500)).toBe(780);
  });

  it("never exceeds 780", () => {
    expect(shotPower(9999, 9999)).toBe(780);
  });
});

describe("shareText", () => {
  it("includes the date and hole-in-one emoji", () => {
    const text = shareText("2026-07-24", 1);
    expect(text).toContain("2026-07-24");
    expect(text).toContain("🎯");
  });

  it("includes multi-attempt emoji for > 1 attempts", () => {
    const text = shareText("2026-07-24", 3);
    expect(text).toContain("⛳");
    expect(text).toContain("3/3");
  });
});
