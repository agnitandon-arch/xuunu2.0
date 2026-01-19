import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Copy, ExternalLink, Globe, Lock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";

type DashboardConfig = {
  id: string;
  title: string;
  description: string;
  url: string;
};

type ShareTarget = {
  id: "tiktok" | "facebook" | "x" | "instagram" | "whatsapp";
  label: string;
  requiresCopy?: boolean;
  buildUrl: (url: string, text: string) => string;
};

const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "tiktok",
    label: "TikTok",
    requiresCopy: true,
    buildUrl: () => "https://www.tiktok.com/",
  },
  {
    id: "facebook",
    label: "Facebook",
    buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "x",
    label: "X",
    buildUrl: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    requiresCopy: true,
    buildUrl: () => "https://www.instagram.com/",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    buildUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
];

export default function DataInsightsScreen() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shareUrl, setShareUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showProfileShare, setShowProfileShare] = useState(false);

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

  const [dashboardVisibility, setDashboardVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return dashboards.reduce((acc, dashboard) => ({ ...acc, [dashboard.id]: false }), {});
    }
    const stored = window.localStorage.getItem("xuunu-dashboard-visibility");
    if (stored) {
      try {
        return JSON.parse(stored) as Record<string, boolean>;
      } catch {
        return dashboards.reduce((acc, dashboard) => ({ ...acc, [dashboard.id]: false }), {});
      }
    }
    return dashboards.reduce((acc, dashboard) => ({ ...acc, [dashboard.id]: false }), {});
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    setShareUrl(currentUrl);
    const origin = window.location.origin;
    const profilePath = user?.uid ? `/app/profile/${user.uid}` : "/app/profile/sample";
    setProfileUrl(`${origin}${profilePath}`);
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("xuunu-dashboard-visibility", JSON.stringify(dashboardVisibility));
  }, [dashboardVisibility]);

  const weeklyDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (28 - index * 7));
      return date;
    });
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const buildTrend = (start: number, step: number) =>
    weeklyDates.map((date, index) => ({
      date: formatDate(date),
      value: Number((start + step * index).toFixed(1)),
    }));

  const terraCharts = [
    { id: "activity", title: "Activity Score", unit: "pts", data: buildTrend(62, 3.5) },
    { id: "sleep", title: "Sleep Duration", unit: "hrs", data: buildTrend(6.7, 0.3) },
    { id: "recovery", title: "Recovery", unit: "%", data: buildTrend(68, 2.8) },
    { id: "hrv", title: "HRV", unit: "ms", data: buildTrend(44, 2.2) },
    { id: "glucose", title: "Glucose Avg", unit: "mg/dL", data: buildTrend(138, 2.4) },
    { id: "nutrition", title: "Nutrition Score", unit: "pts", data: buildTrend(58, 3.1) },
    { id: "strain", title: "Strain", unit: "pts", data: buildTrend(10, 1.1) },
    { id: "weight", title: "Body Weight", unit: "lb", data: buildTrend(182, 0.4) },
  ];

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copied`,
        description: "Paste it into any app to share.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (target: ShareTarget, url: string, text: string) => {
    if (!url) {
      toast({
        title: "Link unavailable",
        description: "Please reload and try again.",
        variant: "destructive",
      });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Xuunu Progress", text, url });
        return;
      } catch {
        // fall back to platform-specific share URLs
      }
    }

    if (target.requiresCopy) {
      await copyToClipboard(url, "Share link");
    }

    const shareLink = target.buildUrl(url, text);
    window.open(shareLink, "_blank", "noopener,noreferrer");
  };

  const toggleDashboardVisibility = (id: string, value: boolean) => {
    setDashboardVisibility((prev) => ({ ...prev, [id]: value }));
    toast({
      title: value ? "Dashboard shared" : "Dashboard hidden",
      description: value
        ? "Your dashboard is now visible on your public profile."
        : "Only you can view this dashboard.",
    });
  };

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Share My Progress</h1>
              <p className="text-sm opacity-60">
                Share progress snapshots and dashboards with your community.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowShareOptions((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
            >
              <Share2 className="h-4 w-4" />
              Share this page
            </button>
          </div>

          {showShareOptions && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHARE_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() =>
                    handleShare(
                      target,
                      shareUrl,
                      "Check out my Xuunu progress and dashboards."
                    )
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  {target.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Public Profile
              </h2>
              <p className="text-xs text-white/50">Share your public progress profile.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.open(profileUrl || "/app/profile/sample", "_blank")}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview public profile
              </button>
              <button
                type="button"
                onClick={() => setShowProfileShare((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share profile
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
            <span className="truncate">{profileUrl || "Generating profile link..."}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(profileUrl, "Profile link")}
              className="inline-flex items-center gap-1 text-white/70 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          {showProfileShare && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHARE_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() =>
                    handleShare(
                      target,
                      profileUrl,
                      "See my Xuunu public profile and wellness progress."
                    )
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  {target.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Looker Studio Dashboards</h2>
              <p className="text-xs text-white/50">
                Toggle public visibility. Sample data is shown until dashboards load.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {dashboards.map((dashboard) => {
              const isPublic = dashboardVisibility[dashboard.id] ?? false;
              return (
                <div key={dashboard.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{dashboard.title}</h3>
                      <p className="text-xs text-white/60">{dashboard.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      {isPublic ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <Globe className="h-3.5 w-3.5" /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-white/50">
                          <Lock className="h-3.5 w-3.5" /> Private
                        </span>
                      )}
                      <Switch
                        checked={isPublic}
                        onCheckedChange={(value) => toggleDashboardVisibility(dashboard.id, value)}
                      />
                    </div>
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
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Terra Sync Trends</h2>
            <p className="text-xs text-white/50">
              Sample weekly data (every 7 days over the last month).
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {terraCharts.map((chart) => (
              <div key={chart.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{chart.title}</h3>
                    <p className="text-xs text-white/50">Terra sync data</p>
                  </div>
                  <span className="text-xs text-white/40">{chart.unit}</span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid #1f2937",
                          borderRadius: 8,
                          color: "#e2e8f0",
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
