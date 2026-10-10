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
): OpeningSlot {
  const where = `[${index}]`;
  if (!isRecord(raw)) {
    fail(SLOTS_FILE, `${where} expected an object`);
  }
  assertAllowed(SLOTS_FILE, where, raw, SLOT_FIELDS);
  if (!Object.hasOwn(raw, "dayOfWeek")) {
    fail(SLOTS_FILE, `${at(where, "dayOfWeek")} missing`);
  }
  const dayOfWeek = raw.dayOfWeek;
  if (
    typeof dayOfWeek !== "number" ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    fail(SLOTS_FILE, `${at(where, "dayOfWeek")} not an integer 0-6`);
  }
  const opensAt = requiredString(SLOTS_FILE, where, raw, "opensAt");
  const closesAt = requiredString(SLOTS_FILE, where, raw, "closesAt");
  if (!TIME.test(opensAt)) {
    fail(SLOTS_FILE, `${at(where, "opensAt")} not HH:MM`);
  }
  if (!TIME.test(closesAt)) {
    fail(SLOTS_FILE, `${at(where, "closesAt")} not HH:MM`);
  }
  if (opensAt >= closesAt) {
    fail(SLOTS_FILE, `${at(where, "opensAt")} >= closesAt`);
  }
  const hasNoteAr = Object.hasOwn(raw, "noteAr");
  const hasNoteEn = Object.hasOwn(raw, "noteEn");
  if (hasNoteAr !== hasNoteEn) {
    fail(SLOTS_FILE, `${where} exactly one of noteAr/noteEn`);
  }
  const slot: OpeningSlot = {
    id: requiredId(SLOTS_FILE, where, raw, seen),
    dayOfWeek,
    opensAt,
    closesAt,
  };
  if (hasNoteAr && hasNoteEn) {
    slot.noteAr = requiredString(SLOTS_FILE, where, raw, "noteAr");
    slot.noteEn = requiredString(SLOTS_FILE, where, raw, "noteEn");
  }
  return slot;
}

export function parseOpeningSlots(raw: unknown): OpeningSlot[] {
  if (!Array.isArray(raw)) {
    fail(SLOTS_FILE, "expected an array");
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => parseOpeningSlot(entry, index, seen));
}

function parseLibraryNotice(
  raw: unknown,
  index: number,
  seen: Set<string>,
): LibraryNotice {
  const where = `[${index}]`;
  if (!isRecord(raw)) {
    fail(NOTICES_FILE, `${where} expected an object`);
  }
  assertAllowed(NOTICES_FILE, where, raw, NOTICE_FIELDS);
  const status = requiredString(NOTICES_FILE, where, raw, "status");
  if (status !== "published" && status !== "draft") {
    fail(NOTICES_FILE, `${at(where, "status")} not published or draft`);
  }
  const publishedOn = requiredString(NOTICES_FILE, where, raw, "publishedOn");
  if (!PUBLISHED_ON.test(publishedOn)) {
    fail(NOTICES_FILE, `${at(where, "publishedOn")} not YYYY-MM-DD`);
  }
  return {
    id: requiredId(NOTICES_FILE, where, raw, seen),
    status,
    publishedOn,
    titleAr: requiredString(NOTICES_FILE, where, raw, "titleAr"),
    titleEn: requiredString(NOTICES_FILE, where, raw, "titleEn"),
    bodyAr: requiredString(NOTICES_FILE, where, raw, "bodyAr"),
    bodyEn: requiredString(NOTICES_FILE, where, raw, "bodyEn"),
  };
}

export function parseLibraryNotices(raw: unknown): LibraryNotice[] {
  if (!Array.isArray(raw)) {
    fail(NOTICES_FILE, "expected an array");
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => parseLibraryNotice(entry, index, seen));
}
