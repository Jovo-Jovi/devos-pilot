import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getMessages } from "@/i18n/messages";

vi.mock("@/content/library-content", async () => {
  const actual = await vi.importActual<typeof import("@/content/library-content")>(
    "@/content/library-content",
  );
  return {
    libraryProfile: actual.libraryProfile,
    openingSlots: [],
    libraryNotices: [],
  };
});

import LocalePage from "./[locale]/page";
import NoticesPage from "./[locale]/notices/page";

describe("pending states when content is empty", () => {
  it("renders pending hours and notices on the English home page", async () => {
    const messages = getMessages("en");
    const element = await LocalePage({
      params: Promise.resolve({ locale: "en" }),
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain(messages.state.pendingHours);
    expect(html).toContain(messages.state.pendingNotices);
    expect(html).toContain(messages.link.allNotices);
  });

  it("renders the pending notices state on the Arabic notices page", async () => {
    const messages = getMessages("ar");
    const element = await NoticesPage({
      params: Promise.resolve({ locale: "ar" }),
    });
    const html = renderToStaticMarkup(element);
    expect(html).toContain(messages.state.pendingNotices);
    expect(html).not.toContain('class="notices"');
  });
});
