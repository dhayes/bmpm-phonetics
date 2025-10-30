// tests/bmpm.modes.test.ts
import {
  bmpmEncode,
  bmpmMatch,
  bmpmSimilarity,
  NameType,
  RuleType,
} from "../src/bmpm-engine";
import { ExtendedBMPMConfig as baseCfg } from "../src/bmpm";

const exactCfg = {
  ...baseCfg,
  ruleType: RuleType.EXACT as const,
  mergerTable: undefined,
};

describe("BMPM — EXACT vs APPROX modes", () => {
  test("APPROX should be at least as permissive as EXACT", () => {
    const a = "Schwartz";
    const b = "Shvartz"; // yid/hebrew transliterations
    const simApprox = bmpmSimilarity(a, b, baseCfg);
    const simExact = bmpmSimilarity(a, b, exactCfg);
    expect(simApprox).toBeGreaterThanOrEqual(simExact);
  });

  test("EXACT can reduce false positives", () => {
    // A pair that might match under APPROX but not under stricter EXACT settings
    const a = "Vogel";
    const b = "Fogel";
    const approx = bmpmMatch(a, b, baseCfg); // merger folds V/W->F
    const exact = bmpmMatch(a, b, exactCfg);
    expect(approx).toBe(true);
    // exact may still match depending on rule tables; allow either but ensure similarity lower
    if (exact) {
      expect(bmpmSimilarity(a, b, exactCfg)).toBeLessThan(
        bmpmSimilarity(a, b, baseCfg)
      );
    }
  });

  test("NameType can change language pool (smoke)", () => {
    const ashCfg = { ...baseCfg, nameType: NameType.ASHKENAZI as const };
    const encAsh = bmpmEncode("Rabinowitz", ashCfg);
    const encGen = bmpmEncode("Rabinowitz", baseCfg);
    expect(encAsh.length).toBeGreaterThan(0);
    expect(encGen.length).toBeGreaterThan(0);
  });
});

