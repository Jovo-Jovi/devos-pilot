import Link from "next/link";
import type { LibraryProfile } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { LocaleSwitch } from "./LocaleSwitch";

export function SiteHeader({
  locale,
  path,
  libraryProfile,
}: {
  locale: Locale;
  path: string;
  libraryProfile: LibraryProfile;
}) {
  const messages = getMessages(locale);
  const libraryName =
    locale === "ar" ? libraryProfile.nameAr : libraryProfile.nameEn;
  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href={`/${locale}`}>
          {libraryName}
        </Link>
        <nav className="nav">
          <Link href={`/${locale}`} aria-current={path === "" ? "page" : undefined}>
            {messages.nav.home}
          </Link>
          <Link
            href={`/${locale}/notices`}
            aria-current={path === "/notices" ? "page" : undefined}
          >
            {messages.nav.notices}
          </Link>
          <LocaleSwitch locale={locale} path={path} label={messages.nav.switchTo} />
        </nav>
      </div>
    </header>
  );
}
