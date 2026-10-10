import type { LibraryProfile } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { Bidi } from "./Bidi";

export function SiteFooter({
  locale,
  libraryProfile,
}: {
  locale: Locale;
  libraryProfile: LibraryProfile;
}) {
  const messages = getMessages(locale);
  const address =
    locale === "ar" ? libraryProfile.addressAr : libraryProfile.addressEn;
  return (
    <footer className="site-footer">
      <div className="wrap">
        <dl>
          <dt>{messages.footer.address}</dt>
          <dd>{address}</dd>
        </dl>
        <dl>
          <dt>{messages.footer.phone}</dt>
          <dd>
            <Bidi>{libraryProfile.phone}</Bidi>
          </dd>
        </dl>
      </div>
    </footer>
  );
}
