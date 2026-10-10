import { dateStampParts } from "@/content/datestamp";
import type { Locale } from "@/i18n/config";

export function DateStamp({
  locale,
  publishedOn,
}: {
  locale: Locale;
  publishedOn: string;
}) {
  const { day, month } = dateStampParts(publishedOn, locale);
  return (
    <time className="stamp" dateTime={publishedOn}>
      <b>{day}</b>
      <span>{month}</span>
    </time>
  );
}
