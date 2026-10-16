import { connection } from "next/server";
import { BookTypeEntry } from "@/components/BookTypeEntry";
import { PendingState } from "@/components/PendingState";
import { readBookTypeCovers, readLibraryBookTypes } from "@/content/readers";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export async function BookTypeList({ locale }: { locale: Locale }) {
  await connection();
  const [bookTypes, covers] = await Promise.all([
    readLibraryBookTypes(),
    readBookTypeCovers(),
  ]);
  if (bookTypes.length === 0) {
    return (
      <PendingState message={getMessages(locale).state.pendingBookTypes} />
    );
  }
  const coverUrlByBookTypeId = new Map(
    covers.map((cover) => [cover.bookTypeId, cover.coverUrl]),
  );
  return (
    <ol className="book-types">
      {bookTypes.map((bookType) => (
        <BookTypeEntry
          key={bookType.id}
          locale={locale}
          bookType={bookType}
          coverUrl={coverUrlByBookTypeId.get(bookType.id)}
        />
      ))}
    </ol>
  );
}
