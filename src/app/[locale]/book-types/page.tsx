import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { libraryProfile } from "@/content/library-content";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { BookTypeList } from "./BookTypeList";

export default async function BookTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <>
      <SiteHeader
        locale={locale}
        path="/book-types"
        libraryProfile={libraryProfile}
      />
      <main className="wrap">
        <h1 className="page-title">{messages.bookTypes.title}</h1>
        <Suspense fallback={null}>
          <BookTypeList locale={locale} />
        </Suspense>
      </main>
      <SiteFooter locale={locale} libraryProfile={libraryProfile} />
    </>
  );
}
