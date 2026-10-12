"use client";

import { useActionState } from "react";
import { Bidi } from "@/components/Bidi";
import type { StaffFormState } from "./actions";
import styles from "./staff.module.css";

type SignInCopy = {
  emailLabel: string;
  emailHint: string;
  passwordLabel: string;
  passwordHint: string;
  signInSubmit: string;
  errorGeneric: string;
  errorRefused: string;
  errorLink: string;
};

const initialState: StaffFormState = { error: null };

export function SignInForm({
  action,
  copy,
  refused,
  linkError,
}: {
  action: (state: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  copy: SignInCopy;
  refused: boolean;
  linkError: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const emailHintId = "staff-email-hint";
  const passwordHintId = "staff-password-hint";
  const errorId = "staff-sign-in-error";
  const showError = state.error === "generic";
  return (
    <form className={styles.form} action={formAction} noValidate>
      {refused ? (
        <p className={styles.error} role="status">
          {copy.errorRefused}
        </p>
      ) : null}
      {linkError ? (
        <p className={styles.error} role="status">
          {copy.errorLink}
        </p>
      ) : null}
      {showError ? (
        <p className={styles.error} id={errorId} role="status">
          {copy.errorGeneric}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-email">
          {copy.emailLabel}
        </label>
        <div className={styles.bidiField}>
          <Bidi>
            <input
              className={styles.control}
              id="staff-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby={showError ? `${emailHintId} ${errorId}` : emailHintId}
            />
          </Bidi>
        </div>
        <p className={styles.hint} id={emailHintId}>
          {copy.emailHint}
        </p>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-password">
          {copy.passwordLabel}
        </label>
        <input
          className={styles.control}
          id="staff-password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={showError ? `${passwordHintId} ${errorId}` : passwordHintId}
        />
        <p className={styles.hint} id={passwordHintId}>
          {copy.passwordHint}
        </p>
      </div>
      <button className={styles.submit} type="submit" disabled={pending}>
        {copy.signInSubmit}
      </button>
    </form>
  );
}
