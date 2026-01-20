import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Heart, MessageCircle, Share2 } from "lucide-react";

export interface ActivityMetric {
  label: string;
  value: string;
  unit?: string;
}

export interface ActivityChartPoint {
  label: string;
  value: number;
}

export interface ActivityChart {
  type: "heartRate" | "glucose";
  data: ActivityChartPoint[];
}

export interface ActivityHealthContext {
  sleep?: number;
  hrv?: number;
  glucose?: number;
  recovery?: number;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  createdAt?: Timestamp | Date | number | string | null;
  activityType: string;
  title?: string;
  description?: string;
  photos?: string[];
  metrics?: ActivityMetric[];
  healthContext?: ActivityHealthContext;
  chart?: ActivityChart;
  likeCount?: number;
  commentCount?: number;
  shareUrl?: string;
}

const activityTypeMeta: Record<
  string,
  { emoji: string; label: string; gradient: string }
> = {
  Run: { emoji: "🏃", label: "Run", gradient: "from-blue-500 to-blue-400" },
  Lift: { emoji: "🏋️", label: "Lift", gradient: "from-blue-500 to-blue-400" },
  Cycle: { emoji: "🚴", label: "Cycle", gradient: "from-blue-500 to-blue-400" },
  Swim: { emoji: "🏊", label: "Swim", gradient: "from-blue-500 to-blue-400" },
  Walk: { emoji: "🚶", label: "Walk", gradient: "from-blue-500 to-blue-400" },
  Yoga: { emoji: "🧘", label: "Yoga", gradient: "from-blue-500 to-blue-400" },
  Other: { emoji: "⚡", label: "Activity", gradient: "from-blue-500 to-blue-400" },
};

const chartTitles: Record<ActivityChart["type"], string> = {
  heartRate: "Heart rate during workout",
  glucose: "Glucose stability during ride",
};

const resolveActivityDate = (
  createdAt?: Activity["createdAt"]
): Date | null => {
  if (!createdAt) return null;
  if (createdAt instanceof Timestamp) return createdAt.toDate();
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === "number") return new Date(createdAt);
  if (typeof createdAt === "string") {
    const parsed = Date.parse(createdAt);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return null;
};

const buildHealthContextText = (context?: ActivityHealthContext) => {
  if (!context) return null;
  const parts = [];
  if (context.sleep !== undefined) {
    parts.push(`💤 Sleep: ${context.sleep}h`);
  }
  if (context.hrv !== undefined) {
    parts.push(`❤️ HRV: ${context.hrv}`);
  }
  if (context.glucose !== undefined) {
    parts.push(`🩸 Glucose: ${context.glucose}`);
  }
  if (context.recovery !== undefined) {
    parts.push(`🔋 Recovery: ${context.recovery}%`);
  }
  return parts.length > 0 ? parts.join(" | ") : null;
};

export default function ActivityPost({ activity }: { activity: Activity }) {
  const { toast } = useToast();
  const createdDate = useMemo(
    () => resolveActivityDate(activity.createdAt),
    [activity.createdAt]
  );
  const relativeTime = createdDate
    ? formatDistanceToNow(createdDate, { addSuffix: true })
    : "just now";
  const typeMeta = activityTypeMeta[activity.activityType] ?? activityTypeMeta.Other;
  const badgeLabel = activity.title || `${typeMeta.label}`;
  const healthContextText = buildHealthContextText(activity.healthContext);
  const photos = activity.photos ?? [];
  const metrics = activity.metrics ?? [];

  const handleShare = async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareLink = activity.shareUrl || `${baseUrl}/feed/${activity.id}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else if (typeof window !== "undefined") {
        window.prompt("Copy this link", shareLink);
      }
      toast({
        title: "Link copied",
        description: "Share this activity with your community.",
      });
    } catch (error) {
      toast({
        title: "Unable to copy link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 space-y-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={`/profile/${activity.userId}`} className="hover-elevate rounded-full">
            <Avatar className="h-11 w-11">
              <AvatarImage src={activity.userAvatar ?? undefined} alt={activity.userName} />
              <AvatarFallback>
                {activity.userName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </a>
          <div>
            <a
              href={`/profile/${activity.userId}`}
              className="text-sm font-semibold hover:underline"
            >
              {activity.userName || "Xuunu Member"}
            </a>
            <p className="text-xs text-muted-foreground">{relativeTime}</p>
          </div>
        </div>
      </header>

      {photos.length > 0 && (
        <div className="space-y-3">
          {photos.length === 1 ? (
            <img
              src={photos[0]}
              alt={activity.title || "Activity photo"}
              className="w-full max-h-[420px] rounded-lg object-cover"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {photos.map((photo, index) => (
                <img
                  key={`${photo}-${index}`}
                  src={photo}
                  alt={activity.title || "Activity photo"}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Badge
          className={`inline-flex gap-2 border-transparent bg-gradient-to-r ${typeMeta.gradient} text-white`}
        >
          <span>{typeMeta.emoji}</span>
          <span className="font-semibold">{badgeLabel}</span>
        </Badge>

        {activity.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {activity.description}
          </p>
        )}

        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={`${metric.label}-${metric.value}`}
                className="rounded-lg border border-muted/40 bg-muted/10 p-3"
              >
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-2 font-mono text-lg font-semibold text-card-foreground">
                  {metric.value}
                  {metric.unit ? <span className="text-xs ml-1">{metric.unit}</span> : null}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-dashed border-muted/50 bg-muted/10 px-4 py-6 text-center text-xs text-muted-foreground">
          GPS map preview coming soon
        </div>

        {healthContextText && (
          <p className="text-xs text-muted-foreground">{healthContextText}</p>
        )}
      </div>

      {activity.chart?.data?.length ? (
        <div className="rounded-lg border border-muted/40 bg-muted/5 p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
            {chartTitles[activity.chart.type]}
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity.chart.data}>
                <XAxis dataKey="label" hide />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                  }}
                  labelStyle={{ color: "white" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted/30 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Heart className="h-4 w-4" />
            {activity.likeCount ?? 0}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {activity.commentCount ?? 0}
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </Card>
  );
}
