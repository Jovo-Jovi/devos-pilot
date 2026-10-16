import type { BookType } from "@/content/book-types";
import type { Locale } from "@/i18n/config";
import { BookCover } from "./BookCover";

export function BookTypeEntry({
  locale,
  bookType,
}: {
  locale: Locale;
  bookType: BookType;
}) {
  const name = locale === "ar" ? bookType.nameAr : bookType.nameEn;
  const description =
    locale === "ar" ? bookType.descriptionAr : bookType.descriptionEn;
  return (
    <li className="book-type">
      <BookCover />
      <div>
        <h2>{name}</h2>
        <p>{description}</p>
      </div>
    </li>
  );
}
