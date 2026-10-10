export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}

export function directionOf(l: Locale): "rtl" | "ltr" {
  return l === "ar" ? "rtl" : "ltr";
}
