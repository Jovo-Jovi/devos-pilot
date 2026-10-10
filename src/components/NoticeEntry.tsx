import type { LibraryNotice } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { DateStamp } from "./DateStamp";

export function NoticeEntry({
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
    <li className="notice">
      <DateStamp locale={locale} publishedOn={notice.publishedOn} />
      <div>
        <Heading>{title}</Heading>
        <p>{body}</p>
      </div>
    </li>
  );
}
