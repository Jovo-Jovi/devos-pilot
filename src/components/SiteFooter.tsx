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
    <footer>
      <p>
        {messages.footer.address} {address}
      </p>
      <p>
        {messages.footer.phone} <Bidi>{libraryProfile.phone}</Bidi>
      </p>
    </footer>
  );
}
