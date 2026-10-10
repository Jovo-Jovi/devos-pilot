import type { Locale } from "./config";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

type CatalogueLeaf<T> = T extends string
  ? string
  : { [K in keyof T]: CatalogueLeaf<T[K]> };

export type Messages = CatalogueLeaf<typeof en>;

const arMessages: Messages = ar;
const enMessages: Messages = en;

const catalogues: Record<Locale, Messages> = {
  ar: arMessages,
  en: enMessages,
};

export function getMessages(locale: Locale): Messages {
  return catalogues[locale];
}
