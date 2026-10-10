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
      <main className="wrap">
        <div className="hero">
          <h1>{libraryName}</h1>
        </div>
        <section aria-labelledby="hours">
          <h2 id="hours">{messages.section.hours}</h2>
          {openingSlots.length > 0 ? (
            <OpeningHours locale={locale} slots={openingSlots} />
          ) : (
            <PendingState message={messages.state.pendingHours} />
          )}
        </section>
        <section aria-labelledby="latest">
          <h2 id="latest">{messages.section.latestNotices}</h2>
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
          <Link className="all-notices" href={`/${locale}/notices`}>
            {messages.link.allNotices}
          </Link>
        </section>
      </main>
      <SiteFooter locale={locale} libraryProfile={libraryProfile} />
    </>
  );
}
