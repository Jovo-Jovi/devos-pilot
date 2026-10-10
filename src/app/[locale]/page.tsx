import { notFound } from "next/navigation";
import { OpeningHours } from "@/components/OpeningHours";
import { PendingState } from "@/components/PendingState";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { libraryProfile, openingSlots } from "@/content/library-content";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const libraryName =
    locale === "ar" ? libraryProfile.nameAr : libraryProfile.nameEn;
  return (
    <>
      <SiteHeader locale={locale} path="" libraryProfile={libraryProfile} />
      <main>
        <h1>{libraryName}</h1>
        <p>{messages.site.tagline}</p>
        <section>
          <h2>{messages.section.hours}</h2>
          {openingSlots.length > 0 ? (
            <OpeningHours locale={locale} slots={openingSlots} />
          ) : (
            <PendingState message={messages.state.pendingHours} />
          )}
        </section>
      </main>
      <SiteFooter locale={locale} libraryProfile={libraryProfile} />
    </>
  );
}
