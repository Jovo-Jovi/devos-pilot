import type { OpeningSlot } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { Bidi } from "./Bidi";

export function OpeningHours({
  locale,
  slots,
}: {
  locale: Locale;
  slots: readonly OpeningSlot[];
}) {
  const messages = getMessages(locale);
  const dayNames = [
    messages.days["0"],
    messages.days["1"],
    messages.days["2"],
    messages.days["3"],
    messages.days["4"],
    messages.days["5"],
    messages.days["6"],
  ];
  return (
    <table>
      <tbody>
        {slots.map((slot) => {
          const note = locale === "ar" ? slot.noteAr : slot.noteEn;
          return (
            <tr key={slot.id}>
              <th scope="row">{dayNames[slot.dayOfWeek]}</th>
              <td>
                <Bidi>{`${slot.opensAt}–${slot.closesAt}`}</Bidi>
              </td>
              <td>{note ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
