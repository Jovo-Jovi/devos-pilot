import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, expect, it } from "vitest";

const rules = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../firestore.rules"), "utf8");

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!emulatorHost) {
    throw new Error("FIRESTORE_EMULATOR_HOST is not set: run node scripts/devos/firebase.mjs start");
  }
  const [host, portText] = emulatorHost.split(":");
  const port = Number(portText);
  testEnv = await initializeTestEnvironment({
    projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-devos",
    firestore: { rules, host, port },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

it("an unauthenticated client cannot get book_types/novels", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "book_types/novels")));
});

it("an unauthenticated client cannot list book_types", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, "book_types")));
});

it("an unauthenticated client cannot create book_types/rules-test", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, "book_types/rules-test"), { nameEn: "Rules test" }));
});

it("an unauthenticated client cannot update book_types/novels", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(updateDoc(doc(db, "book_types/novels"), { nameEn: "Changed" }));
});

it("an unauthenticated client cannot delete book_types/novels", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(deleteDoc(doc(db, "book_types/novels")));
});

it("an authenticated client with staff true cannot get book_types/novels", async () => {
  const db = testEnv.authenticatedContext("rules-test-account", { staff: true }).firestore();
  await assertFails(getDoc(doc(db, "book_types/novels")));
});

it("an authenticated client with staff true cannot list book_types", async () => {
  const db = testEnv.authenticatedContext("rules-test-account", { staff: true }).firestore();
  await assertFails(getDocs(collection(db, "book_types")));
});

it("an authenticated client with staff true cannot create book_types/rules-test", async () => {
  const db = testEnv.authenticatedContext("rules-test-account", { staff: true }).firestore();
  await assertFails(setDoc(doc(db, "book_types/rules-test"), { nameEn: "Rules test" }));
});

it("an authenticated client with staff true cannot get other_collection/any", async () => {
  const db = testEnv.authenticatedContext("rules-test-account", { staff: true }).firestore();
  await assertFails(getDoc(doc(db, "other_collection/any")));
});

it("with security rules disabled, book_types/novels exists and nameEn is Novels", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snapshot = await getDoc(doc(context.firestore(), "book_types/novels"));
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()?.nameEn).toBe("Novels");
  });
});
