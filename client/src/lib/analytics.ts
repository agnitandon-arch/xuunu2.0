import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const trackDailyActive = async (userId: string) => {
  const todayKey = getTodayKey();
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  const data = snapshot.data() ?? {};
  const lastActiveDay = typeof data.lastActiveDay === "string" ? data.lastActiveDay : null;
  const firstSeenAt = typeof data.firstSeenAt === "string" ? data.firstSeenAt : null;
  const isFirstSeen = !firstSeenAt;
  const isNewDay = lastActiveDay !== todayKey;
  const nowIso = new Date().toISOString();

  await setDoc(
    userRef,
    {
      lastActiveAt: nowIso,
      lastActiveDay: todayKey,
      ...(isFirstSeen ? { firstSeenAt: nowIso } : {}),
    },
    { merge: true }
  );

  if (!isNewDay) return;

  const dailyRef = doc(db, "analyticsDaily", todayKey);
  await setDoc(
    dailyRef,
    {
      date: todayKey,
      dau: increment(1),
      newUsers: increment(isFirstSeen ? 1 : 0),
      returningUsers: increment(isFirstSeen ? 0 : 1),
    },
    { merge: true }
  );
};

export const trackBioSignatureCompletion = async (userId: string) => {
  const todayKey = getTodayKey();
  const dailyRef = doc(db, "analyticsDaily", todayKey);
  await setDoc(
    dailyRef,
    {
      date: todayKey,
      bioSignatureCompletions: increment(1),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "users", userId),
    {
      lastBioSignatureAt: new Date().toISOString(),
    },
    { merge: true }
  );
};
