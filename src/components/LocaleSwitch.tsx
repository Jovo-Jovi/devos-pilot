import Link from "next/link";
import { locales, type Locale } from "@/i18n/config";

export function LocaleSwitch({
  locale,
  path,
  label,
}: {
  locale: Locale;
  path: string;
  label: string;
}) {
  const other = locales.find((candidate) => candidate !== locale);
  if (!other) {
    throw new Error("locales has no other locale");
  }
  return (
    <Link href={`/${other}${path}`} hrefLang={other} lang={other}>
      {label}
    </Link>
  );
}
