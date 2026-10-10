import Link from "next/link";
import { notFound } from "next/navigation";
import { NoticeCard } from "@/components/NoticeCard";
import { OpeningHours } from "@/components/OpeningHours";
import { PendingState } from "@/components/PendingState";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  libraryNotices,
  libraryProfile,
  openingSlots,
} from "@/content/library-content";
import { selectLatestNotices } from "@/content/notices";
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
  const latestNotices = selectLatestNotices(libraryNotices, 3);
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
        <section>
          <h2>{messages.section.latestNotices}</h2>
          {latestNotices.length > 0 ? (
            <div className="notice-list">
              {latestNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  locale={locale}
                  notice={notice}
                  headingLevel="h3"
                />
              ))}
            </div>
          ) : (
            <PendingState message={messages.state.pendingNotices} />
          )}
          <Link href={`/${locale}/notices`}>{messages.link.allNotices}</Link>
        </section>
      </main>
      <SiteFooter locale={locale} libraryProfile={libraryProfile} />
    </>
  );
}
