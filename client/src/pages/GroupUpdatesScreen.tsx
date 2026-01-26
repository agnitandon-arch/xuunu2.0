import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ChallengeSummary = {
  type?: string;
  durationSec?: number;
  stepsDelta?: number;
};

type ChallengeScheduleSummary = {
  type?: string;
  scheduledFor?: string;
};

type GroupUpdate = {
  id: string;
  authorName: string;
  authorAvatar?: string;
  postedAt?: string;
  content: string;
  photos: string[];
  challenge?: ChallengeSummary;
  challengeSchedule?: ChallengeScheduleSummary;
};

interface GroupUpdatesScreenProps {
  groupId: string;
  groupName: string;
  onBack: () => void;
}

const normalizeDateValue = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    } catch {
      return null;
    }
  }
  return null;
};

const formatDate = (value?: string) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
};

export default function GroupUpdatesScreen({
  groupId,
  groupName,
  onBack,
}: GroupUpdatesScreenProps) {
  const [updates, setUpdates] = useState<GroupUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updatesRef = collection(db, "groups", groupId, "updates");
    const updatesQuery = query(updatesRef, orderBy("postedAt", "desc"));
    const unsubscribe = onSnapshot(
      updatesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<GroupUpdate>;
          const postedAt = normalizeDateValue(data.postedAt) ?? undefined;
          return {
            id: docSnap.id,
            authorName: data.authorName || "Member",
            authorAvatar: data.authorAvatar || "",
            postedAt,
            content: data.content || "",
            photos: Array.isArray(data.photos) ? data.photos : [],
            challenge: data.challenge,
            challengeSchedule: data.challengeSchedule,
          };
        });
        setUpdates(items);
        setIsLoading(false);
      },
      () => {
        setUpdates([]);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [groupId]);

  const challengeCount = useMemo(
    () =>
      updates.filter((item) => item.challenge || item.challengeSchedule).length,
    [updates]
  );

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-white/60 hover:text-white"
              data-testid="button-back-group"
            >
              Back to Profile
            </button>
            <h1 className="text-2xl font-bold mt-2">{groupName}</h1>
            <p className="text-xs text-white/50">Updates from group members.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-white/50">Challenges</p>
            <span className="text-xs text-white/60">{challengeCount} shared</span>
          </div>
          <p className="text-xs text-white/50">
            Join a new challenge to post progress to this group.
          </p>
        </section>

        <section className="space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xs text-white/50">
              Loading updates...
            </div>
          ) : updates.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xs text-white/50">
              No group updates yet.
            </div>
          ) : (
            updates.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {item.authorAvatar ? (
                      <img
                        src={item.authorAvatar}
                        alt={item.authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                        {item.authorName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.authorName}</p>
                    <p className="text-xs text-white/40">{formatDate(item.postedAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-white/80">{item.content}</p>
                {(item.challenge || item.challengeSchedule) && (
                  <div className="text-xs text-primary">
                    {item.challenge?.type || item.challengeSchedule?.type} Challenge
                  </div>
                )}
                {item.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {item.photos.map((photo, index) => (
                      <img
                        key={`${item.id}-${index}`}
                        src={photo}
                        alt="Group update"
                        className="h-24 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
