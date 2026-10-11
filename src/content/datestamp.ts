import type { Locale } from "../i18n/config";

export type DateStampParts = { day: number; month: string };

export function dateStampParts(publishedOn: string, locale: Locale): DateStampParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(publishedOn);
  if (!match) {
    throw new Error("invalid publishedOn");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("invalid publishedOn");
  }
  return {
    day,
    month: new Intl.DateTimeFormat(locale, {
      month: locale === "ar" ? "long" : "short",
      timeZone: "UTC",
    }).format(date),
  };
}
