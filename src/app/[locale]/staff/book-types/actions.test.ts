vi.mock("server-only", () => ({}));

import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const OLD_KEY = "book-types/poetry/00000000-0000-4000-8000-000000000000.webp";
const COVER_KEY = /^book-types\/poetry\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/;

type Step =
  | { kind: "put"; key: string; body: Uint8Array }
  | { kind: "upsert"; bookTypeId: string; key: string; onConflict: string }
  | { kind: "unlink" }
  | { kind: "delete"; key: string }
  | { kind: "tag"; tag: string }
  | { kind: "redirect"; url: string }
  | { kind: "notFound" };

const poetry = {
  id: "poetry",
  nameAr: "الشعر",
  nameEn: "Poetry",
  descriptionAr: "سطر",
  descriptionEn: "A line",
  sortOrder: 50,
};

const harness = vi.hoisted(() => {
  const steps: Step[] = [];
  const db = {
    current: { data: null as { object_key: string } | null, error: null as { message: string } | null },
    upsert: {
      data: { book_type_id: "poetry" } as { book_type_id: string } | null,
      error: null as { message: string } | null,
    },
    removed: { data: null as { object_key: string } | null, error: null as { message: string } | null },
  };
  const requireStaff = vi.fn(async () => ({ id: "staff-1", email: "covers@example.com" }));
  const readBookTypes = vi.fn();
  const putCoverObject = vi.fn(async (key: string, body: Uint8Array) => {
    steps.push({ kind: "put", key, body });
  });
  const deleteCoverObject = vi.fn(async (key: string) => {
    steps.push({ kind: "delete", key });
  });
  const updateTag = vi.fn((tag: string) => {
    steps.push({ kind: "tag", tag });
  });
  const redirect = vi.fn((url: string): never => {
    steps.push({ kind: "redirect", url });
    throw new Error(`REDIRECT ${url}`);
  });
  const notFound = vi.fn((): never => {
    steps.push({ kind: "notFound" });
    throw new Error("NOT_FOUND");
  });
  const createStaffServerClient = vi.fn(async () => ({
    from(table: string) {
      if (table !== "book_type_covers") throw new Error("unexpected table");
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => db.current,
              };
            },
          };
        },
        upsert(values: { book_type_id: string; object_key: string }, options: { onConflict: string }) {
          steps.push({
            kind: "upsert",
            bookTypeId: values.book_type_id,
            key: values.object_key,
            onConflict: options.onConflict,
          });
          return {
            select() {
              return {
                maybeSingle: async () => db.upsert,
              };
            },
          };
        },
        delete() {
          return {
            eq() {
              return {
                select() {
                  return {
                    maybeSingle: async () => {
                      steps.push({ kind: "unlink" });
                      return db.removed;
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  }));
  return {
    steps,
    db,
    requireStaff,
    readBookTypes,
    putCoverObject,
    deleteCoverObject,
    updateTag,
    redirect,
    notFound,
    createStaffServerClient,
  };
});

vi.mock("@/lib/supabase/staff", () => ({ requireStaff: harness.requireStaff }));
vi.mock("@/lib/supabase/server", () => ({
  createStaffServerClient: harness.createStaffServerClient,
}));
vi.mock("@/lib/firebase/book-types", () => ({ readBookTypes: harness.readBookTypes }));
vi.mock("@/lib/r2/objects", () => ({
  putCoverObject: harness.putCoverObject,
  deleteCoverObject: harness.deleteCoverObject,
}));
vi.mock("next/cache", () => ({ updateTag: harness.updateTag }));
vi.mock("next/navigation", () => ({ redirect: harness.redirect, notFound: harness.notFound }));

import { removeBookTypeCover, uploadBookTypeCover } from "./actions";

async function pngForm(): Promise<FormData> {
  const png = await sharp({
    create: { width: 32, height: 48, channels: 3, background: { r: 20, g: 40, b: 60 } },
  })
    .png()
    .toBuffer();
  const formData = new FormData();
  formData.set("cover", new File([png], "cover.png", { type: "image/png" }));
  return formData;
}

describe("book type cover actions", () => {
  beforeEach(() => {
    harness.steps.length = 0;
    harness.db.current = { data: null, error: null };
    harness.db.upsert = { data: { book_type_id: "poetry" }, error: null };
    harness.db.removed = { data: null, error: null };
    harness.requireStaff.mockReset();
    harness.requireStaff.mockResolvedValue({ id: "staff-1", email: "covers@example.com" });
    harness.readBookTypes.mockReset();
    harness.readBookTypes.mockResolvedValue({ bookTypes: [poetry], skipped: 0 });
    harness.putCoverObject.mockClear();
    harness.deleteCoverObject.mockClear();
    harness.updateTag.mockClear();
    harness.redirect.mockClear();
    harness.notFound.mockClear();
    harness.createStaffServerClient.mockClear();
  });

  it("reads nothing when requireStaff redirects", async () => {
    harness.requireStaff.mockImplementation(() => harness.redirect("/ar/staff/mfa"));
    const formData = new FormData();
    const get = vi.spyOn(formData, "get");
    await expect(uploadBookTypeCover("ar", "poetry", { error: null }, formData)).rejects.toThrow(
      "REDIRECT /ar/staff/mfa",
    );
    await expect(removeBookTypeCover("ar", "poetry", formData)).rejects.toThrow("REDIRECT /ar/staff/mfa");
    expect(get).not.toHaveBeenCalled();
    expect(harness.readBookTypes).not.toHaveBeenCalled();
    expect(harness.createStaffServerClient).not.toHaveBeenCalled();
    expect(harness.putCoverObject).not.toHaveBeenCalled();
    expect(harness.deleteCoverObject).not.toHaveBeenCalled();
  });

  it("calls notFound for an id outside the seed and puts nothing", async () => {
    harness.readBookTypes.mockResolvedValue({
      bookTypes: [{ ...poetry, id: "novels" }],
      skipped: 0,
    });
    const formData = new FormData();
    await expect(uploadBookTypeCover("ar", "poetry", { error: null }, formData)).rejects.toThrow("NOT_FOUND");
    await expect(removeBookTypeCover("ar", "poetry", formData)).rejects.toThrow("NOT_FOUND");
    expect(harness.notFound).toHaveBeenCalledTimes(2);
    expect(harness.putCoverObject).not.toHaveBeenCalled();
    expect(harness.createStaffServerClient).not.toHaveBeenCalled();
  });

  it("refuses an oversized buffer and a GIF without putting or writing", async () => {
    const oversized = new Uint8Array(5_242_881);
    oversized[0] = 0xff;
    oversized[1] = 0xd8;
    oversized[2] = 0xff;
    const largeFile = new File([oversized], "cover.jpg", { type: "image/jpeg" });
    expect(largeFile.size).toBe(5_242_881);
    const large = new FormData();
    large.set("cover", largeFile);
    await expect(uploadBookTypeCover("ar", "poetry", { error: null }, large)).resolves.toEqual({
      error: "tooLarge",
    });

    const gif = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();
    const wrong = new FormData();
    wrong.set("cover", new File([gif], "cover.gif", { type: "image/gif" }));
    await expect(uploadBookTypeCover("ar", "poetry", { error: null }, wrong)).resolves.toEqual({
      error: "wrongType",
    });

    expect(harness.putCoverObject).not.toHaveBeenCalled();
    expect(harness.deleteCoverObject).not.toHaveBeenCalled();
    expect(harness.createStaffServerClient).not.toHaveBeenCalled();
    expect(harness.updateTag).not.toHaveBeenCalled();
  });

  it("replaces a cover in order: put, upsert, delete the old key, updateTag, redirect", async () => {
    harness.db.current = { data: { object_key: OLD_KEY }, error: null };
    await expect(uploadBookTypeCover("ar", "poetry", { error: null }, await pngForm())).rejects.toThrow(
      "REDIRECT /ar/staff/book-types?done=saved",
    );
    expect(harness.steps.map((step) => step.kind)).toEqual(["put", "upsert", "delete", "tag", "redirect"]);
    const put = harness.steps[0];
    if (put?.kind !== "put") throw new Error("expected a put");
    expect(put.key).toMatch(COVER_KEY);
    const stored = await sharp(Buffer.from(put.body)).metadata();
    expect(stored.format).toBe("webp");
    expect(harness.steps[1]).toEqual({
      kind: "upsert",
      bookTypeId: "poetry",
      key: put.key,
      onConflict: "book_type_id",
    });
    expect(harness.steps[2]).toEqual({ kind: "delete", key: OLD_KEY });
    expect(harness.steps[3]).toEqual({ kind: "tag", tag: "book-type-covers" });
    expect(harness.steps[4]).toEqual({ kind: "redirect", url: "/ar/staff/book-types?done=saved" });
  });

  it("deletes the new key when the upsert fails and leaves the old key", async () => {
    harness.db.current = { data: { object_key: OLD_KEY }, error: null };
    harness.db.upsert = { data: null, error: { message: "refused" } };
    await expect(uploadBookTypeCover("ar", "poetry", { error: null }, await pngForm())).resolves.toEqual({
      error: "save",
    });
    expect(harness.steps.map((step) => step.kind)).toEqual(["put", "upsert", "delete"]);
    const put = harness.steps[0];
    if (put?.kind !== "put") throw new Error("expected a put");
    expect(harness.steps[2]).toEqual({ kind: "delete", key: put.key });
    expect(harness.deleteCoverObject).not.toHaveBeenCalledWith(OLD_KEY);
    expect(harness.updateTag).not.toHaveBeenCalled();
    expect(harness.redirect).not.toHaveBeenCalled();
  });

  it("removes the link, then the object, and a link error skips both", async () => {
    const key = "book-types/poetry/11111111-1111-4111-8111-111111111111.webp";
    harness.db.removed = { data: { object_key: key }, error: null };
    await expect(removeBookTypeCover("ar", "poetry", new FormData())).rejects.toThrow(
      "REDIRECT /ar/staff/book-types?done=removed",
    );
    expect(harness.steps.map((step) => step.kind)).toEqual(["unlink", "delete", "tag", "redirect"]);
    expect(harness.steps[1]).toEqual({ kind: "delete", key });
    expect(harness.updateTag).toHaveBeenCalledWith("book-type-covers");

    harness.steps.length = 0;
    harness.deleteCoverObject.mockClear();
    harness.updateTag.mockClear();
    harness.redirect.mockClear();
    harness.db.removed = { data: null, error: { message: "refused" } };
    await expect(removeBookTypeCover("ar", "poetry", new FormData())).rejects.toThrow(
      "REDIRECT /ar/staff/book-types?error=save",
    );
    expect(harness.deleteCoverObject).not.toHaveBeenCalled();
    expect(harness.updateTag).not.toHaveBeenCalled();
    expect(harness.steps.map((step) => step.kind)).toEqual(["unlink", "redirect"]);
  });
});
