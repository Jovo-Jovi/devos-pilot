"use client";

import { useActionState } from "react";
import { Bidi } from "@/components/Bidi";
import { TIMETABLE_DAY_ORDER } from "@/content/timetable";
import type { Messages } from "@/i18n/messages";
import type {
  OpeningSlotError,
  OpeningSlotField,
  OpeningSlotInput,
} from "@/lib/supabase/opening-slot-input";
import type { OpeningSlotFormState } from "./hours/actions";
import styles from "./staff.module.css";

type OpeningSlotFormCopy = {
  dayLabel: string;
  opensAtLabel: string;
  closesAtLabel: string;
  timeHint: string;
  noteArLabel: string;
  noteEnLabel: string;
  noteHint: string;
  errorRequired: string;
  errorTime: string;
  errorOrder: string;
  errorNotePair: string;
  hoursErrorSave: string;
  saveSubmit: string;
};

const initialState: OpeningSlotFormState = { error: null };

function fieldMessage(
  code: OpeningSlotError | undefined,
  copy: OpeningSlotFormCopy,
): string | undefined {
  if (code === "required") return copy.errorRequired;
  if (code === "time") return copy.errorTime;
  if (code === "order") return copy.errorOrder;
  if (code === "pair") return copy.errorNotePair;
  return undefined;
}

function describedBy(hintId: string | undefined, errorId: string, error?: string): string | undefined {
  if (hintId && error) return `${hintId} ${errorId}`;
  if (hintId) return hintId;
  if (error) return errorId;
  return undefined;
}

export function OpeningSlotForm({
  action,
  copy,
  days,
  values,
}: {
  action: (
    state: OpeningSlotFormState,
    formData: FormData,
  ) => Promise<OpeningSlotFormState>;
  copy: OpeningSlotFormCopy;
  days: Messages["days"];
  values: OpeningSlotInput;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fields = state.error === "invalid" ? state.fields : undefined;
  const dayError = fieldMessage(fields?.dayOfWeek, copy);
  const dayErrorId = "staff-day-of-week-error";
  const opensError = fieldMessage(fields?.opensAt, copy);
  const closesError = fieldMessage(fields?.closesAt, copy);
  const noteArError = fieldMessage(fields?.noteAr, copy);
  const noteEnError = fieldMessage(fields?.noteEn, copy);
  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error === "save" ? (
        <p className={styles.error} role="status">
          {copy.hoursErrorSave}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-day-of-week">
          {copy.dayLabel}
        </label>
        <select
          id="staff-day-of-week"
          name="dayOfWeek"
          className={`${styles.control} ${styles.select}`}
          defaultValue={String(values.dayOfWeek)}
          aria-describedby={describedBy(undefined, dayErrorId, dayError)}
          aria-invalid={dayError ? true : undefined}
        >
          {TIMETABLE_DAY_ORDER.map((dayOfWeek) => (
            <option key={dayOfWeek} value={String(dayOfWeek)}>
              {days[String(dayOfWeek) as keyof typeof days]}
            </option>
          ))}
        </select>
        {dayError ? (
          <p className={styles.error} id={dayErrorId}>
            {dayError}
          </p>
        ) : null}
      </div>
      <TimeField
        id="staff-opens-at"
        name="opensAt"
        label={copy.opensAtLabel}
        hint={copy.timeHint}
        error={opensError}
        defaultValue={values.opensAt}
      />
      <TimeField
        id="staff-closes-at"
        name="closesAt"
        label={copy.closesAtLabel}
        hint={copy.timeHint}
        error={closesError}
        defaultValue={values.closesAt}
      />
      <NoteField
        id="staff-note-ar"
        name="noteAr"
        label={copy.noteArLabel}
        hint={copy.noteHint}
        error={noteArError}
        dir="rtl"
        defaultValue={values.noteAr ?? ""}
      />
      <NoteField
        id="staff-note-en"
        name="noteEn"
        label={copy.noteEnLabel}
        hint={copy.noteHint}
        error={noteEnError}
        dir="ltr"
        defaultValue={values.noteEn ?? ""}
      />
      <button className={styles.submit} type="submit" disabled={pending}>
        {copy.saveSubmit}
      </button>
    </form>
  );
}

function TimeField({
  id,
  name,
  label,
  hint,
  error,
  defaultValue,
}: {
  id: string;
  name: OpeningSlotField;
  label: string;
  hint: string;
  error?: string;
  defaultValue: string;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.dateField}>
        <Bidi>
          <input
            id={id}
            name={name}
            className={`${styles.control} ${styles.dateControl}`}
            type="time"
            step={60}
            defaultValue={defaultValue}
            aria-describedby={describedBy(hintId, errorId, error)}
            aria-invalid={error ? true : undefined}
          />
        </Bidi>
      </div>
      <p className={styles.hint} id={hintId}>
        {hint}
      </p>
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NoteField({
  id,
  name,
  label,
  hint,
  error,
  dir,
  defaultValue,
}: {
  id: string;
  name: OpeningSlotField;
  label: string;
  hint: string;
  error?: string;
  dir: "rtl" | "ltr";
  defaultValue: string;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={styles.control}
        type="text"
        dir={dir}
        defaultValue={defaultValue}
        aria-describedby={describedBy(hintId, errorId, error)}
        aria-invalid={error ? true : undefined}
      />
      <p className={styles.hint} id={hintId}>
        {hint}
      </p>
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
