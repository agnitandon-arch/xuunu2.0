import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const projectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID ||
  import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "xuunu-november";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((error) => {
    if (error?.code === "failed-precondition") {
      console.warn("Firestore persistence failed: multiple tabs open.");
      return;
    }
    if (error?.code === "unimplemented") {
      console.warn("Firestore persistence unavailable in this browser.");
      return;
    }
    console.warn("Firestore persistence failed.", error);
  });
}
export const storage = getStorage(app);
