import { z } from "zod";

/** DATA_MODEL §2.1: kebab-case; a uuid's text form passes. */
const LIBRARY_NOTICE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type LibraryNoticeInput = {
  publishedOn: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export type LibraryNoticeField = keyof LibraryNoticeInput;

const TEXT_FIELDS = ["titleAr", "titleEn", "bodyAr", "bodyEn"] as const;

const libraryNoticeIdSchema = z.string().regex(LIBRARY_NOTICE_ID);

const noticeDoneSchema = z.enum(["saved", "published", "unpublished"]);

/** A real calendar date. `2026-02-30` matches a loose day range and still fails. */
function isCalendarDate(value: string): boolean {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function readFormString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

function isLibraryNoticeField(value: PropertyKey): value is LibraryNoticeField {
  return (
    value === "publishedOn" ||
    value === "titleAr" ||
    value === "titleEn" ||
    value === "bodyAr" ||
    value === "bodyEn"
  );
}

/**
 * Mirrors DATA_MODEL §2.1: titles and bodies are trimmed and non-empty
 * (`btrim(...) <> ''`); `publishedOn` is a real `date`.
 */
const libraryNoticeInputSchema = z
  .object({
    publishedOn: z.string().optional(),
    titleAr: z.string().optional(),
    titleEn: z.string().optional(),
    bodyAr: z.string().optional(),
    bodyEn: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.publishedOn === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedOn"],
        message: "required",
      });
    } else if (!isCalendarDate(value.publishedOn)) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedOn"],
        message: "date",
      });
    }
    for (const name of TEXT_FIELDS) {
      const text = value[name];
      if (text === undefined || text.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: [name],
          message: "required",
        });
      }
    }
  })
  .transform((value): LibraryNoticeInput => ({
    publishedOn: value.publishedOn ?? "",
    titleAr: (value.titleAr ?? "").trim(),
    titleEn: (value.titleEn ?? "").trim(),
    bodyAr: (value.bodyAr ?? "").trim(),
    bodyEn: (value.bodyEn ?? "").trim(),
  }));

export function parseLibraryNoticeInput(form: FormData):
  | { ok: true; value: LibraryNoticeInput }
  | {
      ok: false;
      fields: Partial<Record<LibraryNoticeField, "required" | "date">>;
    } {
  const parsed = libraryNoticeInputSchema.safeParse({
    publishedOn: readFormString(form, "publishedOn"),
    titleAr: readFormString(form, "titleAr"),
    titleEn: readFormString(form, "titleEn"),
    bodyAr: readFormString(form, "bodyAr"),
    bodyEn: readFormString(form, "bodyEn"),
  });
  if (!parsed.success) {
    const fields: Partial<Record<LibraryNoticeField, "required" | "date">> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (!isLibraryNoticeField(key) || fields[key]) continue;
      fields[key] =
        key === "publishedOn" && issue.message === "date" ? "date" : "required";
    }
    return { ok: false, fields };
  }
  return { ok: true, value: parsed.data };
}

export function isLibraryNoticeId(value: string): boolean {
  return libraryNoticeIdSchema.safeParse(value).success;
}

export function parseNoticeDone(
  value: unknown,
): "saved" | "published" | "unpublished" | null {
  const parsed = noticeDoneSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
