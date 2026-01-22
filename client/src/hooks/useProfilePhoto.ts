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
        const storedPhotoUrl =
          typeof data.photoUrl === "string" && data.photoUrl.length > 0
            ? data.photoUrl
            : null;
        const storedPhotoData =
          typeof data.photoDataUrl === "string" && data.photoDataUrl.length > 0
            ? data.photoDataUrl
            : null;
        setPhotoUrlState(storedPhotoUrl ?? storedPhotoData ?? user.photoURL ?? null);
      },
      () => setPhotoUrlState(user.photoURL ?? null)
    );
    return unsubscribe;
  }, [user?.uid, user?.photoURL]);

  const setPhotoUrl = useCallback(
    async (value: string | null) => {
      if (!user?.uid) return;
      let nextUrl: string | null = null;
      let nextDataUrl: string | null = null;

      if (value && value.startsWith("data:")) {
        try {
          const photoRef = ref(storage, `users/${user.uid}/profile/photo.jpg`);
          await uploadString(photoRef, value, "data_url");
          nextUrl = await getDownloadURL(photoRef);
        } catch (error) {
          console.warn("Profile photo upload failed, saving to Firestore instead.", error);
          nextDataUrl = value;
        }
      } else {
        nextUrl = value ?? null;
      }

      await setDoc(
        doc(db, "users", user.uid),
        { photoUrl: nextUrl, photoDataUrl: nextDataUrl },
        { merge: true }
      );
      setPhotoUrlState(nextUrl ?? nextDataUrl);
    },
    [user?.uid]
  );

  return { photoUrl, setPhotoUrl };
}
