"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { Chart, type ChartConfiguration } from "chart.js/auto";
import {
  Activity,
  BarChart3,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  HeartPulse,
  Image as ImageIcon,
  Moon,
  TrendingUp,
  UploadCloud,
  User as UserIcon,
  Users,
  Zap,
} from "lucide-react";

import { auth, db } from "../../../lib/firebase/config";
import { isTerraLabsEnabled } from "../../../lib/featureFlags";

type ProfileData = {
  fullName?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  stats?: {
    totalActivities?: number;
    followers?: number;
    following?: number;
    currentStreak?: number;
  };
};

type ActivityItem = {
  id: string;
  type?: string;
  title?: string;
  createdAt?: unknown;
  date?: unknown;
  distance?: number;
  duration?: number;
  durationSeconds?: number;
  calories?: number;
  caloriesBurned?: number;
  photos?: string[];
  photoUrls?: string[];
  imageUrls?: string[];
  stats?: string;
};

type BiosignatureData = {
  score?: number;
  insights?: string[];
  metrics?: {
    energy?: number;
    recovery?: number;
    sleepQuality?: number;
    readiness?: number;
  };
  energy?: number;
  recovery?: number;
  sleepQuality?: number;
  readiness?: number;
};

type HealthDatum = Record<string, unknown>;

type VisibilityState = Record<string, boolean>;

const STAT_VISIBILITY_KEY = "xuunu:profile:stat-visibility";
const CHART_VISIBILITY_KEY = "xuunu:profile:chart-visibility";

const defaultStatVisibility: VisibilityState = {
  running: true,
  strength: true,
  sleep: true,
  hrv: true,
};

const defaultChartVisibility: VisibilityState = {
  trainingLoad: true,
  hrvTrend: true,
  energyOptimization: true,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatNumber = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "0";

const getWeekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getWeekStartDate = (date: Date) => {
  const start = getWeekStart(date);
  return start.toISOString().slice(0, 10);
};

const getDateWeeksAgo = (weeks: number) => {
  const now = new Date();
  now.setDate(now.getDate() - weeks * 7);
  now.setHours(0, 0, 0, 0);
  return now;
};

const parseDate = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === "object" &&
    value &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

const formatDuration = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0:00";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatTimeAgo = (date: Date | null) => {
  if (!date) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
};

const useLocalStorageState = <T,>(key: string, fallback: T) => {
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        setState(JSON.parse(stored) as T);
      } catch {
        setState(fallback);
      }
    }
  }, [key, fallback]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
};

const getMetricValue = (value: number | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }
  return Math.round(value).toString();
};

const getActivityIcon = (type?: string) => {
  const normalized = type?.toLowerCase() ?? "";
  if (normalized.includes("run")) return Activity;
  if (normalized.includes("strength") || normalized.includes("gym")) return Dumbbell;
  if (normalized.includes("sleep")) return Moon;
  if (normalized.includes("hrv") || normalized.includes("recovery")) return HeartPulse;
  return Activity;
};

const getActivityStats = (activity: ActivityItem) => {
  if (activity.stats) return activity.stats;
  const distance = activity.distance ?? 0;
  const duration = activity.durationSeconds ?? activity.duration ?? 0;
  const calories = activity.calories ?? activity.caloriesBurned ?? 0;
  const parts = [];
  if (distance) parts.push(`${formatNumber(distance, 1)} mi`);
  if (duration) parts.push(`${formatDuration(duration)}`);
  if (calories) parts.push(`${Math.round(calories)} cal`);
  return parts.length ? parts.join(" • ") : "No stats available";
};

const getActivityTitle = (activity: ActivityItem) =>
  activity.title || activity.type || "Activity";

const getChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 900, easing: "easeOutQuart" },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(10, 14, 25, 0.95)",
      borderColor: "rgba(0, 102, 255, 0.5)",
      borderWidth: 1,
      titleColor: "#e2e8f0",
      bodyColor: "#cbd5f5",
    },
  },
  scales: {
    x: {
      ticks: { color: "#9aa4b2" },
      grid: { color: "rgba(255, 255, 255, 0.08)" },
    },
    y: {
      ticks: { color: "#9aa4b2" },
      grid: { color: "rgba(255, 255, 255, 0.08)" },
    },
  },
});

function VisibilityToggle({
  isVisible,
  onToggle,
  label,
}: {
  isVisible: boolean;
  onToggle: () => void;
  label: string;
}) {
  const Icon = isVisible ? Eye : EyeOff;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
        isVisible
          ? "bg-[#0066ff]/20 text-[#6fa5ff]"
          : "bg-white/10 text-white/40"
      }`}
      aria-label={`${label} visibility toggle`}
    >
      <Icon className="h-3.5 w-3.5" />
      {isVisible ? "Visible" : "Hidden"}
    </button>
  );
}

function MetricBadge({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
        {label}
      </span>
      {loading ? (
        <div className="h-4 w-10 animate-pulse rounded-full bg-white/10" />
      ) : (
        <span className="text-lg font-semibold text-white">{value}</span>
      )}
    </div>
  );
}

function ChartCanvas({ config }: { config: ChartConfiguration }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    chartRef.current = new Chart(ctx, config);
    return () => {
      chartRef.current?.destroy();
    };
  }, [config]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    let time = 0;
    const render = () => {
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(0, 102, 255, 0.35)");
      gradient.addColorStop(1, "rgba(0, 102, 255, 0.05)");

      for (let layer = 0; layer < 3; layer += 1) {
        ctx.beginPath();
        const amplitude = 18 + layer * 6;
        const frequency = 0.008 + layer * 0.002;
        const yOffset = height * (0.3 + layer * 0.2);
        for (let x = 0; x <= width; x += 8) {
          const y = yOffset + Math.sin(x * frequency + time + layer) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5 - layer * 0.12;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileUserId = typeof params?.userId === "string" ? params.userId : "";

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [biosignature, setBiosignature] = useState<BiosignatureData | null>(null);
  const [healthData, setHealthData] = useState<HealthDatum[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isWidgetLoading, setIsWidgetLoading] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [terraError, setTerraError] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingBiosignature, setLoadingBiosignature] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const [statVisibility, setStatVisibility] = useLocalStorageState(
    STAT_VISIBILITY_KEY,
    defaultStatVisibility
  );
  const [chartVisibility, setChartVisibility] = useLocalStorageState(
    CHART_VISIBILITY_KEY,
    defaultChartVisibility
  );

  const isOwnProfile = authUser?.uid === profileUserId;
  const terraLabsEnabled = isTerraLabsEnabled();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      setAuthUser(user);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!profileUserId) return;
    let isMounted = true;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const userDoc = await getDoc(doc(db, "users", profileUserId));
        const userData = userDoc.exists() ? (userDoc.data() as ProfileData) : null;
        if (isMounted) {
          setProfile(userData);
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const activitiesQuery = query(
          collection(db, "activities"),
          where("userId", "==", profileUserId),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const activitiesSnap = await getDocs(activitiesQuery);
        const activitiesData = activitiesSnap.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<ActivityItem, "id">),
        }));
        if (isMounted) {
          setActivities(activitiesData);
        }
      } finally {
        if (isMounted) setLoadingActivities(false);
      }
    };

    const fetchBiosignature = async () => {
      setLoadingBiosignature(true);
      try {
        const thisWeek = getWeekStartDate(new Date());
        const biosigDoc = await getDoc(
          doc(db, "biosignatures", `${profileUserId}_${thisWeek}`)
        );
        if (isMounted) {
          setBiosignature(biosigDoc.exists() ? (biosigDoc.data() as BiosignatureData) : null);
        }
      } finally {
        if (isMounted) setLoadingBiosignature(false);
      }
    };

    const fetchHealthData = async () => {
      setLoadingHealth(true);
      try {
        const startDate = getDateWeeksAgo(12).toISOString().split("T")[0];
        const healthQuery = query(
          collection(db, "healthData"),
          where("userId", "==", profileUserId),
          where("date", ">=", startDate),
          orderBy("date", "asc")
        );
        const healthSnap = await getDocs(healthQuery);
        const healthEntries = healthSnap.docs.map((document) => document.data() as HealthDatum);
        if (isMounted) {
          setHealthData(healthEntries);
        }
      } finally {
        if (isMounted) setLoadingHealth(false);
      }
    };

    fetchProfile();
    fetchActivities();
    fetchBiosignature();
    fetchHealthData();

    return () => {
      isMounted = false;
    };
  }, [profileUserId]);

  useEffect(() => {
    if (!authUser || isOwnProfile || !profileUserId) return;
    let isMounted = true;

    const fetchFollowState = async () => {
      const followDoc = await getDoc(
        doc(db, "follows", `${authUser.uid}_${profileUserId}`)
      );
      if (isMounted) {
        setIsFollowing(followDoc.exists());
      }
    };

    fetchFollowState();
    return () => {
      isMounted = false;
    };
  }, [authUser, isOwnProfile, profileUserId]);

  const handleFollowToggle = async () => {
    if (!authUser || isOwnProfile || !profileUserId) return;
    const followId = `${authUser.uid}_${profileUserId}`;
    const followRef = doc(db, "follows", followId);

    if (isFollowing) {
      await deleteDoc(followRef);
      setIsFollowing(false);
      return;
    }

    await setDoc(followRef, {
      followerId: authUser.uid,
      followingId: profileUserId,
      createdAt: new Date().toISOString(),
    });
    setIsFollowing(true);
  };

  const handleUploadBloodwork = async () => {
    if (!authUser) return;
    if (!terraLabsEnabled) {
      setTerraError("Terra Labs is currently disabled.");
      return;
    }

    setIsWidgetLoading(true);
    setTerraError(null);
    try {
      const response = await fetch("/api/terra/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.uid, mode: "labs" }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to open Terra Labs.");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Missing Terra widget URL.");
      }

      setWidgetUrl(data.url);
      setIsWidgetOpen(true);
    } catch (error) {
      setTerraError(
        error instanceof Error ? error.message : "Unable to connect Terra Labs."
      );
    } finally {
      setIsWidgetLoading(false);
    }
  };

  const profileStats = profile?.stats || {};
  const displayName =
    profile?.fullName || profile?.displayName || "Anonymous User";
  const bio = profile?.bio || "No bio yet.";

  const score = clamp(Math.round(biosignature?.score ?? 0), 0, 100);
  const insights = biosignature?.insights ?? [];
  const metrics = biosignature?.metrics ?? {};

  const weeklyStatCards = [
    {
      key: "running",
      label: "Running",
      value: "24.3 mi | 5 runs • 3:42:15 total",
      icon: Activity,
    },
    {
      key: "strength",
      label: "Strength",
      value: "4 sessions | 6.2 hours • 2,450 cal",
      icon: Dumbbell,
    },
    {
      key: "sleep",
      label: "Sleep",
      value: "7.8h average • 92% quality",
      icon: Moon,
    },
    {
      key: "hrv",
      label: "HRV",
      value: "68 average • +8% vs last week",
      icon: HeartPulse,
    },
  ];

  const photoUrls = useMemo(() => {
    const urls = activities.flatMap((activity) => [
      ...(activity.photos ?? []),
      ...(activity.photoUrls ?? []),
      ...(activity.imageUrls ?? []),
    ]);
    return urls.filter(Boolean).slice(0, 6);
  }, [activities]);

  const trainingLoadSeries = useMemo(() => {
    const weeks = Array.from({ length: 12 }, (_, index) => {
      const date = getDateWeeksAgo(11 - index);
      return {
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        start: getWeekStart(date),
      };
    });

    const values = weeks.map((week) => {
      const weekEnd = new Date(week.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const totalSteps = healthData.reduce((sum, entry) => {
        const entryDate = parseDate(entry.date);
        if (!entryDate) return sum;
        if (entryDate >= week.start && entryDate <= weekEnd) {
          return sum + (typeof entry.steps === "number" ? entry.steps : 0);
        }
        return sum;
      }, 0);
      return Math.round(totalSteps / 1000);
    });

    return { labels: weeks.map((week) => week.label), values };
  }, [healthData]);

  const hrvSeries = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const date = getDateWeeksAgo(7 - index);
      return {
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        start: getWeekStart(date),
      };
    });

    const values = weeks.map((week) => {
      const weekEnd = new Date(week.start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const entries = healthData.filter((entry) => {
        const entryDate = parseDate(entry.date);
        return entryDate && entryDate >= week.start && entryDate <= weekEnd;
      });
      const avg =
        entries.reduce((sum, entry) => sum + (typeof entry.hrv === "number" ? entry.hrv : 0), 0) /
        (entries.filter((entry) => typeof entry.hrv === "number").length || 1);
      return Math.round(avg || 0);
    });

    return { labels: weeks.map((week) => week.label), values };
  }, [healthData]);

  const energySeries = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    const values = dates.map((date) => {
      const dateKey = date.toISOString().split("T")[0];
      const entry = healthData.find((item) => item.date === dateKey);
      const glucose = typeof entry?.glucoseFasting === "number" ? entry.glucoseFasting : 0;
      return Math.round(glucose);
    });
    return {
      labels: dates.map((date) =>
        date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      ),
      values,
    };
  }, [healthData]);

  const trainingLoadConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "bar",
      data: {
        labels: trainingLoadSeries.labels,
        datasets: [
          {
            data: trainingLoadSeries.values,
            backgroundColor: "rgba(0, 102, 255, 0.45)",
            borderRadius: 8,
          },
        ],
      },
      options: {
        ...getChartOptions(),
        scales: {
          ...getChartOptions().scales,
          y: {
            ...getChartOptions().scales?.y,
            ticks: { color: "#9aa4b2" },
          },
        },
      },
    }),
    [trainingLoadSeries]
  );

  const hrvConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      data: {
        labels: hrvSeries.labels,
        datasets: [
          {
            data: hrvSeries.values,
            borderColor: "#0066ff",
            backgroundColor: "rgba(0, 102, 255, 0.2)",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: getChartOptions(),
    }),
    [hrvSeries]
  );

  const energyConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      data: {
        labels: energySeries.labels,
        datasets: [
          {
            data: energySeries.values,
            borderColor: "#6fa5ff",
            backgroundColor: "rgba(111, 165, 255, 0.2)",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: getChartOptions(),
    }),
    [energySeries]
  );

  if (!profileUserId) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-sm text-white/60">Profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-white/15 bg-[#0b1224]">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40">
                    <UserIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{displayName}</h1>
                <p className="mt-1 text-sm text-white/60">{bio}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => router.push("/onboarding")}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  className="rounded-full bg-[#0066ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1a75ff]"
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <Flame className="h-4 w-4 text-[#6fa5ff]" />
                Activities
              </div>
              <p className="mt-3 text-xl font-semibold">
                {profileStats.totalActivities ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <Users className="h-4 w-4 text-[#6fa5ff]" />
                Followers
              </div>
              <p className="mt-3 text-xl font-semibold">
                {profileStats.followers ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <Users className="h-4 w-4 text-[#6fa5ff]" />
                Following
              </div>
              <p className="mt-3 text-xl font-semibold">
                {profileStats.following ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
                <Zap className="h-4 w-4 text-[#6fa5ff]" />
                Streak
              </div>
              <p className="mt-3 text-xl font-semibold">
                {profileStats.currentStreak ?? 0} days
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Settings</h3>
            {terraError && (
              <span className="text-xs text-red-300">{terraError}</span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleUploadBloodwork}
              disabled={isWidgetLoading || !terraLabsEnabled}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-[#0066ff]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0066ff]/20 text-[#6fa5ff]">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Upload Bloodwork</p>
                  <p className="text-xs text-white/60">
                    Connect Quest, LabCorp, or other lab providers.
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/50">
                {isWidgetLoading ? "Connecting..." : "Connect"}
              </span>
            </button>
            {!terraLabsEnabled && (
              <p className="text-xs text-white/50">
                Enable Terra Labs to upload bloodwork.
              </p>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-[#0f3a85] bg-[#1a1a1a] p-8 shadow-[0_0_40px_rgba(0,102,255,0.2)]">
          <div className="absolute inset-0 opacity-50">
            <WaveCanvas />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full animate-spin-slow">
                    <defs>
                      <linearGradient id="biosigGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0066ff" />
                        <stop offset="100%" stopColor="#6fa5ff" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="url(#biosigGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="relative z-10 text-center">
                    <p className="text-4xl font-bold text-white">{score}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Score
                    </p>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">🧬 Your Biosignature</h2>
                  <p className="mt-2 text-sm text-white/70 max-w-sm">
                    Your unique performance pattern - updated every 7 days
                  </p>
                  {!loadingBiosignature && !biosignature && (
                    <p className="mt-2 text-xs text-white/50">
                      Your biosignature is being calculated... Check back in 7 days.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricBadge
                  label="Energy"
                  value={getMetricValue(metrics.energy)}
                  loading={loadingBiosignature}
                />
                <MetricBadge
                  label="Recovery"
                  value={getMetricValue(metrics.recovery)}
                  loading={loadingBiosignature}
                />
                <MetricBadge
                  label="Sleep"
                  value={getMetricValue(metrics.sleepQuality)}
                  loading={loadingBiosignature}
                />
                <MetricBadge
                  label="Readiness"
                  value={getMetricValue(metrics.readiness)}
                  loading={loadingBiosignature}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {loadingBiosignature && (
                <>
                  <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
                  <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
                </>
              )}
              {!loadingBiosignature &&
                (insights.length ? insights.slice(0, 2) : [
                  "Your biosignature is syncing with your latest metrics.",
                  "Log more sleep and recovery data for sharper insights.",
                ]).map((insight, index) => (
                  <div
                    key={`${insight}-${index}`}
                    className="rounded-3xl border border-[#0f3a85] bg-[#0b1b3c]/60 p-6 shadow-[0_0_30px_rgba(0,102,255,0.15)]"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[#6fa5ff]">
                      Insight {index + 1}
                    </p>
                    <p className="mt-4 text-sm text-white/70">{insight}</p>
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">This Week Stats</h3>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {weeklyStatCards.map((card) => {
              const Icon = card.icon;
              const isVisible = statVisibility[card.key] ?? true;
              return (
                <div
                  key={card.key}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0066ff]/20 text-[#6fa5ff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{card.label}</p>
                        <p className="mt-1 text-sm text-white/60">
                          {loadingActivities
                            ? "Loading..."
                            : isVisible
                            ? card.value
                            : "🔒 Hidden"}
                        </p>
                      </div>
                    </div>
                    <VisibilityToggle
                      isVisible={isVisible}
                      onToggle={() =>
                        setStatVisibility((prev) => ({
                          ...prev,
                          [card.key]: !isVisible,
                        }))
                      }
                      label={card.label}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recent Activities</h3>
            <span className="text-sm text-white/50">Last 10 activities</span>
          </div>
          <div className="mt-6 space-y-3">
            {loadingActivities &&
              new Array(4).fill(null).map((_, index) => (
                <div
                  key={`activity-skeleton-${index}`}
                  className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            {!loadingActivities &&
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <Link
                    key={activity.id}
                    href={`/activity/${activity.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-[#0066ff]/40 hover:bg-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0066ff]/15 text-[#6fa5ff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {getActivityTitle(activity)}
                        </p>
                        <p className="text-xs text-white/60">
                          {getActivityStats(activity)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-white/50">
                      {formatTimeAgo(parseDate(activity.createdAt ?? activity.date))}
                    </span>
                  </Link>
                );
              })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Activity Photos</h3>
            <span className="text-sm text-white/50">Latest captures</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {photoUrls.length === 0 && !loadingActivities && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-10 text-white/60">
                <ImageIcon className="h-8 w-8" />
                <p className="mt-3 text-sm">No activity photos yet.</p>
              </div>
            )}
            {loadingActivities &&
              new Array(6).fill(null).map((_, index) => (
                <div
                  key={`photo-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            {photoUrls.map((url, index) => (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden rounded-2xl border border-white/10"
              >
                <img
                  src={url}
                  alt={`Activity photo ${index + 1}`}
                  className="h-28 w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Performance Trends</h3>
            <span className="text-sm text-white/50">Last 12 weeks</span>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {[
              {
                key: "trainingLoad",
                title: "Training Load",
                subtitle: "12 weeks bar chart",
                icon: BarChart3,
                config: trainingLoadConfig,
              },
              {
                key: "hrvTrend",
                title: "HRV Trend",
                subtitle: "8 weeks line chart",
                icon: TrendingUp,
                config: hrvConfig,
              },
              {
                key: "energyOptimization",
                title: "Energy Optimization",
                subtitle: "glucose 7 days line chart",
                icon: Zap,
                config: energyConfig,
              },
            ].map((chart) => {
              const Icon = chart.icon;
              const isVisible = chartVisibility[chart.key] ?? true;
              return (
                <div
                  key={chart.key}
                  className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0066ff]/20 text-[#6fa5ff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{chart.title}</p>
                        <p className="text-xs text-white/60">{chart.subtitle}</p>
                      </div>
                    </div>
                    <VisibilityToggle
                      isVisible={isVisible}
                      onToggle={() =>
                        setChartVisibility((prev) => ({
                          ...prev,
                          [chart.key]: !isVisible,
                        }))
                      }
                      label={chart.title}
                    />
                  </div>
                  <div className="relative h-44 rounded-2xl border border-white/10 bg-[#0b1224] p-3">
                    {loadingHealth ? (
                      <div className="h-full w-full animate-pulse rounded-2xl bg-white/5" />
                    ) : isVisible ? (
                      <ChartCanvas config={chart.config} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                        🔒 Hidden
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {isWidgetOpen && widgetUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Terra Labs</p>
              <button
                type="button"
                onClick={() => setIsWidgetOpen(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Close
              </button>
            </div>
            <iframe
              title="Terra Labs Widget"
              src={widgetUrl}
              className="h-[70vh] w-full"
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
