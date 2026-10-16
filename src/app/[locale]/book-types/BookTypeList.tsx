import { connection } from "next/server";
import { BookTypeEntry } from "@/components/BookTypeEntry";
import { PendingState } from "@/components/PendingState";
import { readLibraryBookTypes } from "@/content/readers";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export async function BookTypeList({ locale }: { locale: Locale }) {
  await connection();
  const bookTypes = await readLibraryBookTypes();
  if (bookTypes.length === 0) {
    return (
      <PendingState message={getMessages(locale).state.pendingBookTypes} />
    );
  }
  return (
    <ol className="book-types">
      {bookTypes.map((bookType) => (
        <BookTypeEntry key={bookType.id} locale={locale} bookType={bookType} />
      ))}
    </ol>
  );
}
