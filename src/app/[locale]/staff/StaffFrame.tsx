import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { libraryProfile } from "@/content/library-content";
import type { Locale } from "@/i18n/config";
import styles from "./staff.module.css";

export function StaffFrame({
  locale,
  path,
  title,
  children,
}: {
  locale: Locale;
  path: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader locale={locale} path={path} libraryProfile={libraryProfile} />
      <main className="wrap">
        <h1 className="page-title">{title}</h1>
        <div className={styles.stack}>{children}</div>
      </main>
      <SiteFooter locale={locale} libraryProfile={libraryProfile} />
    </>
  );
}
