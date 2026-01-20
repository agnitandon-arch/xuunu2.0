import { ArrowLeft, Globe, Lock } from "lucide-react";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type FriendProfile = {
  id: string;
  name: string;
  status: string;
  avatarUrl?: string;
  sharedDashboards: Record<string, boolean>;
};

type DashboardConfig = {
  id: string;
  title: string;
  description: string;
  url: string;
};

interface FriendProfileScreenProps {
  friend: FriendProfile | null;
  onBack: () => void;
}

export default function FriendProfileScreen({ friend, onBack }: FriendProfileScreenProps) {
  const env = import.meta.env as Record<string, string | undefined>;

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

  const sharedDashboards = friend
    ? dashboards.filter((dashboard) => friend.sharedDashboards[dashboard.id])
    : [];

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white"
          data-testid="button-back-to-account"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </button>

        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <Avatar className="h-14 w-14">
            {friend?.avatarUrl ? <AvatarImage src={friend.avatarUrl} alt={friend.name} /> : null}
            <AvatarFallback className="bg-white/10 text-sm text-white/70">
              {friend?.name?.charAt(0) || "F"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{friend?.name || "Friend Profile"}</h1>
            <p className="text-xs text-white/50">{friend?.status || "Public dashboards"}</p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Shared Dashboards
              </h2>
              <p className="text-xs text-white/50">
                Only dashboards marked public are shown here.
              </p>
            </div>
          </div>

          {sharedDashboards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              This friend has not shared any dashboards yet.
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

          {friend && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Lock className="h-3.5 w-3.5" />
              Private dashboards remain hidden.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
