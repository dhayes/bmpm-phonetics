// tests/bmpm.basic.test.ts
import {
  bmpmEncode,
  bmpmMatch,
  bmpmSimilarity,
} from "../src/bmpm-engine";
import { ExtendedBMPMConfig as cfg } from "../src/bmpm";

function union<T>(...sets: Array<Set<T>>): Set<T> {
  return sets.reduce((acc, s) => {
    s.forEach((x) => acc.add(x));
    return acc;
  }, new Set<T>());
}

describe("BMPM — basic matching & similarity", () => {
  test.each([
    ["Schmidt", "Smith", true],
    ["Schwarz", "Shwartz", true],
    ["Meyer", "Meier", true],
    ["García", "Garcia", true],
    ["Rodrigues", "Rodriguez", true],
    ["Coutinho", "Coutino", true],
    ["Levi", "Levy", true],
    ["Yitzhak", "Itzhak", true],
    ["Kowalski", "Kovalsky", true],
    ["Nowak", "Novak", true],
    ["Johnson", "Jansen", false], // usually not a phonetic match
  ])("%s vs %s => match=%s", (a, b, expected) => {
    expect(bmpmMatch(a, b, cfg)).toBe(expected);
  });

  test("similarity is in [0,1] and correlates with match", () => {
    const pos = bmpmSimilarity("Schmidt", "Smith", cfg);
    const neg = bmpmSimilarity("Schmidt", "Garcia", cfg);
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThanOrEqual(1);
    expect(neg).toBeGreaterThanOrEqual(0);
    expect(neg).toBeLessThanOrEqual(1);
    expect(pos).toBeGreaterThan(neg);
  });

  test("encode returns non-empty key sets for typical names", () => {
    const enc = bmpmEncode("Schmidt", cfg);
    expect(enc.length).toBeGreaterThan(0);
    const allKeys = union(...enc.map((r) => r.keys));
    expect(allKeys.size).toBeGreaterThan(0);
  });

  test("diacritics and case differences normalize", () => {
    const a = bmpmEncode("García", cfg);
    const b = bmpmEncode("garcia", cfg);
    const aKeys = union(...a.map((r) => r.keys));
    const bKeys = union(...b.map((r) => r.keys));
    const inter = [...aKeys].filter((k) => bKeys.has(k));
    expect(inter.length).toBeGreaterThan(0);
  });
});

