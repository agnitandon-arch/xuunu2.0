import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type { UserProfile, Activity, HealthData, Biosignature } from '@/types';

// User Profile Functions
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function createUserProfile(
  userId: string,
  data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Activity Functions
export async function createActivity(
  activity: Omit<Activity, 'id' | 'createdAt'>
): Promise<string> {
  const collectionRef = collection(db, 'activities');
  const newDocRef = doc(collectionRef);

  await setDoc(newDocRef, {
    ...activity,
    createdAt: serverTimestamp(),
  });

  return newDocRef.id;
}

export async function getActivities(
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ activities: Activity[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'activities'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const activities = snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
    createdAt:
      docSnapshot.data().createdAt?.toDate().toISOString() ||
      new Date().toISOString(),
  })) as Activity[];

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { activities, lastDoc: newLastDoc };
}

export async function getUserActivities(userId: string): Promise<Activity[]> {
  const q = query(
    collection(db, 'activities'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
    createdAt:
      docSnapshot.data().createdAt?.toDate().toISOString() ||
      new Date().toISOString(),
  })) as Activity[];
}

// Health Data Functions
export async function saveHealthData(
  userId: string,
  date: string,
  data: Partial<HealthData>
): Promise<void> {
  const docId = `${userId}_${date}`;
  const docRef = doc(db, 'healthData', docId);

  await setDoc(
    docRef,
    {
      userId,
      date,
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getHealthDataRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HealthData[]> {
  const q = query(
    collection(db, 'healthData'),
    where('userId', '==', userId),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  })) as HealthData[];
}

// Biosignature Functions
export async function saveBiosignature(
  userId: string,
  weekStart: string,
  data: Omit<Biosignature, 'id' | 'userId' | 'weekStartDate' | 'calculatedAt'>
): Promise<void> {
  const docId = `${userId}_${weekStart}`;
  const docRef = doc(db, 'biosignatures', docId);

  await setDoc(docRef, {
    userId,
    weekStartDate: weekStart,
    ...data,
    calculatedAt: serverTimestamp(),
  });
}

export async function getBiosignature(
  userId: string,
  weekStart: string
): Promise<Biosignature | null> {
  const docId = `${userId}_${weekStart}`;
  const docRef = doc(db, 'biosignatures', docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Biosignature;
  }
  return null;
}

// Like/Unlike Functions
export async function likeActivity(
  activityId: string,
  userId: string
): Promise<void> {
  const likeId = `${userId}_${activityId}`;
  const likeRef = doc(db, 'activityLikes', likeId);

  await setDoc(likeRef, {
    activityId,
    userId,
    createdAt: serverTimestamp(),
  });

  // Increment like count
  const activityRef = doc(db, 'activities', activityId);
  const activitySnap = await getDoc(activityRef);
  if (activitySnap.exists()) {
    const currentCount = activitySnap.data().likeCount || 0;
    await updateDoc(activityRef, { likeCount: currentCount + 1 });
  }
}

export async function unlikeActivity(
  activityId: string,
  userId: string
): Promise<void> {
  const likeId = `${userId}_${activityId}`;
  const likeRef = doc(db, 'activityLikes', likeId);

  await deleteDoc(likeRef);

  // Decrement like count
  const activityRef = doc(db, 'activities', activityId);
  const activitySnap = await getDoc(activityRef);
  if (activitySnap.exists()) {
    const currentCount = activitySnap.data().likeCount || 0;
    await updateDoc(activityRef, { likeCount: Math.max(0, currentCount - 1) });
  }
}
