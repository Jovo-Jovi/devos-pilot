export type LibraryProfile = {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
};

export type OpeningSlot = {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  noteAr?: string;
  noteEn?: string;
};

export type LibraryNotice = {
  id: string;
  status: "published" | "draft";
  publishedOn: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

const PROFILE_FILE = "content/library-profile.json";
const SLOTS_FILE = "content/opening-slots.json";
const NOTICES_FILE = "content/library-notices.json";

const PROFILE_FIELDS = ["nameAr", "nameEn", "addressAr", "addressEn", "phone"];
const SLOT_FIELDS = ["id", "dayOfWeek", "opensAt", "closesAt", "noteAr", "noteEn"];
const NOTICE_FIELDS = [
  "id",
  "status",
  "publishedOn",
  "titleAr",
  "titleEn",
  "bodyAr",
  "bodyEn",
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHONE = /^\+[1-9]\d{1,14}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PUBLISHED_ON = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function fail(filePath: string, detail: string): never {
  throw new Error(`${filePath}: ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function at(where: string, key: string): string {
  return where ? `${where}.${key}` : key;
}

function assertAllowed(
  filePath: string,
  where: string,
  record: Record<string, unknown>,
  allowed: readonly string[],
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      fail(filePath, `${at(where, key)} unknown field`);
    }
  }
}

function requiredString(
  filePath: string,
  where: string,
  record: Record<string, unknown>,
  key: string,
): string {
  const place = at(where, key);
  if (!Object.hasOwn(record, key)) {
    fail(filePath, `${place} missing`);
  }
  const value = record[key];
  if (typeof value !== "string") {
    fail(filePath, `${place} not a string`);
  }
  if (value === "") {
    fail(filePath, `${place} empty`);
  }
  return value;
}

function requiredId(
  filePath: string,
  where: string,
  record: Record<string, unknown>,
  seen: Set<string>,
): string {
  const id = requiredString(filePath, where, record, "id");
  if (!KEBAB.test(id)) {
    fail(filePath, `${at(where, "id")} not kebab-case`);
  }
  if (seen.has(id)) {
    fail(filePath, `${at(where, "id")} duplicated`);
  }
  seen.add(id);
  return id;
}

export function parseLibraryProfile(raw: unknown): LibraryProfile {
  if (!isRecord(raw)) {
    fail(PROFILE_FILE, "expected an object");
  }
  assertAllowed(PROFILE_FILE, "", raw, PROFILE_FIELDS);
  const phone = requiredString(PROFILE_FILE, "", raw, "phone");
  if (!PHONE.test(phone)) {
    fail(PROFILE_FILE, "phone not E.164");
  }
  return {
    nameAr: requiredString(PROFILE_FILE, "", raw, "nameAr"),
    nameEn: requiredString(PROFILE_FILE, "", raw, "nameEn"),
    addressAr: requiredString(PROFILE_FILE, "", raw, "addressAr"),
    addressEn: requiredString(PROFILE_FILE, "", raw, "addressEn"),
    phone,
  };
}

function parseOpeningSlot(
  raw: unknown,
  index: number,
  seen: Set<string>,
  source: string,
): OpeningSlot {
  const where = `[${index}]`;
  if (!isRecord(raw)) {
    fail(source, `${where} expected an object`);
  }
  assertAllowed(source, where, raw, SLOT_FIELDS);
  if (!Object.hasOwn(raw, "dayOfWeek")) {
    fail(source, `${at(where, "dayOfWeek")} missing`);
  }
  const dayOfWeek = raw.dayOfWeek;
  if (
    typeof dayOfWeek !== "number" ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    fail(source, `${at(where, "dayOfWeek")} not an integer 0-6`);
  }
  const opensAt = requiredString(source, where, raw, "opensAt");
  const closesAt = requiredString(source, where, raw, "closesAt");
  if (!TIME.test(opensAt)) {
    fail(source, `${at(where, "opensAt")} not HH:MM`);
  }
  if (!TIME.test(closesAt)) {
    fail(source, `${at(where, "closesAt")} not HH:MM`);
  }
  if (opensAt >= closesAt) {
    fail(source, `${at(where, "opensAt")} >= closesAt`);
  }
  const hasNoteAr = Object.hasOwn(raw, "noteAr");
  const hasNoteEn = Object.hasOwn(raw, "noteEn");
  if (hasNoteAr !== hasNoteEn) {
    fail(source, `${where} exactly one of noteAr/noteEn`);
  }
  const slot: OpeningSlot = {
    id: requiredId(source, where, raw, seen),
    dayOfWeek,
    opensAt,
    closesAt,
  };
  if (hasNoteAr && hasNoteEn) {
    slot.noteAr = requiredString(source, where, raw, "noteAr");
    slot.noteEn = requiredString(source, where, raw, "noteEn");
  }
  return slot;
}

/** `source` names where the records came from in error messages: the JSON file, or a table (T13). */
export function parseOpeningSlots(
  raw: unknown,
  source = SLOTS_FILE,
): OpeningSlot[] {
  if (!Array.isArray(raw)) {
    fail(source, "expected an array");
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => parseOpeningSlot(entry, index, seen, source));
}

function parseLibraryNotice(
  raw: unknown,
  index: number,
  seen: Set<string>,
  source: string,
): LibraryNotice {
  const where = `[${index}]`;
  if (!isRecord(raw)) {
    fail(source, `${where} expected an object`);
  }
  assertAllowed(source, where, raw, NOTICE_FIELDS);
  const status = requiredString(source, where, raw, "status");
  if (status !== "published" && status !== "draft") {
    fail(source, `${at(where, "status")} not published or draft`);
  }
  const publishedOn = requiredString(source, where, raw, "publishedOn");
  if (!PUBLISHED_ON.test(publishedOn)) {
    fail(source, `${at(where, "publishedOn")} not YYYY-MM-DD`);
  }
  return {
    id: requiredId(source, where, raw, seen),
    status,
    publishedOn,
    titleAr: requiredString(source, where, raw, "titleAr"),
    titleEn: requiredString(source, where, raw, "titleEn"),
    bodyAr: requiredString(source, where, raw, "bodyAr"),
    bodyEn: requiredString(source, where, raw, "bodyEn"),
  };
}

/** `source` names where the records came from in error messages: the JSON file, or a table (T13). */
export function parseLibraryNotices(
  raw: unknown,
  source = NOTICES_FILE,
): LibraryNotice[] {
  if (!Array.isArray(raw)) {
    fail(source, "expected an array");
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => parseLibraryNotice(entry, index, seen, source));
}
