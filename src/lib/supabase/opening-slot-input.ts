import { z } from "zod";

/** DATA_MODEL §2.2: kebab-case, the same pattern as §2.1; a uuid's text form passes. */
const OPENING_SLOT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** DATA_MODEL §2.2: `^([01][0-9]|2[0-3]):[0-5][0-9]$`. */
const CLOCK_TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export type OpeningSlotInput = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  noteAr: string | null;
  noteEn: string | null;
};

export type OpeningSlotField = keyof OpeningSlotInput;

export type OpeningSlotError = "required" | "time" | "order" | "pair";

const openingSlotIdSchema = z.string().regex(OPENING_SLOT_ID);

const hoursDoneSchema = z.enum(["added", "changed", "removed"]);

const dayOfWeekSchema = z.enum(["0", "1", "2", "3", "4", "5", "6"]);

function readFormString(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

function isOpeningSlotField(value: PropertyKey): value is OpeningSlotField {
  return (
    value === "dayOfWeek" ||
    value === "opensAt" ||
    value === "closesAt" ||
    value === "noteAr" ||
    value === "noteEn"
  );
}

function isOpeningSlotError(value: string): value is OpeningSlotError {
  return value === "required" || value === "time" || value === "order" || value === "pair";
}

/**
 * Mirrors DATA_MODEL §2.2: day 0–6, `HH:MM` with `opens_at collate "C" < closes_at`,
 * and a note pair that is both null or both non-blank.
 */
const openingSlotInputSchema = z
  .object({
    dayOfWeek: z.string().optional(),
    opensAt: z.string().optional(),
    closesAt: z.string().optional(),
    noteAr: z.string().optional(),
    noteEn: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!dayOfWeekSchema.safeParse(value.dayOfWeek).success) {
      ctx.addIssue({ code: "custom", path: ["dayOfWeek"], message: "required" });
    }

    const opensAt = value.opensAt ?? "";
    const closesAt = value.closesAt ?? "";
    const opensMissing = value.opensAt === undefined || opensAt === "";
    const closesMissing = value.closesAt === undefined || closesAt === "";
    const opensValid = !opensMissing && CLOCK_TIME.test(opensAt);
    const closesValid = !closesMissing && CLOCK_TIME.test(closesAt);

    if (opensMissing) {
      ctx.addIssue({ code: "custom", path: ["opensAt"], message: "required" });
    } else if (!opensValid) {
      ctx.addIssue({ code: "custom", path: ["opensAt"], message: "time" });
    }

    if (closesMissing) {
      ctx.addIssue({ code: "custom", path: ["closesAt"], message: "required" });
    } else if (!closesValid) {
      ctx.addIssue({ code: "custom", path: ["closesAt"], message: "time" });
    } else if (opensValid && opensAt >= closesAt) {
      ctx.addIssue({ code: "custom", path: ["closesAt"], message: "order" });
    }

    const noteAr = (value.noteAr ?? "").trim();
    const noteEn = (value.noteEn ?? "").trim();
    if ((noteAr === "") !== (noteEn === "")) {
      ctx.addIssue({
        code: "custom",
        path: [noteAr === "" ? "noteAr" : "noteEn"],
        message: "pair",
      });
    }
  })
  .transform((value): OpeningSlotInput => {
    const noteAr = (value.noteAr ?? "").trim();
    const noteEn = (value.noteEn ?? "").trim();
    const day = dayOfWeekSchema.safeParse(value.dayOfWeek);
    return {
      dayOfWeek: day.success ? Number(day.data) : 0,
      opensAt: value.opensAt ?? "",
      closesAt: value.closesAt ?? "",
      noteAr: noteAr === "" ? null : noteAr,
      noteEn: noteEn === "" ? null : noteEn,
    };
  });

export function parseOpeningSlotInput(form: FormData):
  | { ok: true; value: OpeningSlotInput }
  | {
      ok: false;
      fields: Partial<Record<OpeningSlotField, OpeningSlotError>>;
    } {
  const parsed = openingSlotInputSchema.safeParse({
    dayOfWeek: readFormString(form, "dayOfWeek"),
    opensAt: readFormString(form, "opensAt"),
    closesAt: readFormString(form, "closesAt"),
    noteAr: readFormString(form, "noteAr"),
    noteEn: readFormString(form, "noteEn"),
  });
  if (!parsed.success) {
    const fields: Partial<Record<OpeningSlotField, OpeningSlotError>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (!isOpeningSlotField(key) || fields[key]) continue;
      fields[key] = isOpeningSlotError(issue.message) ? issue.message : "required";
    }
    return { ok: false, fields };
  }
  return { ok: true, value: parsed.data };
}

export function isOpeningSlotId(value: string): boolean {
  return openingSlotIdSchema.safeParse(value).success;
}

export function parseHoursDone(
  value: unknown,
): "added" | "changed" | "removed" | null {
  const parsed = hoursDoneSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** `"0"`…`"6"` become 0…6. Anything else, including a number, is null. */
export function parseDayOfWeek(value: unknown): number | null {
  const parsed = dayOfWeekSchema.safeParse(value);
  return parsed.success ? Number(parsed.data) : null;
}
