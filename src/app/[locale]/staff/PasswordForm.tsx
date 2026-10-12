"use client";

import { useActionState } from "react";
import type { StaffFormState } from "./actions";
import styles from "./staff.module.css";

type PasswordCopy = {
  newPasswordLabel: string;
  newPasswordHint: string;
  confirmPasswordLabel: string;
  confirmPasswordHint: string;
  passwordSubmit: string;
  errorMismatch: string;
  errorPassword: string;
};

const initialState: StaffFormState = { error: null };

export function PasswordForm({
  action,
  copy,
}: {
  action: (state: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  copy: PasswordCopy;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const newHintId = "staff-new-password-hint";
  const confirmHintId = "staff-confirm-password-hint";
  const errorId = "staff-password-error";
  const message =
    state.error === "mismatch"
      ? copy.errorMismatch
      : state.error === "password"
        ? copy.errorPassword
        : null;
  const newDescribedBy = message ? `${newHintId} ${errorId}` : newHintId;
  const confirmDescribedBy = message ? `${confirmHintId} ${errorId}` : confirmHintId;
  return (
    <form className={styles.form} action={formAction} noValidate>
      {message ? (
        <p className={styles.error} id={errorId} role="status">
          {message}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-new-password">
          {copy.newPasswordLabel}
        </label>
        <input
          className={styles.control}
          id="staff-new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-describedby={newDescribedBy}
        />
        <p className={styles.hint} id={newHintId}>
          {copy.newPasswordHint}
        </p>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-confirm-password">
          {copy.confirmPasswordLabel}
        </label>
        <input
          className={styles.control}
          id="staff-confirm-password"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          aria-describedby={confirmDescribedBy}
        />
        <p className={styles.hint} id={confirmHintId}>
          {copy.confirmPasswordHint}
        </p>
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        {copy.passwordSubmit}
      </button>
    </form>
  );
}
