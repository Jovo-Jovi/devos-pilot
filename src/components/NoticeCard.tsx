import type { LibraryNotice } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { Bidi } from "./Bidi";

export function NoticeCard({
  locale,
  notice,
  headingLevel,
}: {
  locale: Locale;
  notice: LibraryNotice;
  headingLevel: "h2" | "h3";
}) {
  const title = locale === "ar" ? notice.titleAr : notice.titleEn;
  const body = locale === "ar" ? notice.bodyAr : notice.bodyEn;
  const Heading = headingLevel;
  return (
    <article className="notice-card">
      <Heading>{title}</Heading>
      <p>
        <Bidi>{notice.publishedOn}</Bidi>
      </p>
      <p>{body}</p>
    </article>
  );
}
