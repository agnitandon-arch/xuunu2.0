"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Chart, ChartConfiguration } from "chart.js/auto";
import {
  Activity,
  BarChart3,
  Dumbbell,
  Eye,
  EyeOff,
  HeartPulse,
  Image as ImageIcon,
  Moon,
  TrendingUp,
  Zap,
} from "lucide-react";

import { auth, db } from "../../../lib/firebase";

type UserProfile = {
  displayName?: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  photoURL?: string;
  followersCount?: number;
  followingCount?: number;
  streakDays?: number;
  followers?: string[];
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

type Biosignature = {
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
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
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
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = Array.isArray(params?.userId)
    ? params?.userId[0]
    : (params?.userId as string | undefined);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [biosignature, setBiosignature] = useState<Biosignature | null>(null);
  const [healthData, setHealthData] = useState<HealthDatum[]>([]);

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

  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (isMounted) {
          setUserProfile(userDoc.exists() ? (userDoc.data() as UserProfile) : null);
        }
      } catch (error) {
        console.error("Failed to load user profile", error);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const activitiesQuery = query(
          collection(db, "activities"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(activitiesQuery);
        if (isMounted) {
          setActivities(
            snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as ActivityItem),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load activities", error);
      } finally {
        if (isMounted) {
          setLoadingActivities(false);
        }
      }
    };

    const fetchBiosignature = async () => {
      setLoadingBiosignature(true);
      try {
        const thisWeek = getWeekStartDate(new Date());
        const biosigDoc = await getDoc(
          doc(db, "biosignatures", `${userId}_${thisWeek}`)
        );
        if (isMounted) {
          setBiosignature(biosigDoc.exists() ? (biosigDoc.data() as Biosignature) : null);
        }
      } catch (error) {
        console.error("Failed to load biosignature", error);
      } finally {
        if (isMounted) {
          setLoadingBiosignature(false);
        }
      }
    };

    const fetchHealthData = async () => {
      setLoadingHealth(true);
      try {
        const startDate = getDateWeeksAgo(12);
        const healthQuery = query(
          collection(db, "healthData"),
          where("userId", "==", userId),
          where("date", ">=", startDate),
          orderBy("date", "asc")
        );
        const snapshot = await getDocs(healthQuery);
        if (isMounted) {
          setHealthData(snapshot.docs.map((docSnap) => docSnap.data() as HealthDatum));
        }
      } catch (error) {
        console.error("Failed to load health data", error);
      } finally {
        if (isMounted) {
          setLoadingHealth(false);
        }
      }
    };

    fetchProfile();
    fetchActivities();
    fetchBiosignature();
    fetchHealthData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userProfile || !currentUserId) return;
    const followerList = Array.isArray(userProfile.followers) ? userProfile.followers : [];
    setIsFollowing(followerList.includes(currentUserId));
  }, [userProfile, currentUserId]);

  const displayName = userProfile?.displayName || userProfile?.name || "Unknown User";
  const bio = userProfile?.bio || "No bio available yet.";
  const avatarUrl = userProfile?.avatarUrl || userProfile?.photoURL || "";

  const isOwnProfile = Boolean(currentUserId && userId && currentUserId === userId);
  const activitiesCount = activities.length;
  const followersCount = userProfile?.followersCount ?? 0;
  const followingCount = userProfile?.followingCount ?? 0;
  const streakDays = userProfile?.streakDays ?? 0;

  const thisWeekStart = getWeekStart(new Date());
  const thisWeekKey = thisWeekStart.toISOString().slice(0, 10);
  const lastWeek = new Date(thisWeekStart);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekKey = lastWeek.toISOString().slice(0, 10);

  const weeklyActivities = activities.filter((activity) => {
    const date = parseDate(activity.createdAt ?? activity.date);
    if (!date) return false;
    return getWeekStartDate(date) === thisWeekKey;
  });

  const weeklyHealth = healthData.filter((datum) => {
    const date = parseDate(datum.date ?? datum.createdAt);
    if (!date) return false;
    return getWeekStartDate(date) === thisWeekKey;
  });

  const lastWeekHealth = healthData.filter((datum) => {
    const date = parseDate(datum.date ?? datum.createdAt);
    if (!date) return false;
    return getWeekStartDate(date) === lastWeekKey;
  });

  const runningActivities = weeklyActivities.filter((activity) =>
    (activity.type ?? "").toLowerCase().includes("run")
  );
  const strengthActivities = weeklyActivities.filter((activity) =>
    (activity.type ?? "").toLowerCase().includes("strength")
  );

  const runningDistance = runningActivities.reduce(
    (sum, activity) => sum + (activity.distance ?? 0),
    0
  );
  const runningDuration = runningActivities.reduce(
    (sum, activity) => sum + (activity.durationSeconds ?? activity.duration ?? 0),
    0
  );
  const strengthDuration = strengthActivities.reduce(
    (sum, activity) => sum + (activity.durationSeconds ?? activity.duration ?? 0),
    0
  );
  const strengthCalories = strengthActivities.reduce(
    (sum, activity) => sum + (activity.calories ?? activity.caloriesBurned ?? 0),
    0
  );

  const sleepHours = weeklyHealth.map((datum) =>
    typeof datum.sleepHours === "number" ? datum.sleepHours : 0
  );
  const sleepQuality = weeklyHealth.map((datum) =>
    typeof datum.sleepQuality === "number" ? datum.sleepQuality : 0
  );

  const hrvValues = weeklyHealth.map((datum) =>
    typeof datum.hrv === "number" ? datum.hrv : 0
  );
  const lastWeekHrvValues = lastWeekHealth.map((datum) =>
    typeof datum.hrv === "number" ? datum.hrv : 0
  );

  const averageValue = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const averageSleep = averageValue(sleepHours);
  const averageSleepQuality = averageValue(sleepQuality);
  const averageHrv = averageValue(hrvValues);
  const averageLastWeekHrv = averageValue(lastWeekHrvValues);

  const hrvDelta =
    averageLastWeekHrv > 0
      ? ((averageHrv - averageLastWeekHrv) / averageLastWeekHrv) * 100
      : 0;

  const weeklyStatCards = [
    {
      key: "running",
      label: "Running",
      icon: Activity,
      value:
        runningActivities.length > 0
          ? `${formatNumber(runningDistance, 1)} mi | ${runningActivities.length} runs • ${formatDuration(
              runningDuration
            )} total`
          : "24.3 mi | 5 runs • 3:42:15 total",
    },
    {
      key: "strength",
      label: "Strength",
      icon: Dumbbell,
      value:
        strengthActivities.length > 0
          ? `${strengthActivities.length} sessions | ${formatNumber(
              strengthDuration / 3600,
              1
            )} hours • ${Math.round(strengthCalories)} cal`
          : "4 sessions | 6.2 hours • 2,450 cal",
    },
    {
      key: "sleep",
      label: "Sleep",
      icon: Moon,
      value:
        averageSleep > 0
          ? `${formatNumber(averageSleep, 1)}h average • ${Math.round(
              averageSleepQuality
            )}% quality`
          : "7.8h average • 92% quality",
    },
    {
      key: "hrv",
      label: "HRV",
      icon: HeartPulse,
      value:
        averageHrv > 0
          ? `${Math.round(averageHrv)} average • ${hrvDelta >= 0 ? "+" : ""}${Math.round(
              hrvDelta
            )}% vs last week`
          : "68 average • +8% vs last week",
    },
  ];

  const biosignatureScore =
    typeof biosignature?.score === "number" ? clamp(biosignature.score, 0, 100) : null;
  const biosignatureInsights = biosignature?.insights ?? [];

  const biosignatureMetrics = [
    {
      label: "Energy",
      value: getMetricValue(biosignature?.metrics?.energy ?? biosignature?.energy),
    },
    {
      label: "Recovery",
      value: getMetricValue(biosignature?.metrics?.recovery ?? biosignature?.recovery),
    },
    {
      label: "Sleep Quality",
      value: getMetricValue(
        biosignature?.metrics?.sleepQuality ?? biosignature?.sleepQuality
      ),
    },
    {
      label: "Readiness",
      value: getMetricValue(biosignature?.metrics?.readiness ?? biosignature?.readiness),
    },
  ];

  const weekLabels = useMemo(() => {
    const start = getWeekStart(new Date());
    return Array.from({ length: 12 }, (_, index) => {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - (11 - index) * 7);
      return {
        key: weekStart.toISOString().slice(0, 10),
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    });
  }, []);

  const weeklyChartData = useMemo(() => {
    const buckets = new Map<
      string,
      { trainingLoad: number; hrvSum: number; hrvCount: number; glucoseSum: number; glucoseCount: number }
    >();

    weekLabels.forEach(({ key }) => {
      buckets.set(key, {
        trainingLoad: 0,
        hrvSum: 0,
        hrvCount: 0,
        glucoseSum: 0,
        glucoseCount: 0,
      });
    });

    healthData.forEach((datum) => {
      const date = parseDate(datum.date ?? datum.createdAt);
      if (!date) return;
      const weekKey = getWeekStartDate(date);
      const bucket = buckets.get(weekKey);
      if (!bucket) return;
      const trainingLoad =
        typeof datum.trainingLoad === "number"
          ? datum.trainingLoad
          : typeof datum.activityLoad === "number"
          ? datum.activityLoad
          : 0;
      const hrv =
        typeof datum.hrv === "number"
          ? datum.hrv
          : typeof datum.hrvAverage === "number"
          ? datum.hrvAverage
          : 0;
      const glucose =
        typeof datum.glucose === "number"
          ? datum.glucose
          : typeof datum.glucoseAverage === "number"
          ? datum.glucoseAverage
          : 0;

      bucket.trainingLoad += trainingLoad;
      if (hrv) {
        bucket.hrvSum += hrv;
        bucket.hrvCount += 1;
      }
      if (glucose) {
        bucket.glucoseSum += glucose;
        bucket.glucoseCount += 1;
      }
    });

    return {
      trainingLoad: weekLabels.map(({ key }) => buckets.get(key)?.trainingLoad ?? 0),
      hrvTrend: weekLabels.map(({ key }) => {
        const bucket = buckets.get(key);
        if (!bucket || bucket.hrvCount === 0) return 0;
        return bucket.hrvSum / bucket.hrvCount;
      }),
      energyOptimization: weekLabels.map(({ key }) => {
        const bucket = buckets.get(key);
        if (!bucket || bucket.glucoseCount === 0) return 0;
        return bucket.glucoseSum / bucket.glucoseCount;
      }),
    };
  }, [healthData, weekLabels]);

  const trainingLoadConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "bar",
      data: {
        labels: weekLabels.map(({ label }) => label),
        datasets: [
          {
            data: weeklyChartData.trainingLoad,
            backgroundColor: "rgba(0, 102, 255, 0.5)",
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: getChartOptions(),
    }),
    [weeklyChartData.trainingLoad, weekLabels]
  );

  const hrvConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      data: {
        labels: weekLabels.map(({ label }) => label),
        datasets: [
          {
            data: weeklyChartData.hrvTrend,
            borderColor: "#0066ff",
            backgroundColor: "rgba(0, 102, 255, 0.2)",
            tension: 0.45,
            fill: true,
            pointRadius: 0,
          },
        ],
      },
      options: getChartOptions(),
    }),
    [weeklyChartData.hrvTrend, weekLabels]
  );

  const energyConfig = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      data: {
        labels: weekLabels.map(({ label }) => label).slice(-7),
        datasets: [
          {
            data: weeklyChartData.energyOptimization.slice(-7),
            borderColor: "#6fa5ff",
            backgroundColor: "rgba(0, 102, 255, 0.15)",
            tension: 0.4,
            fill: true,
            pointRadius: 0,
          },
        ],
      },
      options: getChartOptions(),
    }),
    [weeklyChartData.energyOptimization, weekLabels]
  );

  const photoUrls = activities
    .flatMap((activity) => activity.photos ?? activity.photoUrls ?? activity.imageUrls ?? [])
    .filter((url): url is string => typeof url === "string")
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-[#0f1424] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {loadingProfile ? (
                  <div className="h-full w-full animate-pulse bg-white/10" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/70">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                {loadingProfile ? (
                  <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
                ) : (
                  <h1 className="text-2xl font-semibold">{displayName}</h1>
                )}
                <p className="mt-2 max-w-md text-sm text-white/60">
                  {loadingProfile ? "Loading bio..." : bio}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {isOwnProfile ? (
                <button
                  type="button"
                  className="rounded-full border border-[#0066ff]/40 bg-[#0066ff]/20 px-5 py-2 text-sm font-semibold text-[#9dc0ff] transition hover:bg-[#0066ff]/30"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsFollowing((prev) => !prev)}
                  className="rounded-full border border-[#0066ff]/40 bg-[#0066ff]/20 px-5 py-2 text-sm font-semibold text-[#9dc0ff] transition hover:bg-[#0066ff]/30"
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Activities", value: activitiesCount },
              { label: "Followers", value: followersCount },
              { label: "Following", value: followingCount },
              { label: "Day Streak", value: streakDays },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {stat.label}
                </p>
                {loadingProfile && stat.label !== "Activities" ? (
                  <div className="mt-2 h-5 w-16 animate-pulse rounded-full bg-white/10" />
                ) : (
                  <p className="mt-2 text-lg font-semibold">{stat.value}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-[#0c2a5f] bg-[#1a1a1a] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0b214d,transparent_60%)] opacity-80" />
          <div className="absolute inset-0 opacity-70">
            <WaveCanvas />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative h-44 w-44">
                  <div className="absolute inset-0 rounded-full border border-white/10 bg-[#0b1224]" />
                  <svg
                    className="absolute inset-0 h-full w-full animate-spin-slow"
                    viewBox="0 0 200 200"
                  >
                    <defs>
                      <linearGradient id="biosigGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0066ff" />
                        <stop offset="100%" stopColor="#7ab0ff" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="url(#biosigGradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="14 10"
                    />
                  </svg>
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#0066ff"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 80 * (1 - (biosignatureScore ?? 0) / 100)
                      }`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {loadingBiosignature ? (
                      <div className="h-8 w-16 animate-pulse rounded-full bg-white/10" />
                    ) : (
                      <p className="text-4xl font-semibold">
                        {biosignatureScore !== null ? Math.round(biosignatureScore) : "--"}
                      </p>
                    )}
                    <span className="mt-1 text-xs uppercase tracking-[0.3em] text-white/50">
                      Score
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-semibold">🧬 Your Biosignature</h2>
                  <p className="mt-2 max-w-xl text-sm text-white/60">
                    Your unique performance pattern - updated every 7 days
                  </p>
                  {!loadingBiosignature && biosignatureScore === null && (
                    <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                      Your biosignature is being calculated... Check back in 7 days
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
                {biosignatureMetrics.map((metric) => (
                  <MetricBadge
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    loading={loadingBiosignature}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {(loadingBiosignature ? new Array(2).fill(null) : biosignatureInsights.slice(0, 2)).map(
                (insight, index) => (
                  <div
                    key={insight ?? index}
                    className="rounded-3xl border border-[#0f3a85] bg-[#0b1b3c]/60 p-6 shadow-[0_0_30px_rgba(0,102,255,0.15)]"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-[#6fa5ff]">
                      Insight {index + 1}
                    </p>
                    {loadingBiosignature ? (
                      <div className="mt-4 space-y-2">
                        <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
                        <div className="h-4 w-4/6 animate-pulse rounded-full bg-white/10" />
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-white/70">
                        {insight || "Insights are syncing with your latest metrics."}
                      </p>
                    )}
                  </div>
                )
              )}
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
                          {loadingActivities || loadingHealth
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
                        <p className="text-sm font-semibold">{getActivityTitle(activity)}</p>
                        <p className="text-xs text-white/60">{getActivityStats(activity)}</p>
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
