import { NextResponse } from "next/server";
import {
  collection,
  getDocs,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { calculateBiosignatureForUser, MIN_DAYS_REQUIRED } from "../lib";

export const runtime = "nodejs";

const MAX_INACTIVE_DAYS = 30;

export async function GET() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const activeUsers = usersSnap.docs.filter((docSnap) =>
      isActiveUser(docSnap.data() as Record<string, unknown>),
    );

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const userDoc of activeUsers) {
      const userId = resolveUserId(userDoc);
      if (!userId) {
        errors += 1;
        continue;
      }

      try {
        const result = await calculateBiosignatureForUser(userId);
        if (result.status === "insufficient-data") {
          skipped += 1;
          continue;
        }

        processed += 1;
      } catch (error) {
        errors += 1;
        console.error("Biosignature cron calculation failed:", error);
      }
    }

    return NextResponse.json({
      processed,
      skipped,
      errors,
      totalUsers: usersSnap.size,
      activeUsers: activeUsers.length,
      minimumDaysRequired: MIN_DAYS_REQUIRED,
    });
  } catch (error) {
    console.error("Biosignature cron execution error:", error);
    return NextResponse.json(
      { error: "Cron calculation failed" },
      { status: 500 },
    );
  }
}

function resolveUserId(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): string | null {
  const data = docSnap.data() as Record<string, unknown>;
  const userId =
    typeof data.userId === "string" && data.userId.trim()
      ? data.userId.trim()
      : typeof data.uid === "string" && data.uid.trim()
        ? data.uid.trim()
        : docSnap.id;

  return userId || null;
}

function isActiveUser(data: Record<string, unknown>): boolean {
  if (typeof data.isActive === "boolean") {
    return data.isActive;
  }

  if (typeof data.status === "string") {
    return data.status.toLowerCase() === "active";
  }

  const lastActive = normalizeDate(
    data.lastActiveAt ?? data.lastLoginAt ?? data.updatedAt,
  );
  if (!lastActive) {
    return true;
  }

  const diffMs = Date.now() - lastActive.getTime();
  return diffMs <= MAX_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
}

function normalizeDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}
