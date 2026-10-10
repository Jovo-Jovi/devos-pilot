import type { ReactNode } from "react";
import { Readex_Pro, Reem_Kufi } from "next/font/google";
import { notFound } from "next/navigation";
import { directionOf, isLocale, locales, type Locale } from "@/i18n/config";
import "../../styles/global.css";

const reemKufi = Reem_Kufi({ weight: ["500", "600", "700"], subsets: ["arabic", "latin"], variable: "--font-kufi" });
const readexPro = Readex_Pro({ weight: ["400", "500", "600"], subsets: ["arabic", "latin"], variable: "--font-readex" });

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
    <html lang={locale} dir={directionOf(locale)} className={`${reemKufi.variable} ${readexPro.variable}`}>
      <body>{children}</body>
    </html>
  );
}
