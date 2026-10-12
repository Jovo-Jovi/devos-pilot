"use client";

import { useActionState } from "react";
import { Bidi } from "@/components/Bidi";
import type { StaffFormState } from "./actions";
import styles from "./staff.module.css";

type MfaCopy = {
  codeLabel: string;
  codeHint: string;
  verifySubmit: string;
  errorCode: string;
  secretLabel: string;
  secretHint: string;
  qrLabel: string;
};

const initialState: StaffFormState = { error: null };

export function MfaForm({
  action,
  copy,
  factorId,
  secret,
  qr,
}: {
  action: (state: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  copy: MfaCopy;
  factorId: string;
  secret: string | null;
  qr: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const hintId = "staff-code-hint";
  const errorId = "staff-code-error";
  const secretHintId = "staff-secret-hint";
  const showError = state.error === "code";
  const qrSrc = qr?.startsWith("data:image/") ? qr : null;
  return (
    <form className={styles.form} action={formAction} noValidate>
      {secret ? (
        <div className={styles.field}>
          {qrSrc ? (
            // The enrolment QR is an SVG data URL from Auth. next/image does not render it.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.qr} src={qrSrc} alt={copy.qrLabel} />
          ) : null}
          <p className={styles.secret} id="staff-totp-secret">
            <span className={styles.label}>{copy.secretLabel}</span>
            <Bidi>{secret}</Bidi>
          </p>
          <p className={styles.hint} id={secretHintId}>
            {copy.secretHint}
          </p>
        </div>
      ) : null}
      {showError ? (
        <p className={styles.error} id={errorId} role="status">
          {copy.errorCode}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-code">
          {copy.codeLabel}
        </label>
        <div className={styles.bidiField}>
          <Bidi>
            <input
              className={styles.control}
              id="staff-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
            />
          </Bidi>
        </div>
        <p className={styles.hint} id={hintId}>
          {copy.codeHint}
        </p>
      </div>
      <input type="hidden" name="factorId" value={factorId} />
      <button className={styles.submit} type="submit" disabled={pending}>
        {copy.verifySubmit}
      </button>
    </form>
  );
}
