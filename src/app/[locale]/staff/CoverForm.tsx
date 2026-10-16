"use client";

import { useActionState, type ReactNode } from "react";
import { Bidi } from "@/components/Bidi";
import { templateParts } from "@/content/template";
import type { BookTypeCoverFormState } from "./book-types/actions";
import styles from "./staff.module.css";

type CoverFormCopy = {
  coverFile: string;
  coverHint: string;
  coverUpload: string;
  coverReplace: string;
  coverTooLarge: string;
  coverWrongType: string;
  coverSaveError: string;
};

const initialState: BookTypeCoverFormState = { error: null };

function coverCopy(template: string): ReactNode[] {
  return templateParts(template).map((part, index) => {
    if (part.kind === "text") return part.text;
    if (part.name === "formats") return <Bidi key={index}>JPEG, PNG, WebP</Bidi>;
    if (part.name === "limit") return <Bidi key={index}>5 MB</Bidi>;
    return null;
  });
}

function errorTemplate(error: BookTypeCoverFormState["error"], copy: CoverFormCopy): string | null {
  if (error === "tooLarge") return copy.coverTooLarge;
  if (error === "wrongType") return copy.coverWrongType;
  if (error === "save") return copy.coverSaveError;
  return null;
}

export function CoverForm({
  action,
  copy,
  bookTypeId,
  hasCover,
}: {
  action: (
    state: BookTypeCoverFormState,
    formData: FormData,
  ) => Promise<BookTypeCoverFormState>;
  copy: CoverFormCopy;
  bookTypeId: string;
  hasCover: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const inputId = `staff-cover-${bookTypeId}`;
  const hintId = `staff-cover-${bookTypeId}-hint`;
  const errorId = `staff-cover-${bookTypeId}-error`;
  const message = errorTemplate(state.error, copy);
  const describedBy = message ? `${hintId} ${errorId}` : hintId;
  return (
    <form className={styles.form} action={formAction} encType="multipart/form-data" noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          {copy.coverFile}
        </label>
        <input
          id={inputId}
          className={`${styles.control} ${styles.dateControl}`}
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={describedBy}
          aria-invalid={message ? true : undefined}
        />
        <p className={styles.hint} id={hintId}>
          {coverCopy(copy.coverHint)}
        </p>
        {message ? (
          <div className={styles.error} id={errorId} role="status">
            {coverCopy(message)}
          </div>
        ) : null}
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        {hasCover ? copy.coverReplace : copy.coverUpload}
      </button>
    </form>
  );
}
