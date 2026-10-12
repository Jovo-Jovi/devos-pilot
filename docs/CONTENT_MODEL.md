# PILOT — Content model

Precedence 3. Entities are defined in `GLOSSARY.md` §1. The store for `LibraryProfile` is JSON
(ADR-001). Under OD-10 (DRAFT until the intake PR for issue #14 merges), `LibraryNotice` and
`OpeningSlot` move to Supabase Postgres (ADR-002, `docs/DATA_MODEL.md`).

## 1. Files

| File | Entity | Shape |
|---|---|---|
| `content/library-profile.json` | `LibraryProfile` | one object |
| `content/opening-slots.json` | `OpeningSlot` | array |
| `content/library-notices.json` | `LibraryNotice` | array |

All three are synthetic and signed under OD-02. The application **reads** them at build time on the
server. Nothing writes them at run time.

**OD-10.** The migration of T12 copies `library-notices.json` and `opening-slots.json` into the tables
`library_notices` and `opening_slots`, row for row. The counts must stay equal: 4 notices (3
published, 1 draft) and 7 opening slots.
- **From T13,** the application reads those two entities from the database, on the server, with no
  session, through tag-cached reads. The two JSON files stay in the tree as the record of the signed
  content that moved, and the application no longer reads them.
- **At run time,** staff change notices and opening slots in the `operator` zone (`/[locale]/staff`).
- **`LibraryProfile`** is still read from its file at build time, and nothing writes it.

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

In the database (OD-10) the columns are the snake_case forms of these fields, with the same rules as
check constraints (`docs/DATA_MODEL.md` §2). Staff publish a notice by setting `status` to
`published` and unpublish it by setting it back to `draft`. Notices are never deleted.

## 3. Routes

| Route | Shows | Task |
|---|---|---|
| `/` | redirects to `/ar` (D-02) | T01 |
| `/[locale]` | `LibraryProfile` name, all `OpeningSlot`s, the 3 newest published `LibraryNotice`s | T03, T04 |
| `/[locale]/notices` | every published `LibraryNotice`, newest first | T04 |
| any other first segment | 404 | T01 |
| `/[locale]/staff/**` | the `operator` zone (OD-10): staff sign-in and the editors for `LibraryNotice` and `OpeningSlot`; nothing for visitors | T14–T17 |

## 4. Validation

Every file is parsed with a schema on load. Invalid content fails the **build**, never the page.
Database rows are held to the table checks (`docs/DATA_MODEL.md` §2). The public pages map them into
the same types and validate them again when they read them (T13). Staff input is validated on the
server by the action's schema before it reaches the database (T16, T17).
Counts for evidence: `node -e "console.log(require('./content/library-notices.json').filter(n=>n.status==='published').length)"`.
`node scripts/inventory.mjs` prints every content count (T06).
