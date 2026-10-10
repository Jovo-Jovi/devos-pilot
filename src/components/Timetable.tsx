import { Fragment } from "react";
import type { OpeningSlot } from "@/content/schema";
import {
  TIMETABLE_TICK_HOURS,
  barPlacement,
  placeOnAxis,
  timetableDays,
} from "@/content/timetable";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { Bidi } from "./Bidi";
import { TodayRow } from "./TodayRow";

export function Timetable({
  locale,
  slots,
}: {
  locale: Locale;
  slots: readonly OpeningSlot[];
}) {
  const messages = getMessages(locale);
  const days = timetableDays(slots);
  return (
    <div className="timetable" role="group" aria-label={messages.timetable.label}>
      <div className="axis" aria-hidden="true">
        <span />
        <div className="ticks">
          {TIMETABLE_TICK_HOURS.map((hour) => (
            <span
              key={hour}
              style={{
                insetInlineStart: `${placeOnAxis(`${String(hour).padStart(2, "0")}:00`)}%`,
              }}
            >
              <Bidi>{String(hour).padStart(2, "0")}</Bidi>
            </span>
          ))}
        </div>
      </div>
      {days.map((day) => {
        const dayName =
          messages.days[String(day.dayOfWeek) as keyof typeof messages.days];
        return (
          <TodayRow key={day.dayOfWeek} dayOfWeek={day.dayOfWeek}>
            <div className="day">
              {dayName}
              {day.slots.map((slot) => {
                const note = locale === "ar" ? slot.noteAr : slot.noteEn;
                return note ? <small key={slot.id}>{note}</small> : null;
              })}
            </div>
            <div className="track" aria-hidden="true">
              {day.slots.map((slot) => {
                const { start, size } = barPlacement(slot.opensAt, slot.closesAt);
                return (
                  <span
                    key={slot.id}
                    className="bar"
                    style={{
                      insetInlineStart: `${start}%`,
                      inlineSize: `${size}%`,
                    }}
                  />
                );
              })}
            </div>
            <div className="times">
              {day.slots.length > 0 ? (
                day.slots.map((slot, index) => (
                  <Fragment key={slot.id}>
                    {index > 0 ? messages.list.and : null}
                    <Bidi>{`${slot.opensAt}–${slot.closesAt}`}</Bidi>
                  </Fragment>
                ))
              ) : (
                <span className="closed-label">{messages.state.closed}</span>
              )}
            </div>
          </TodayRow>
        );
      })}
    </div>
  );
}
