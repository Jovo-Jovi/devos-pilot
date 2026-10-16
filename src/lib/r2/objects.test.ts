vi.mock("server-only", () => ({}));

import { describe, expect, it, vi } from "vitest";
import { coverPublicUrl, coverPutInput } from "./objects";

const body = new Uint8Array([1, 2, 3]);
const key = "book-types/novels/01234567-89ab-cdef-0123-456789abcdef.webp";

describe("cover objects", () => {
  it("returns the put input for a cover object", () => {
    expect(coverPutInput("devos-test", key, body)).toEqual({
      Bucket: "devos-test",
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("rejects a png key, a non-uuid key and a key outside book-types", () => {
    expect(() =>
      coverPutInput("devos-test", "book-types/novels/01234567-89ab-cdef-0123-456789abcdef.png", body),
    ).toThrow(new Error("invalid cover key"));
    expect(() => coverPutInput("devos-test", "book-types/novels/not-a-uuid.webp", body)).toThrow(
      new Error("invalid cover key"),
    );
    expect(() =>
      coverPutInput("devos-test", "covers/novels/01234567-89ab-cdef-0123-456789abcdef.webp", body),
    ).toThrow(new Error("invalid cover key"));
  });

  it("joins the public base and the key with one slash", () => {
    vi.stubEnv("R2_PUBLIC_BASE_URL", "http://127.0.0.1:8333/devos-test/");
    expect(coverPublicUrl(key)).toBe(`http://127.0.0.1:8333/devos-test/${key}`);
    vi.stubEnv("R2_PUBLIC_BASE_URL", "");
    expect(() => coverPublicUrl(key)).toThrow(new Error("R2_PUBLIC_BASE_URL is not set"));
  });
});
