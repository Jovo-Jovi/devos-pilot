# PILOT — Glossary

**Status:** SIGNED with the bootstrap commit (OD-01). Precedence 1, with `PRODUCT_BRIEF.md`.

## 1. Entities

| Entity | Meaning | Arabic |
|---|---|---|
| `LibraryNotice` | One published announcement from the library: closure, event, new arrival | إعلان المكتبة |
| `OpeningSlot` | One opening period on one day of the week | فترة عمل |
| `LibraryProfile` | The library's published name, address and phone (business data, never personal data) | بيانات المكتبة |

## 2. Terms

- **Locale**: `ar` or `en`, taken from the first URL segment only.
- **Pending state**: the designed state a region shows when its data is absent. It is never a placeholder or lorem text.
- **Fence**: a self-contained task prompt in `docs/fences/Tnn.md`, written by the reviewer.
- **Report**: the builder's account of a task in `docs/reports/Tnn.md`.
- **Verdict**: the reviewer's PASS/FAIL in `docs/reviews/Tnn-aN.md`.
- **Runner**: the GitHub Actions workflow `devos-cycle`, or `scripts/devos/loop.mjs` locally.

## 3. Forbidden bare nouns

These words are ambiguous. As a **bare** name of a type, interface, route segment or content field
they are a defect, and `guard:naming` fails the build.

```
notice notices slot slots item items post posts user users info profile data
```

Qualified replacements:

- `notice` → **`LibraryNotice`** (type), `libraryNotices` (collection), route segment `notices` is the **one** permitted route exception, because it is user-facing URL copy (listed in `scripts/guards/naming.mjs` allowRoutes).
- `slot` → **`OpeningSlot`**.
- `profile` → **`LibraryProfile`**. Never a person's profile: the product holds none.
- `user` → **forbidden.** There are no accounts; the word would imply data the product must not hold.
- `item`, `post`, `info`, `data` → **forbidden.** Name the entity.

PascalCase entity names are permitted only as the exact names in §1.
