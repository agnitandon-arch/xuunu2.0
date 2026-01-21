import { ArrowLeft, Globe, Link, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileAvatar from "@/components/ProfileAvatar";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type DashboardConfig = {
  id: string;
  title: string;
  description: string;
  url: string;
};

type ChallengeRecord = {
  id: string;
  userId: string;
  type: "Hiking" | "Running" | "Biking";
  startedAt: string;
  endedAt: string;
  durationSec: number;
  stepsStart: number;
  stepsEnd: number;
  stepsDelta: number;
  startLocation: { lat: number; lng: number } | null;
  endLocation: { lat: number; lng: number } | null;
  autoStopped?: boolean;
  shared?: boolean;
};


interface PublicProfileScreenProps {
  onBack: () => void;
}

export default function PublicProfileScreen({ onBack }: PublicProfileScreenProps) {
  const { user } = useAuth();
  const env = import.meta.env as Record<string, string | undefined>;
  const [publicUrl, setPublicUrl] = useState("");
  const [sharedChallenges, setSharedChallenges] = useState<ChallengeRecord[]>([]);

  const dashboards: DashboardConfig[] = useMemo(
    () => [
      {
        id: "performance",
        title: "Performance Dashboard",
        description: "Training load, HRV, recovery, and readiness trends.",
        url:
          env.VITE_LOOKER_PERFORMANCE_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_PERFORMANCE_DASHBOARD_URL ||
          "",
      },
      {
        id: "health",
        title: "Health Dashboard",
        description: "Vitals, glucose stability, and metabolic patterns.",
        url:
          env.VITE_LOOKER_HEALTH_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_HEALTH_DASHBOARD_URL ||
          "",
      },
      {
        id: "recovery",
        title: "Recovery Dashboard",
        description: "Sleep quality, strain balance, and recovery insights.",
        url:
          env.VITE_LOOKER_RECOVERY_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_RECOVERY_DASHBOARD_URL ||
          "",
      },
      {
        id: "energy",
        title: "Energy Dashboard",
        description: "Nutrition, activity, and energy utilization trends.",
        url:
          env.VITE_LOOKER_ENERGY_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_ENERGY_DASHBOARD_URL ||
          "",
      },
    ],
    [env]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setSharedChallenges([]);
      return;
    }
    const ref = collection(db, "users", user.uid, "challenges");
    const challengeQuery = query(ref, orderBy("endedAt", "desc"));
    const unsubscribe = onSnapshot(
      challengeQuery,
      (snapshot) => {
        const challenges = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ChallengeRecord, "id">),
        }));
        setSharedChallenges(challenges.filter((challenge) => challenge.shared));
      },
      () => setSharedChallenges([])
    );
    return unsubscribe;
  }, [user?.uid]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const leaderboard = useMemo(() => {
    return [...sharedChallenges]
      .map((challenge) => ({
        ...challenge,
        pace: challenge.stepsDelta > 0 ? challenge.durationSec / challenge.stepsDelta : Infinity,
      }))
      .sort((a, b) => a.pace - b.pace);
  }, [sharedChallenges]);

  const sharedDashboards = dashboards;

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white"
          data-testid="button-back-to-share"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Share
        </button>

        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <ProfileAvatar className="h-20 w-20" />
          <div>
            <h1 className="text-xl font-semibold">
              {user?.displayName || user?.email?.split("@")[0] || "Your"} Public Profile
            </h1>
            <p className="text-xs text-white/50">
              Only dashboards you marked public appear here.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
            <Link className="h-3.5 w-3.5" />
            Public profile link
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate text-sm text-white/80 hover:text-white"
          >
            {publicUrl || "Generating link..."}
          </a>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Challenge Leaderboard
            </h2>
            <p className="text-xs text-white/50">
              Ranked by fastest time per step among shared challenges.
            </p>
          </div>
          {leaderboard.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No shared challenges yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {leaderboard.map((challenge, index) => (
                <div
                  key={challenge.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <p className="text-sm font-semibold">
                          #{index + 1} {challenge.type}
                        </p>
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        Time {formatDuration(challenge.durationSec)} • Steps{" "}
                        {challenge.stepsDelta.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-white/40">Pace</p>
                      <p className="text-sm font-mono text-white/80">
                        {challenge.pace === Infinity ? "--" : challenge.pace.toFixed(2)} sec/step
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Shared Dashboards
              </h2>
              <p className="text-xs text-white/50">Preview of your public-facing dashboards.</p>
            </div>
          </div>

          {sharedDashboards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              You have not shared any dashboards yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {sharedDashboards.map((dashboard) => (
                <div key={dashboard.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{dashboard.title}</h3>
                      <p className="text-xs text-white/60">{dashboard.description}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Globe className="h-3.5 w-3.5" />
                      Public
                    </span>
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
                    {dashboard.url ? (
                      <iframe
                        title={dashboard.title}
                        src={dashboard.url}
                        className="h-[360px] w-full"
                        style={{ border: "none" }}
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-xs text-white/50">
                        Dashboard URL not configured yet.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
