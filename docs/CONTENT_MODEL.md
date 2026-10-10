# PILOT — Content model

Precedence 3. Entities are defined in `GLOSSARY.md` §1. The store is JSON (ADR-001).

## 1. Files

| File | Entity | Shape |
|---|---|---|
| `content/library-profile.json` | `LibraryProfile` | one object |
| `content/opening-slots.json` | `OpeningSlot` | array |
| `content/library-notices.json` | `LibraryNotice` | array |

All three are synthetic and signed under OD-02. The application **reads** them at build time on the
server. Nothing writes them at run time.

## 2. Fields

### `LibraryProfile`
| Field | Type | Rule |
|---|---|---|
| `nameAr`, `nameEn` | string | bilingual pair, both required |
| `addressAr`, `addressEn` | string | bilingual pair, both required |
| `phone` | string | E.164, displayed inside the isolation primitive |

### `OpeningSlot`
| Field | Type | Rule |
|---|---|---|
| `id` | string | kebab-case, unique |
| `dayOfWeek` | integer 0–6 | 0 = Sunday |
| `opensAt`, `closesAt` | `"HH:MM"` 24h | `opensAt < closesAt` |
| `noteAr`, `noteEn` | string, optional | pair: both present or both absent |

### `LibraryNotice`
| Field | Type | Rule |
|---|---|---|
| `id` | string | kebab-case, unique |
| `status` | `"published"` \| `"draft"` | only `published` is ever rendered |
| `publishedOn` | `"YYYY-MM-DD"` | sort key, newest first |
| `titleAr`, `titleEn` | string | bilingual pair, both required |
| `bodyAr`, `bodyEn` | string | bilingual pair, both required |

## 3. Routes

| Route | Shows | Task |
|---|---|---|
| `/` | redirects to `/ar` (D-02) | T01 |
| `/[locale]` | `LibraryProfile` name, all `OpeningSlot`s, the 3 newest published `LibraryNotice`s | T03, T04 |
| `/[locale]/notices` | every published `LibraryNotice`, newest first | T04 |
| any other first segment | 404 | T01 |

## 4. Validation

Every file is parsed with a schema on load. Invalid content fails the **build**, never the page.
Counts for evidence: `node -e "console.log(require('./content/library-notices.json').filter(n=>n.status==='published').length)"`.
`node scripts/inventory.mjs` prints every content count (T06).
