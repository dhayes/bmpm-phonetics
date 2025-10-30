# bmpm-phonetics

TypeScript implementation of the **Beider–Morse Phonetic Matching (BMPM)** algorithm.  
This library encodes personal names into phonetic keys across multiple languages,  
allowing approximate or cross-linguistic matches such as:

| Name A     | Name B     | Match |
|-------------|-------------|:-----:|
| Schmidt     | Smith       | ✅ |
| Schwarz     | Shwartz     | ✅ |
| Rodrigues   | Rodriguez   | ✅ |
| Cohen       | Kohn        | ✅ |
| Levi        | לוי         | ✅ |
| Nowak       | Novak       | ✅ |

---

## Features

- Full **Beider–Morse algorithm** implemented in TypeScript
- Multi-language rule sets (English, German, French, Spanish, Portuguese, Polish, Russian, Hebrew)
- Built-in **transliteration** for Cyrillic and Hebrew scripts
- **Exact** and **Approximate** matching modes
- Returns both **boolean matches** and **similarity scores**
- Suitable for **data cleaning, deduplication, genealogy, and record linkage**

---

## Installation

```bash
npm install bmpm-phonetics
```
or
```bash
yarn add bmpm-phonetics
```

## Quick Start

```ts
import {
  bmpmMatch,
  bmpmSimilarity,
  ExtendedBMPMConfig as cfg
} from "bmpm-phonetics";

console.log(bmpmMatch("Schmidt", "Smith", cfg));
// → true

console.log(bmpmSimilarity("Cohen", "Kohn", cfg));
// → 0.46

