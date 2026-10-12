import { notFound } from "next/navigation";
import { NoticeEntry } from "@/components/NoticeEntry";
import { PendingState } from "@/components/PendingState";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { libraryProfile } from "@/content/library-content";
import { selectPublishedNotices } from "@/content/notices";
import { readPublishedLibraryNotices } from "@/content/readers";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export default async function NoticesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const published = selectPublishedNotices(await readPublishedLibraryNotices());
  return (
    <>
      <SiteHeader
        locale={locale}
        path="/notices"
        libraryProfile={libraryProfile}
      />
      <main className="wrap">
        <h1 className="page-title">{messages.nav.notices}</h1>
        {published.length > 0 ? (
          <ol className="notices">
            {published.map((notice) => (
              <NoticeEntry
                key={notice.id}
                locale={locale}
                notice={notice}
                headingLevel="h2"
              />
            ))}
          </ol>
        ) : (
          <PendingState message={messages.state.pendingNotices} />
        )}
      </main>
      <SiteFooter locale={locale} libraryProfile={libraryProfile} />
    </>
  );
}
