import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";

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
      let nextUrl = value ?? null;
      if (value && value.startsWith("data:")) {
        const photoRef = ref(storage, `users/${user.uid}/profile/photo.jpg`);
        await uploadString(photoRef, value, "data_url");
        nextUrl = await getDownloadURL(photoRef);
      }
      await setDoc(doc(db, "users", user.uid), { photoUrl: nextUrl }, { merge: true });
      setPhotoUrlState(nextUrl);
    },
    [user?.uid]
  );

  return { photoUrl, setPhotoUrl };
}
