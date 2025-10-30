// tests/bmpm.transliteration.test.ts
import {
  bmpmEncode,
  bmpmMatch,
  bmpmSimilarity,
} from "../src/bmpm-engine";
import { ExtendedBMPMConfig as cfg } from "../src/bmpm";

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const k of a) if (b.has(k)) return true;
  return false;
}

describe("BMPM — transliteration-driven equivalences", () => {
  test("Russian Cyrillic to Latin romanization (e.g., Новак ~ Novak)", () => {
    const cyr = "Новак";
    const lat = "Novak";
    const encCyr = bmpmEncode(cyr, cfg);
    const encLat = bmpmEncode(lat, cfg);
    const keysC = new Set<string>(encCyr.flatMap((r) => [...r.keys]));
    const keysL = new Set<string>(encLat.flatMap((r) => [...r.keys]));
    expect(hasOverlap(keysC, keysL)).toBe(true);
    expect(bmpmMatch(cyr, lat, cfg)).toBe(true);
  });

  test("Hebrew/Yiddish romanization variants (Yitzhak ~ Itzhak)", () => {
    const a = "Yitzhak";
    const b = "Itzhak";
    expect(bmpmMatch(a, b, cfg)).toBe(true);
    expect(bmpmSimilarity(a, b, cfg)).toBeGreaterThan(0.2);
  });

  test("Multiple scripts converge on similar keys (Levi ~ לוי)", () => {
    const a = "Levi";
    const b = "לוי";
    const sim = bmpmSimilarity(a, b, cfg);
    expect(sim).toBeGreaterThan(0.2);
  });
});

