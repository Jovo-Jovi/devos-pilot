"use client";

import { useActionState } from "react";
import { Bidi } from "@/components/Bidi";
import type { LibraryNoticeField, LibraryNoticeInput } from "@/lib/supabase/library-notice-input";
import type { LibraryNoticeFormState } from "./notices/actions";
import styles from "./staff.module.css";

type NoticeFormCopy = {
  publishedOnLabel: string;
  publishedOnHint: string;
  titleArLabel: string;
  titleEnLabel: string;
  titleHint: string;
  bodyArLabel: string;
  bodyEnLabel: string;
  bodyHint: string;
  errorRequired: string;
  errorDate: string;
  errorSave: string;
  saveSubmit: string;
};

const initialState: LibraryNoticeFormState = { error: null };

function fieldMessage(
  code: "required" | "date" | undefined,
  copy: NoticeFormCopy,
): string | undefined {
  if (code === "required") return copy.errorRequired;
  if (code === "date") return copy.errorDate;
  return undefined;
}

function NoticeField({
  id,
  name,
  label,
  hint,
  error,
  dir,
  kind,
  defaultValue,
}: {
  id: string;
  name: LibraryNoticeField;
  label: string;
  hint: string;
  error?: string;
  dir?: "rtl" | "ltr";
  kind: "date" | "input" | "textarea";
  defaultValue: string;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${hintId} ${errorId}` : hintId;
  const shared = {
    id,
    name,
    className: kind === "textarea" ? `${styles.control} ${styles.area}` : styles.control,
    defaultValue,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  } as const;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {kind === "date" ? (
        <div className={styles.dateField}>
          <Bidi>
            <input {...shared} className={`${styles.control} ${styles.dateControl}`} type="date" />
          </Bidi>
        </div>
      ) : null}
      {kind === "input" ? <input {...shared} type="text" dir={dir} /> : null}
      {kind === "textarea" ? <textarea {...shared} dir={dir} /> : null}
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

export function NoticeForm({
  action,
  copy,
  values,
}: {
  action: (
    state: LibraryNoticeFormState,
    formData: FormData,
  ) => Promise<LibraryNoticeFormState>;
  copy: NoticeFormCopy;
  values?: LibraryNoticeInput;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fields = state.error === "invalid" ? state.fields : undefined;
  const value = (name: LibraryNoticeField): string => values?.[name] ?? "";
  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error === "save" ? (
        <p className={styles.error} role="status">
          {copy.errorSave}
        </p>
      ) : null}
      <NoticeField
        id="staff-published-on"
        name="publishedOn"
        label={copy.publishedOnLabel}
        hint={copy.publishedOnHint}
        error={fieldMessage(fields?.publishedOn, copy)}
        kind="date"
        defaultValue={value("publishedOn")}
      />
      <NoticeField
        id="staff-title-ar"
        name="titleAr"
        label={copy.titleArLabel}
        hint={copy.titleHint}
        error={fieldMessage(fields?.titleAr, copy)}
        dir="rtl"
        kind="input"
        defaultValue={value("titleAr")}
      />
      <NoticeField
        id="staff-title-en"
        name="titleEn"
        label={copy.titleEnLabel}
        hint={copy.titleHint}
        error={fieldMessage(fields?.titleEn, copy)}
        dir="ltr"
        kind="input"
        defaultValue={value("titleEn")}
      />
      <NoticeField
        id="staff-body-ar"
        name="bodyAr"
        label={copy.bodyArLabel}
        hint={copy.bodyHint}
        error={fieldMessage(fields?.bodyAr, copy)}
        dir="rtl"
        kind="textarea"
        defaultValue={value("bodyAr")}
      />
      <NoticeField
        id="staff-body-en"
        name="bodyEn"
        label={copy.bodyEnLabel}
        hint={copy.bodyHint}
        error={fieldMessage(fields?.bodyEn, copy)}
        dir="ltr"
        kind="textarea"
        defaultValue={value("bodyEn")}
      />
      <button className={styles.submit} type="submit" disabled={pending}>
        {copy.saveSubmit}
      </button>
    </form>
  );
}
