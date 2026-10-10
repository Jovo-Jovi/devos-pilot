import type { ReactNode } from "react";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { directionOf, isLocale, locales, type Locale } from "@/i18n/config";
import "../../styles/global.css";

const plexSans = IBM_Plex_Sans_Arabic({
  weight: ["400", "600"],
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
});

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} dir={directionOf(locale)} className={plexSans.variable}>
      <body>{children}</body>
    </html>
  );
}
