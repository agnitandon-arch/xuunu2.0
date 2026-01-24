import { useCallback, useEffect, useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { getDeviceImage, saveDeviceImage } from "@/lib/deviceImageStore";

export function useProfilePhoto() {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrlState] = useState<string | null>(null);

  const resizeDataUrl = (dataUrl: string, maxSize = 512, quality = 0.85) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = Math.max(image.width, image.height);
        if (maxDimension <= maxSize) {
          resolve(dataUrl);
          return;
        }
        const scale = maxSize / maxDimension;
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to resize image"));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = () => reject(new Error("Unable to load image"));
      image.src = dataUrl;
    });

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
        if (storedPhotoUrl || storedPhotoData) {
          setPhotoUrlState(storedPhotoUrl ?? storedPhotoData ?? user.photoURL ?? null);
          return;
        }
        void getDeviceImage(`profile-${user.uid}`).then((cached) => {
          if (cached) {
            setPhotoUrlState(cached);
          } else {
            setPhotoUrlState(user.photoURL ?? null);
          }
        });
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
      let resizedDataUrl: string | null = null;

      if (value && value.startsWith("data:")) {
        try {
          resizedDataUrl = await resizeDataUrl(value);
        } catch (error) {
          console.warn("Profile photo resize failed, using original.", error);
          resizedDataUrl = value;
        }
        try {
          const uploadDataUrl = resizedDataUrl ?? value;
          const photoRef = ref(storage, `users/${user.uid}/profile/${Date.now()}.jpg`);
          await uploadString(photoRef, uploadDataUrl, "data_url");
          nextUrl = await getDownloadURL(photoRef);
        } catch (error) {
          console.warn("Profile photo upload failed, saving to Firestore instead.", error);
          nextDataUrl = resizedDataUrl ?? value;
        }
      } else {
        nextUrl = value ?? null;
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          photoUrl: nextUrl,
          photoDataUrl: nextDataUrl,
          photoUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, "publicProfiles", user.uid),
        {
          displayName: user.displayName || user.email?.split("@")[0] || "Member",
          email: user.email ?? null,
          emailLower: user.email ? user.email.toLowerCase() : null,
          photoUrl: nextUrl ?? nextDataUrl ?? null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      if (resizedDataUrl) {
        await saveDeviceImage(`profile-${user.uid}`, resizedDataUrl);
      } else if (nextDataUrl) {
        await saveDeviceImage(`profile-${user.uid}`, nextDataUrl);
      }
      setPhotoUrlState(nextUrl ?? nextDataUrl);
      if (nextUrl) {
        try {
          await updateProfile(user, { photoURL: nextUrl });
        } catch (error) {
          console.warn("Failed to update auth profile photo.", error);
        }
      }
    },
    [user]
  );

  return { photoUrl, setPhotoUrl };
}
