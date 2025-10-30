// tests/bmpm.edgecases.test.ts
import { bmpmEncode, bmpmMatch } from "../src/bmpm-engine";
import { ExtendedBMPMConfig as cfg } from "../src/bmpm";

describe("BMPM — edge cases & robustness", () => {
  test("empty and whitespace-only inputs yield empty encodings", () => {
    expect(bmpmEncode("", cfg).length).toBe(0);
    expect(bmpmEncode("   ", cfg).length).toBe(0);
  });

  test("non-alphabetic characters are ignored safely", () => {
    const a = bmpmEncode("O'Connor", cfg);
    const b = bmpmEncode("Oconnor", cfg);
    const keysA = new Set<string>(a.flatMap((r) => [...r.keys]));
    const keysB = new Set<string>(b.flatMap((r) => [...r.keys]));
    const inter = [...keysA].filter((k) => keysB.has(k));
    expect(inter.length).toBeGreaterThan(0);
  });

  test("hyphenated names compare to concatenated forms", () => {
    const x = bmpmMatch("Jean-Luc", "Jeanluc", cfg);
    expect(x).toBe(true);
  });

  test("guard against combinatorial explosion (runs to completion)", () => {
    // A string with many ambiguous clusters; test should complete quickly
    const tricky = "oughoughoughough";
    const enc = bmpmEncode(tricky, cfg);
    expect(enc.length).toBeGreaterThanOrEqual(1);
  });
});

