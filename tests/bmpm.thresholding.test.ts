// tests/bmpm.thresholding.test.ts
import { bmpmSimilarity } from "../src/bmpm-engine";
import { ExtendedBMPMConfig as cfg } from "../src/bmpm";

describe("BMPM — threshold-based decisions", () => {
  const THRESHOLD = 0.35;

  test.each([
    ["Schmidt", "Smith", true],
    ["Gonzalez", "Gonsales", true],
    ["Cohen", "Kohn", true],
    ["Fischer", "Vischer", true],
    ["Anderson", "Henderson", false],
  ])("%s vs %s with threshold", (a, b, expected) => {
    const score = bmpmSimilarity(a, b, cfg);
    const decision = score >= THRESHOLD;
    expect(decision).toBe(expected);
  });
});

