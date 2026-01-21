import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

export function useProfilePhoto() {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrlState] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setPhotoUrlState(user?.photoURL ?? null);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const data = snapshot.data() ?? {};
        const storedPhoto =
          typeof data.photoUrl === "string" && data.photoUrl.length > 0
            ? data.photoUrl
            : null;
        setPhotoUrlState(storedPhoto ?? user.photoURL ?? null);
      },
      () => setPhotoUrlState(user.photoURL ?? null)
    );
    return unsubscribe;
  }, [user?.uid, user?.photoURL]);

  const setPhotoUrl = useCallback(
    async (value: string | null) => {
      if (!user?.uid) return;
      await setDoc(doc(db, "users", user.uid), { photoUrl: value ?? null }, { merge: true });
      setPhotoUrlState(value);
    },
    [user?.uid]
  );

  return { photoUrl, setPhotoUrl };
}
