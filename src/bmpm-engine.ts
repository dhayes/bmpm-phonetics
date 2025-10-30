/**
 * Beider–Morse Phonetic Matching (BMPM) — Core Engine
 * ---------------------------------------------------
 * This file contains the algorithm logic: preprocessing, language detection,
 * phonetic encoding, and matching utilities.
 */

export enum NameType {
  GENERIC = "GENERIC",
  ASHKENAZI = "ASHKENAZI",
  SEPHARDIC = "SEPHARDIC",
}

export enum RuleType {
  EXACT = "EXACT",
  APPROX = "APPROX",
}

export interface Rule {
  pattern: string;
  outputs: string[];
  priority: number;
  lctx?: (left: string) => boolean;
  rctx?: (right: string) => boolean;
  consumes?: number;
}

export interface LanguageRules {
  language: string;
  rules: Rule[];
}

export interface LanguageHeuristic {
  language: string;
  weight: number;
  predicate: (normalizedName: string) => boolean;
  transliterator?: (normalizedName: string) => string;
}

export interface BMPMConfig {
  nameType: NameType;
  ruleType: RuleType;
  maxExpansions: number;
  minKeyLength: number;
  collapseDuplicates: boolean;
  languageHeuristics: LanguageHeuristic[];
  languageRuleSets: Record<string, LanguageRules>;
  mergerTable?: Record<string, string>;
  topLanguages?: number;
}

interface EncodeState {
  pos: number;
  key: string;
}

export interface EncodeResult {
  language: string;
  keys: Set<string>;
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

export function preprocess(raw: string): string {
  const lower = raw.toLowerCase();
  const nfkd = lower.normalize("NFKD");
  const noMarks = nfkd.replace(/[\u0300-\u036f]/g, "");
  const lettersSpaces = noMarks.replace(/[^a-z\u00df\u00e4\u00f6\u00fc\s]+/g, " ");
  const mapped = lettersSpaces
    .replace(/\u00df/g, "ss")
    .replace(/\u00e4/g, "ae")
    .replace(/\u00f6/g, "oe")
    .replace(/\u00fc/g, "ue");
  return mapped.replace(/\s+/g, " ").trim();
}

function isVowel(ch: string): boolean {
  return /[aeiouy]/.test(ch);
}

function collapseRepeats(s: string): string {
  if (!s) return s;
  let out = s[0];
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1]) out += s[i];
  }
  return out;
}

function applyMergerTable(key: string, merger?: Record<string, string>): string {
  if (!merger) return key;
  const symbols = Object.keys(merger).sort((a, b) => b.length - a.length);
  let i = 0;
  let out = "";
  while (i < key.length) {
    let matched = false;
    for (const sym of symbols) {
      if (key.startsWith(sym, i)) {
        out += merger[sym];
        i += sym.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += key[i];
      i++;
    }
  }
  return out;
}

function fallbackMapChar(ch: string, ruleType: RuleType): string {
  if (ruleType === RuleType.EXACT && isVowel(ch)) return "A";
  return "";
}

/* -------------------------------------------------------------------------- */
/* Language Detection                                                         */
/* -------------------------------------------------------------------------- */

export function detectLanguages(
  name: string,
  cfg: BMPMConfig
): Array<{ language: string; score: number }> {
  const candidates: Array<{ language: string; score: number }> = [];
  for (const h of cfg.languageHeuristics) {
    if (h.predicate(name)) candidates.push({ language: h.language, score: h.weight });
  }

  if (candidates.length === 0) {
    const defaults: Record<NameType, Array<{ language: string; score: number }>> = {
      [NameType.GENERIC]: [
        { language: "english", score: 1 },
        { language: "german", score: 1 },
        { language: "french", score: 1 },
      ],
      [NameType.ASHKENAZI]: [
        { language: "yiddish", score: 2 },
        { language: "german", score: 1 },
        { language: "polish", score: 1 },
        { language: "russian", score: 1 },
        { language: "hebrew", score: 1 },
      ],
      [NameType.SEPHARDIC]: [
        { language: "spanish", score: 2 },
        { language: "portuguese", score: 1 },
        { language: "hebrew", score: 1 },
      ],
    };
    candidates.push(...defaults[cfg.nameType]);
  }

  const total = candidates.reduce((acc, c) => acc + c.score, 0);
  const normalized = total
    ? candidates.map((c) => ({ language: c.language, score: c.score / total }))
    : candidates;
  normalized.sort((a, b) => b.score - a.score);
  return cfg.topLanguages ? normalized.slice(0, cfg.topLanguages) : normalized;
}

export function transliterateForLanguage(
  name: string,
  language: string,
  cfg: BMPMConfig
): string {
  const h = cfg.languageHeuristics.find((x) => x.language === language);
  return h?.transliterator ? h.transliterator(name) : name;
}

/* -------------------------------------------------------------------------- */
/* Encoding Engine                                                            */
/* -------------------------------------------------------------------------- */

function selectApplicableRules(
  text: string,
  pos: number,
  rules: Rule[]
): Rule[] {
  const left = text.slice(0, pos);
  const matches: Rule[] = [];

  for (const r of rules) {
    if (!text.startsWith(r.pattern, pos)) continue;
    const right = text.slice(pos + (r.consumes ?? r.pattern.length));
    if ((r.lctx ? r.lctx(left) : true) && (r.rctx ? r.rctx(right) : true)) {
      matches.push(r);
    }
  }

  if (!matches.length) return [];
  const maxPr = Math.max(...matches.map((m) => m.priority));
  const top = matches.filter((m) => m.priority === maxPr);
  const maxLen = Math.max(...top.map((m) => m.consumes ?? m.pattern.length));
  return top.filter((m) => (m.consumes ?? m.pattern.length) === maxLen);
}

function pruneFrontier(frontier: EncodeState[], cap = 1024): EncodeState[] {
  return [...frontier]
    .sort((a, b) => (b.pos - a.pos) || (a.key.length - b.key.length))
    .slice(0, cap);
}

function finalizeKey(key: string, cfg: BMPMConfig): string {
  let out = key;
  if (cfg.ruleType === RuleType.APPROX) {
    out = applyMergerTable(out, cfg.mergerTable);
    out = collapseRepeats(out);
  }
  return out;
}

export function encodeWithRules(
  text: string,
  langRules: LanguageRules,
  cfg: BMPMConfig
): Set<string> {
  const results = new Set<string>();
  let expansions = 0;
  let frontier: EncodeState[] = [{ pos: 0, key: "" }];

  while (frontier.length) {
    const state = frontier.shift()!;
    if (state.pos >= text.length) {
      const f = finalizeKey(state.key, cfg);
      if (f.length >= cfg.minKeyLength) results.add(f);
      continue;
    }
    const ch = text[state.pos];
    if (ch === " ") {
      frontier.push({ pos: state.pos + 1, key: state.key });
      continue;
    }

    const applicable = selectApplicableRules(text, state.pos, langRules.rules);
    if (!applicable.length) {
      const mapped = fallbackMapChar(ch, cfg.ruleType);
      frontier.push({ pos: state.pos + 1, key: state.key + mapped });
    } else {
      for (const rule of applicable) {
        const consume = rule.consumes ?? rule.pattern.length;
        for (const outSym of rule.outputs) {
          let newKey = state.key + outSym;
          if (cfg.collapseDuplicates) newKey = collapseRepeats(newKey);
          frontier.push({ pos: state.pos + consume, key: newKey });
          if (++expansions > cfg.maxExpansions) frontier = pruneFrontier(frontier);
        }
      }
    }
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/* Top-level APIs                                                             */
/* -------------------------------------------------------------------------- */

export function bmpmEncode(rawName: string, cfg: BMPMConfig): EncodeResult[] {
  const raw = (rawName ?? "").toString();
  if (!raw.trim()) return [];

  // Detect on raw, Unicode-preserving (so Cyrillic/Hebrew are visible to heuristics)
  const rawForDetect = raw.normalize("NFC").toLowerCase();
  const langs = detectLanguages(rawForDetect, cfg);

  const out: EncodeResult[] = [];
  for (const { language } of langs) {
    const rules = cfg.languageRuleSets[language];
    if (!rules) continue;

    // Transliterate on the raw string (still has original script)
    const translit = transliterateForLanguage(rawForDetect, language, cfg);

    // Now collapse to ASCII-ish & normalize for rule engine
    const norm = preprocess(translit);
    if (!norm) continue;

    const keys = encodeWithRules(norm, rules, cfg);
    if (keys.size) out.push({ language, keys });
  }
  return out;
}

export function bmpmMatch(a: string, b: string, cfg: BMPMConfig): boolean {
  const A = bmpmEncode(a, cfg);
  const B = bmpmEncode(b, cfg);
  const setA = new Set([...A.flatMap((r) => [...r.keys])]);
  const setB = new Set([...B.flatMap((r) => [...r.keys])]);
  for (const k of setA) if (setB.has(k)) return true;
  return false;
}

export function bmpmSimilarity(a: string, b: string, cfg: BMPMConfig): number {
  const A = bmpmEncode(a, cfg);
  const B = bmpmEncode(b, cfg);
  const setA = new Set([...A.flatMap((r) => [...r.keys])]);
  const setB = new Set([...B.flatMap((r) => [...r.keys])]);
  const inter = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union ? inter / union : 0;
}

