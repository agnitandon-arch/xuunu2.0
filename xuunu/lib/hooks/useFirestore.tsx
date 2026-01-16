'use client';

import { useMemo } from "react";
import { firebaseDb } from "@/lib/firebase/firestore";

export function useFirestore() {
  return useMemo(() => firebaseDb, []);
}
