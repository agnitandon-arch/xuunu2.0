import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "xuunu-profile-photo";
const EVENT_NAME = "xuunu-profile-photo-change";

const getStoredPhoto = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
};

const notifyChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
};

export function useProfilePhoto() {
  const [photoUrl, setPhotoUrlState] = useState<string | null>(() => getStoredPhoto());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setPhotoUrlState(event.newValue);
      }
    };
    const handleCustom = () => setPhotoUrlState(getStoredPhoto());

    window.addEventListener("storage", handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(EVENT_NAME, handleCustom);
    };
  }, []);

  const setPhotoUrl = useCallback((value: string | null) => {
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setPhotoUrlState(value);
    notifyChange();
  }, []);

  return { photoUrl, setPhotoUrl };
}
