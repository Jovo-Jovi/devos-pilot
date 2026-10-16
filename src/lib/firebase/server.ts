import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * The server Firestore client (OD-11, 72-firebase). One app per process.
 * The emulator needs no credential. Production uses the read-only service account.
 * Neither value is logged.
 */
export function firestoreForServer(): Firestore {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId });
    } else {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
      initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });
    }
  }
  return getFirestore();
}
