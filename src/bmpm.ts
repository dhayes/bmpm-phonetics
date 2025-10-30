/**
 * Extended Beider–Morse configuration and language rules.
 * Heuristics, simple transliteration, and practical rule tables.
 */

import {
  BMPMConfig,
  NameType,
  RuleType,
  LanguageHeuristic,
  LanguageRules,
} from "./bmpm-engine";

/* -------------------------------------------------------------------------- */
/* Context helpers                                                            */
/* -------------------------------------------------------------------------- */
const ANY = () => true;
const atWordStart = (left: string) => left.length === 0 || /\s$/.test(left);
const atWordEnd = (right: string) => right.length === 0 || /^\s/.test(right);
const leftEndsWith = (s: string) => (left: string) => left.endsWith(s);
const rightStartsWith = (s: string) => (right: string) => right.startsWith(s);

/* -------------------------------------------------------------------------- */
/* Transliteration (lightweight, illustrative)                                */
/* -------------------------------------------------------------------------- */
// AFTER (drop-in replacement)
const cyrillicToLatinBasic = (s: string) => {
  // Lowercase for mapping; preserve case by simple post-fix if needed
  const m: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
    щ: "shch", ы: "y", э: "e", ю: "yu", я: "ya",
    ь: "", ъ: ""
  };
  return s
    .replace(/[А-ЯЁ]/g, (c) => c.toLowerCase())          // simplify: lowercase
    .replace(/./g, (c) => m[c] ?? c)                     // map known letters
    .replace(/[^a-z\s]/g, "");                           // drop leftovers
};

const hebrewToLatinBasic = (s: string) => {
      const base = s
    .replace(/[׳״]/g, "")
    .replace(/ש/g, "sh")
    .replace(/צ/g, "ts")
    .replace(/ח/g, "kh")
    .replace(/כ/g, "kh")
    .replace(/ג׳/g, "j")
    .replace(/ז׳/g, "zh")
    .replace(/ג/g, "g")
    .replace(/ד/g, "d")
    .replace(/ט/g, "t")
    .replace(/ת/g, "t")
    .replace(/פ/g, "p")
    .replace(/ב/g, "b")
    .replace(/ו/g, "v")
    .replace(/מ/g, "m")
    .replace(/ן|נ/g, "n")
    .replace(/ל/g, "l")
    .replace(/ר/g, "r")
    .replace(/ק/g, "k")
    .replace(/ע|א/g, "a")
    .replace(/י/g, "y");
    return base
    .replace(/([bcdfghjklmnpqrstvwxz])v([iy])\b/g, "$1evi");
};

/* -------------------------------------------------------------------------- */
/* Heuristics                                                                 */
/* -------------------------------------------------------------------------- */
export const heuristics: LanguageHeuristic[] = [
  { language: "german",  weight: 1.2, predicate: (s) => /(sch|tsch|tz|z|ä|ö|ü|ß)/.test(s) },
  { language: "english", weight: 1.0, predicate: (s) => /[a-z]/.test(s) },
  { language: "french",  weight: 1.0, predicate: (s) => /(eau|eux|ain$|ault$)/.test(s) },
  { language: "spanish", weight: 1.0, predicate: (s) => /(ll|ñ|guez$|ez$)/.test(s) },
  { language: "portuguese", weight: 1.0, predicate: (s) => /(ção|lh|nh|ão$)/.test(s) },
  { language: "polish",  weight: 1.1, predicate: (s) => /(cz|sz|rz|wicz$|ska$|cki$)/.test(s) },
  {
    language: "russian",
    weight: 1.1,
    predicate: (s) => /[а-яё]/i.test(s) || /(zh|shch|ov$|eva$|sky$|ski$)/.test(s),
    transliterator: cyrillicToLatinBasic,
  },
  {
    language: "hebrew",
    weight: 1.2,
    predicate: (s) => /[\u0590-\u05FF]/.test(s),
    transliterator: hebrewToLatinBasic,
  },
  // Yiddish would be similar; omitted here for brevity
];

/* -------------------------------------------------------------------------- */
/* Rule builder                                                               */
/* -------------------------------------------------------------------------- */
const R = (
  pattern: string,
  outputs: string[] | string,
  priority: number,
  lctx?: (left: string) => boolean,
  rctx?: (right: string) => boolean,
  consumes?: number
) => ({
  pattern,
  outputs: Array.isArray(outputs) ? outputs : [outputs],
  priority,
  lctx,
  rctx,
  consumes: consumes ?? pattern.length,
});

/* -------------------------------------------------------------------------- */
/* Rule tables (concise but practical)                                        */
/* -------------------------------------------------------------------------- */

// ENGLISH
const english: LanguageRules = {
  language: "english",
  rules: [
    R("ough", ["AF", "OF", "AU"], 10),
    R("eigh", "EY", 10),
    R("ph", "F", 9),
    R("gh", "", 8),             // silent in many contexts
    R("ch", "X", 8),
    R("c", "S", 8, ANY, rightStartsWith("e")),
R("c", "S", 8, ANY, rightStartsWith("i")),
R("c", "K", 7),
    R("kh", "H", 8),
    R("sh", "X", 8),
    R("th", "T", 8),
    R("wr", "R", 7, atWordStart),
    R("kn", "N", 7, atWordStart),
    R("qu", "KW", 6),
    // In ENGLISH rules (keep if not present yet)
    R("tz", "S", 7),
    R("shw", "XV", 9),
    R("en", ["AN", "N"], 7, ANY, atWordEnd),
// and keep 'h' as "H" in singles (not dropped)
    ...["b","d","g","k","p","t","m","n","l","r","f","s","x","v","z","j","w","y","h"].map(
      (c) => R(c, c.toUpperCase(), 1)
    ),

    // singles
    //...["b","d","g","k","p","t","m","n","l","r","f","s","x","v","z","j","w","y","c","h"].map(
    //  (c) => R(c, c === "h" ? "" : c.toUpperCase(), 1)
    //),
    // vowels
    ...["a","e","i","o","u","y"].map((v) => R(v, "A", 1)),
  ],
};

// GERMAN
const german: LanguageRules = {
  language: "german",
  rules: [
    // Prefer specific clusters first
    R("schm", "SM", 11),
    R("schw", "XV", 11),

    R("sch", "X", 10),
    R("tsch", "X", 10),

    // 'dt' collapses to a single T (Schmidt -> ...T)
    R("dt", "T", 9),

    R("sp", "SP", 7, atWordStart), // /ʃp/
    R("st", "ST", 7, atWordStart), // /ʃt/
    R("ch", "X", 9, leftEndsWith("s")),
    R("ch", "X", 9, leftEndsWith("t")),
    R("ch", "H", 8),
    R("ph", "F", 8),
    R("v", "F", 7),
    R("w", "V", 7),
    R("z", "S", 7),
    R("tz", "S", 8),
    R("th", "T", 6),
    R("qu", "KV", 6),

    // singles (NOTE: map 'h' to "H", do NOT drop it)
    ...["b","d","g","k","p","t","m","n","l","r","f","s","x","j","c","h"].map(
      (c) => R(c, c.toUpperCase(), 1)
    ),

    // vowels -> A
    ...["a","e","i","o","u","y"].map((v) => R(v, "A", 1)),
  ],
};

// FRENCH
const french: LanguageRules = {
  language: "french",
  rules: [
    R("eaux", "O", 10),
    R("eau", "O", 10),
    R("au", "O", 9),
    R("aux", "O", 9),
    R("oi", "WA", 9),
    R("ou", "U", 9),
    R("an", "AN", 9),
    R("en", "AN", 9),
    R("on", "ON", 9),
    R("in", "IN", 9),
    R("ain", "IN", 9),
    R("gn", "GN", 8),
    R("ph", "F", 8),
    R("ch", "X", 8),            // often /ʃ/
    R("th", "T", 7),
    R("s", "", 2, ANY, atWordEnd),
    R("t", "", 2, ANY, atWordEnd),
    // singles
    ...["b","d","g","k","p","m","n","l","r","f","v","z","j","x","c","h","w","y"].map(
      (c) => R(c, c === "h" ? "" : c.toUpperCase(), 1)
    ),
    ...["a","e","i","o","u","y"].map((v) => R(v, "A", 1)),
  ],
};

// SPANISH
const spanish: LanguageRules = {
  language: "spanish",
  rules: [
	  // NEW: c before e/i -> S ; else -> K  (Spanish)
    R("c", "S", 8, ANY, rightStartsWith("e")),
    R("c", "S", 8, ANY, rightStartsWith("i")),
    R("c", "K", 7),
    R("ll", "Y", 10),
    R("ñ", "NY", 10),
    R("ch", "X", 9),
    R("j", "X", 9),
    R("ge", "X", 9),
    R("gi", "X", 9),
    R("gue", "GE", 8),
    R("gui", "GI", 8),
    R("que", "KE", 8),
    R("qui", "KI", 8),
    R("v", "B", 7),
    R("z", "S", 7),
    R("c", "S", 7, ANY, rightStartsWith("e")),
    R("c", "S", 7, ANY, rightStartsWith("i")),
    R("h", "", 7),
    // singles
    ...["b","d","g","k","p","t","m","n","l","r","f","s","x","y","w"].map(
      (c) => R(c, c.toUpperCase(), 1)
    ),
    ...["a","e","i","o","u"].map((v) => R(v, "A", 1)),
  ],
};

// PORTUGUESE
const portuguese: LanguageRules = {
  language: "portuguese",
  rules: [
	  // NEW: c before e/i -> S ; else -> K  (Portuguese)
    R("c", "S", 8, ANY, rightStartsWith("e")),
    R("c", "S", 8, ANY, rightStartsWith("i")),
    R("c", "K", 7),
    R("ções", "SOIS", 10),
    R("ção", "SAO", 10),
    R("nh", ["NY", "N"], 9),
    R("lh", "LY", 9),
    R("ch", "X", 9),
    R("x", ["SH","S","Z","KS"], 8), // ambiguous; branch
    R("j", "ZH", 9),
    R("ge", "ZH", 9),
    R("gi", "ZH", 9),
    R("gue", "GE", 8),
    R("gui", "GI", 8),
    R("que", "KE", 8),
    R("qui", "KI", 8),
    R("ão", "AO", 9),
    R("ães", "AES", 9),
    R("em", "E~", 7, ANY, atWordEnd),
    R("ens", "E~", 7, ANY, atWordEnd),
    // singles
    ...["b", "d","g","k","p","t","m","n","l","r","f","s","v","z","w","y","h"].map(
	    (c) => R(c, c === "h" ? "" : c.toUpperCase(), 1)
    ),
    ...["a","e","i","o","u"].map((v) => R(v, "A", 1)),
  ],
};

// POLISH
const polish: LanguageRules = {
  language: "polish",
  rules: [
    R("szcz", "X", 10),
    R("dź", "J", 9),
    R("dż", "J", 9),
    R("cz", "X", 9),
    R("sz", "X", 9),
    R("rz", "Z", 9),
    R("ż", "Z", 9),
    R("ź", "Z", 9),
    R("ś", "S", 8),
    R("ć", "X", 8),
    R("ń", "NY", 8),
    R("w", "V", 7),
    R("ł", "W", 7),
    R("ch", "H", 8),
    R("ó", "A", 7),
    // singles
    ...["b","d","g","k","p","t","m","n","l","r","f","s","z","j","y","h"].map(
      (c) => R(c, c === "h" ? "" : c.toUpperCase(), 1)
    ),
    ...["a","e","i","o","u"].map((v) => R(v, "A", 1)),
  ],
};

// RUSSIAN (romanized via transliterator)
const russian: LanguageRules = {
  language: "russian",
  rules: [
    R("shch", "X", 10),
    R("zh", "Z", 9),
    R("sh", "X", 9),
    R("ch", "X", 9),
    R("kh", "H", 9),
    R("ts", "C", 8),
    R("sky", "SKI", 6, ANY, atWordEnd),
    R("ski", "SKI", 6, ANY, atWordEnd),
    R("ov", "OF", 6, ANY, atWordEnd),
    R("ova", "OFA", 6, ANY, atWordEnd),
    R("ev", "EF", 6, ANY, atWordEnd),
    R("eva", "EFA", 6, ANY, atWordEnd),
    // singles
    ...["b","d","g","k","p","t","m","n","l","r","f","s","z","v","j","y","h"].map(
      (c) => R(c, c === "h" ? "" : c.toUpperCase(), 1)
    ),
    ...["a","e","i","o","u"].map((v) => R(v, "A", 1)),
  ],
};

// HEBREW (romanized via transliterator)
const hebrew: LanguageRules = {
  language: "hebrew",
  rules: [
    R("tz", "C", 9),
    R("ts", "C", 9),
    R("kh", "H", 9),
    R("ch", "H", 9),
    R("sh", "X", 9),
    R("zh", "Z", 9),
    R("th", "T", 7),

    // singles
    ...["b","d","g","k","p","t","m","n","l","r","f","s","z","v","j","w","y","h"].map(
      (c) => R(c, c.toUpperCase(), 1)
    ),
    ...["a","e","i","o","u","y"].map((v) => R(v, "A", 1)),
  ],
};


/* -------------------------------------------------------------------------- */
/* Merger table (APPROX folding)                                              */
/* -------------------------------------------------------------------------- */
export const mergerApprox: Record<string, string> = {
  // consonant folds
  V: "F",    // v/w -> f-class (approx.)
  W: "F",
  KV: "K",   // qu/kv/kw
  KW: "K",
  GE: "G",
  GI: "G",
  KE: "K",
  KI: "K",
  ZH: "Z",
  SH: "X",
  NY: "N",
  LY: "L",
  GN: "N",
  C: "S",    // ts -> s-class approx.
  // vowels / nasal vowels fold
  AO: "A",
  AN: "A",
  ON: "A",
  IN: "A",
  OI: "A",
  AI: "A",
  EI: "A",
  "E~": "A",
  // plural/suffix simplifications
  "SAO": "SA",
  "SOIS": "SS"
};

/* -------------------------------------------------------------------------- */
/* Bundled rules & ready config                                               */
/* -------------------------------------------------------------------------- */
export const languageRuleSets: Record<string, LanguageRules> = {
  english,
  german,
  french,
  spanish,
  portuguese,
  polish,
  russian,
  hebrew,
};

export const ExtendedBMPMConfig: BMPMConfig = {
  nameType: NameType.GENERIC,
  ruleType: RuleType.APPROX,      // choose EXACT for stricter matching
  maxExpansions: 20_000,
  minKeyLength: 1,
  collapseDuplicates: true,
  languageHeuristics: heuristics,
  languageRuleSets,
  mergerTable: mergerApprox,
  topLanguages: 5,
};

