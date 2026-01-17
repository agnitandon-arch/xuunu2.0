import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = buildFirebaseConfig();
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);

function buildFirebaseConfig(): FirebaseOptions {
  const env = typeof process !== "undefined" ? process.env : {};

  const projectId =
    env.FIREBASE_PROJECT_ID ??
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    env.VITE_FIREBASE_PROJECT_ID ??
    "";
  const apiKey =
    env.FIREBASE_API_KEY ??
    env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    env.VITE_FIREBASE_API_KEY ??
    "";
  const appId =
    env.FIREBASE_APP_ID ??
    env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    env.VITE_FIREBASE_APP_ID ??
    "";

  const authDomain =
    env.FIREBASE_AUTH_DOMAIN ??
    (projectId ? `${projectId}.firebaseapp.com` : "");
  const storageBucket =
    env.FIREBASE_STORAGE_BUCKET ??
    (projectId ? `${projectId}.firebasestorage.app` : "");

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    appId,
  };
}
