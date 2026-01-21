import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Share2,
  Camera,
  Users,
  UserPlus,
  Heart,
  Plus,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import type { FriendProfile } from "@/pages/FriendProfileScreen";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import type { HealthEntry } from "@shared/schema";

type ShareTarget = {
  id: "tiktok" | "facebook" | "x" | "instagram" | "whatsapp";
  label: string;
  requiresCopy?: boolean;
  buildUrl: (url: string, text: string) => string;
};

const FEED_STORAGE_KEY = "xuunu-feed-items";
const FEED_DRAFT_KEY = "xuunu-feed-draft";
const FEED_NOTIFIED_KEY = "xuunu-feed-notified";
const NOTIFICATIONS_KEY = "xuunu-notifications-enabled";
const CHALLENGE_STORAGE_KEY = "xuunu-challenges";
const CHALLENGE_SCHEDULE_KEY = "xuunu-challenge-schedules";
const LONGEVITY_STORAGE_KEY = "xuunu-longevity-challenge";
const CHALLENGE_SCHEDULE_NOTIFIED_KEY = "xuunu-challenge-schedule-notified";

type ChallengeType = "Hiking" | "Running" | "Biking";

type ChallengeLocation = {
  lat: number;
  lng: number;
} | null;

type LongevityChallengeType = "Veggies" | "Strength" | "Cardio";

type LongevityLog = {
  date: string;
  photos: string[];
  note?: string;
};

type LongevityChallenge = {
  id: string;
  userId: string;
  type: LongevityChallengeType;
  startedAt: string;
  logs: LongevityLog[];
};

const LONGEVITY_OPTIONS: Array<{
  type: LongevityChallengeType;
  title: string;
  cadence: string;
  requiredDays: number;
  description: string;
}> = [
  {
    type: "Veggies",
    title: "Eat 5 servings of veggies",
    cadence: "7 days/week",
    requiredDays: 7,
    description: "Post photos of your meals each day.",
  },
  {
    type: "Strength",
    title: "Strength training",
    cadence: "5 days/week",
    requiredDays: 5,
    description: "Post workout photos on training days.",
  },
  {
    type: "Cardio",
    title: "Cardio 30 minutes",
    cadence: "7 days/week",
    requiredDays: 7,
    description: "Post activity photos each day.",
  },
];

type ChallengeRecord = {
  id: string;
  userId: string;
  type: ChallengeType;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  stepsStart: number;
  stepsEnd: number;
  stepsDelta: number;
  startLocation: ChallengeLocation;
  endLocation: ChallengeLocation;
  autoStopped?: boolean;
  shared?: boolean;
  invitedFriends?: string[];
};

type ChallengeSummary = {
  type: ChallengeType;
  durationSec: number;
  stepsDelta: number;
  startLocation: ChallengeLocation;
  endLocation: ChallengeLocation;
  invitedFriends?: string[];
};

type ChallengeSchedule = {
  id: string;
  userId: string;
  type: ChallengeType;
  scheduledFor: string;
  createdAt: string;
  invitedFriends: string[];
  shared: boolean;
};

type ChallengeScheduleSummary = {
  type: ChallengeType;
  scheduledFor: string;
  invitedFriends: string[];
};

type FeedItem = {
  id: string;
  authorName: string;
  authorAvatar: string;
  time: string;
  content: string;
  photos: string[];
  shared: boolean;
  source: "friend" | "you";
  likesCount: number;
  liked: boolean;
  challenge?: ChallengeSummary;
  challengeSchedule?: ChallengeScheduleSummary;
};

type NetworkMember = {
  id: string;
  name: string;
  avatarUrl?: string;
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

interface DataInsightsScreenProps {
  onBack?: () => void;
  onPreviewPublicProfile?: () => void;
  onViewFriend?: (friend: FriendProfile) => void;
}

export default function DataInsightsScreen({
  onBack,
  onPreviewPublicProfile,
  onViewFriend,
}: DataInsightsScreenProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { photoUrl, setPhotoUrl } = useProfilePhoto();
  const [shareUrl, setShareUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showProfileShare, setShowProfileShare] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [updatePhotos, setUpdatePhotos] = useState<string[]>([]);
  const [shareUpdate, setShareUpdate] = useState(true);
  const [longevityChallenge, setLongevityChallenge] = useState<LongevityChallenge | null>(null);
  const [selectedLongevityType, setSelectedLongevityType] =
    useState<LongevityChallengeType | null>(null);
  const [longevityPhotos, setLongevityPhotos] = useState<string[]>([]);
  const [longevityNote, setLongevityNote] = useState("");
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [selectedChallengeType, setSelectedChallengeType] = useState<ChallengeType | null>(null);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
  const [scheduleChallenge, setScheduleChallenge] = useState(false);
  const [scheduledStart, setScheduledStart] = useState("");
  const [shareScheduledChallenge, setShareScheduledChallenge] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState<{
    id: string;
    type: ChallengeType;
    startedAt: string;
    stepsStart: number;
    startLocation: ChallengeLocation;
    invitedFriends: string[];
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingChallenge, setPendingChallenge] = useState<ChallengeRecord | null>(null);
  const [shareChallenge, setShareChallenge] = useState(true);
  const [scheduledChallenges, setScheduledChallenges] = useState<ChallengeSchedule[]>([]);
  const [scheduleTick, setScheduleTick] = useState(0);
  const scheduleTimeoutsRef = useRef<Record<string, number>>({});
  const lastStepsRef = useRef<number | null>(null);
  const lastStepChangeAtRef = useRef<number | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [showNetworkMembers, setShowNetworkMembers] = useState(false);
  const [networkDegree, setNetworkDegree] = useState<"second" | "third">("second");

  const CROP_SIZE = 240;
  const OUTPUT_SIZE = 320;
  const MAX_PHOTO_SIZE = 100 * 1024 * 1024;
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Member";

  const { data: latestHealth, refetch: refetchHealth } = useQuery<HealthEntry | null>({
    queryKey: [`/api/health-entries/latest?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const canNotify = () =>
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted" &&
    window.localStorage.getItem(NOTIFICATIONS_KEY) === "true";

  const sendNotification = (title: string, body: string) => {
    if (!canNotify()) return;
    try {
      new Notification(title, { body });
    } catch {
      // Ignore notification errors.
    }
  };

  const ensureNotificationsEnabled = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") {
      window.localStorage.setItem(NOTIFICATIONS_KEY, "true");
      return true;
    }
    if (Notification.permission === "default") {
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          window.localStorage.setItem(NOTIFICATIONS_KEY, "true");
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  };

  const loadNotifiedSchedules = () => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const stored = window.localStorage.getItem(CHALLENGE_SCHEDULE_NOTIFIED_KEY);
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      return new Set(parsed);
    } catch {
      return new Set<string>();
    }
  };

  const saveNotifiedSchedules = (ids: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CHALLENGE_SCHEDULE_NOTIFIED_KEY,
        JSON.stringify([...ids])
      );
    } catch {
      // Ignore storage failures.
    }
  };

  const friends = useMemo<FriendProfile[]>(
    () => [
      {
        id: "friend-1",
        name: "Ava Martinez",
        status: "Shared a recovery win",
        avatarUrl: "https://i.pravatar.cc/120?img=16",
        sharedDashboards: { performance: true, health: true, recovery: false, energy: true },
      },
      {
        id: "friend-2",
        name: "Jordan Lee",
        status: "Hit a 7-day sleep streak",
        avatarUrl: "https://i.pravatar.cc/120?img=12",
        sharedDashboards: { performance: false, health: true, recovery: true, energy: false },
      },
      {
        id: "friend-3",
        name: "Riley Patel",
        status: "New bloodwork results",
        avatarUrl: "https://i.pravatar.cc/120?img=22",
        sharedDashboards: { performance: true, health: false, recovery: false, energy: true },
      },
    ],
    []
  );

  const secondDegreeMembers = useMemo<NetworkMember[]>(
    () => [
      { id: "second-1", name: "Maya Rodriguez", avatarUrl: "https://i.pravatar.cc/120?img=31" },
      { id: "second-2", name: "Ethan Brooks", avatarUrl: "https://i.pravatar.cc/120?img=33" },
      { id: "second-3", name: "Priya Nair", avatarUrl: "https://i.pravatar.cc/120?img=45" },
      { id: "second-4", name: "Noah King", avatarUrl: "https://i.pravatar.cc/120?img=52" },
    ],
    []
  );

  const thirdDegreeMembers = useMemo<NetworkMember[]>(
    () => [
      { id: "third-1", name: "Sofia Alvarez", avatarUrl: "https://i.pravatar.cc/120?img=36" },
      { id: "third-2", name: "Liam Patel", avatarUrl: "https://i.pravatar.cc/120?img=39" },
      { id: "third-3", name: "Grace Kim", avatarUrl: "https://i.pravatar.cc/120?img=41" },
      { id: "third-4", name: "Diego Santos", avatarUrl: "https://i.pravatar.cc/120?img=49" },
    ],
    []
  );

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
    const storedDraft = window.localStorage.getItem(FEED_DRAFT_KEY);
    if (!storedDraft) return;
    try {
      const parsed = JSON.parse(storedDraft) as {
        text?: string;
        photos?: string[];
        shared?: boolean;
      };
      if (typeof parsed.text === "string") {
        setUpdateText(parsed.text);
      }
      if (Array.isArray(parsed.photos)) {
        setUpdatePhotos(parsed.photos);
      }
      if (typeof parsed.shared === "boolean") {
        setShareUpdate(parsed.shared);
      }
    } catch {
      // Ignore invalid drafts.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid) return;
    try {
      const stored = window.localStorage.getItem(LONGEVITY_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Record<string, LongevityChallenge>) : {};
      setLongevityChallenge(parsed[user.uid] ?? null);
      setSelectedLongevityType(null);
      setLongevityPhotos([]);
      setLongevityNote("");
    } catch {
      setLongevityChallenge(null);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid) return;
    try {
      const stored = window.localStorage.getItem(LONGEVITY_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Record<string, LongevityChallenge>) : {};
      if (longevityChallenge) {
        parsed[user.uid] = longevityChallenge;
      } else {
        delete parsed[user.uid];
      }
      window.localStorage.setItem(LONGEVITY_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Ignore storage failures.
    }
  }, [longevityChallenge, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(CHALLENGE_SCHEDULE_KEY);
      const parsed = stored ? (JSON.parse(stored) as ChallengeSchedule[]) : [];
      setScheduledChallenges(parsed.filter((challenge) => challenge.userId === user?.uid));
    } catch {
      setScheduledChallenges([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CHALLENGE_SCHEDULE_KEY, JSON.stringify(scheduledChallenges));
    } catch {
      // Ignore storage failures.
    }
  }, [scheduledChallenges]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notified = loadNotifiedSchedules();
    Object.values(scheduleTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scheduleTimeoutsRef.current = {};

    scheduledChallenges.forEach((challenge) => {
      const scheduledTime = new Date(challenge.scheduledFor).getTime();
      const now = Date.now();
      if (notified.has(challenge.id)) {
        return;
      }
      if (scheduledTime <= now) {
        if (canNotify()) {
          sendNotification(
            "Challenge ready to start",
            `${challenge.type} challenge is ready to begin.`
          );
          notified.add(challenge.id);
        }
        return;
      }
      const delay = scheduledTime - now;
      scheduleTimeoutsRef.current[challenge.id] = window.setTimeout(() => {
        if (canNotify()) {
          sendNotification(
            "Challenge starting",
            `${challenge.type} challenge starts now.`
          );
          const updated = loadNotifiedSchedules();
          updated.add(challenge.id);
          saveNotifiedSchedules(updated);
        }
      }, delay);
    });

    saveNotifiedSchedules(notified);
    return () => {
      Object.values(scheduleTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      scheduleTimeoutsRef.current = {};
    };
  }, [scheduledChallenges]);

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

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 100MB.",
        variant: "destructive",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageUrl(objectUrl);
    setIsCropOpen(true);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    event.target.value = "";
  };

  const clampOffset = (next: { x: number; y: number }) => {
    if (!imageSize) return next;
    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    const totalScale = baseScale * cropZoom;
    const maxOffsetX = Math.max(0, (imageSize.width * totalScale - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (imageSize.height * totalScale - CROP_SIZE) / 2);
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, next.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, next.y)),
    };
  };

  useEffect(() => {
    if (!imageSize) return;
    setCropOffset((prev) => clampOffset(prev));
  }, [imageSize, cropZoom]);

  const handleCropCancel = () => {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }
    setCropImageUrl(null);
    setIsCropOpen(false);
    setImageSize(null);
  };

  const handleCropSave = () => {
    if (!cropImageUrl || !imageRef.current || !imageSize) {
      return;
    }

    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    const totalScale = baseScale * cropZoom;
    const scaleRatio = OUTPUT_SIZE / CROP_SIZE;
    const drawWidth = imageSize.width * totalScale * scaleRatio;
    const drawHeight = imageSize.height * totalScale * scaleRatio;
    const drawX = (OUTPUT_SIZE - drawWidth) / 2 + cropOffset.x * scaleRatio;
    const drawY = (OUTPUT_SIZE - drawHeight) / 2 + cropOffset.y * scaleRatio;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(imageRef.current, drawX, drawY, drawWidth, drawHeight);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhotoUrl(dataUrl);
    toast({
      title: "Profile photo updated",
      description: "Your photo will appear across all tabs.",
    });
    handleCropCancel();
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y,
    };
    setIsDragging(true);
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const dx = event.clientX - dragStateRef.current.x;
    const dy = event.clientY - dragStateRef.current.y;
    const nextOffset = clampOffset({
      x: dragStateRef.current.offsetX + dx,
      y: dragStateRef.current.offsetY + dy,
    });
    setCropOffset(nextOffset);
  };

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const imageStyle = useMemo(() => {
    if (!imageSize) {
      return {
        transform: `translate(-50%, -50%) scale(${cropZoom})`,
      };
    }
    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    const totalScale = baseScale * cropZoom;
    return {
      width: imageSize.width,
      height: imageSize.height,
      transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${totalScale})`,
      transformOrigin: "center",
    };
  }, [imageSize, cropOffset.x, cropOffset.y, cropZoom, CROP_SIZE]);

  const handleAddUpdatePhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 4 - updatePhotos.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Photo limit reached",
        description: "You can add up to 4 photos per update.",
        variant: "destructive",
      });
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));
    const selected = images.slice(0, remainingSlots);
    if (selected.length === 0) {
      toast({
        title: "Unsupported files",
        description: "Please choose image files only.",
        variant: "destructive",
      });
      return;
    }

    Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((results) => {
        setUpdatePhotos((prev) => [...prev, ...results]);
      })
      .catch(() => {
        toast({
          title: "Photo upload failed",
          description: "Please try adding your photos again.",
          variant: "destructive",
        });
      });
    event.target.value = "";
  };

  const handleAddLongevityPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 4 - longevityPhotos.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Photo limit reached",
        description: "You can add up to 4 photos per day.",
        variant: "destructive",
      });
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));
    const selected = images.slice(0, remainingSlots);
    if (selected.length === 0) {
      toast({
        title: "Unsupported files",
        description: "Please choose image files only.",
        variant: "destructive",
      });
      return;
    }

    Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((results) => {
        setLongevityPhotos((prev) => [...prev, ...results]);
      })
      .catch(() => {
        toast({
          title: "Photo upload failed",
          description: "Please try adding your photos again.",
          variant: "destructive",
        });
      });
    event.target.value = "";
  };

  const handleRemoveLongevityPhoto = (index: number) => {
    setLongevityPhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      text: updateText,
      photos: updatePhotos,
      shared: shareUpdate,
    };
    try {
      window.localStorage.setItem(FEED_DRAFT_KEY, JSON.stringify(payload));
    } catch {
      try {
        window.localStorage.setItem(
          FEED_DRAFT_KEY,
          JSON.stringify({ text: updateText, photos: [], shared: shareUpdate })
        );
      } catch {
        // Ignore storage failures.
      }
    }
  }, [updateText, updatePhotos, shareUpdate]);

  const handleRemoveUpdatePhoto = (index: number) => {
    setUpdatePhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const buildDefaultFeedItems = (avatar: string): FeedItem[] => [
    {
      id: "feed-1",
      authorName: "Ava Martinez",
      authorAvatar: "https://i.pravatar.cc/120?img=16",
      time: "2h ago",
      content: "Shared a recovery win after consistent sleep + breathwork.",
      photos: ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80"],
      shared: true,
      source: "friend" as const,
      likesCount: 12,
      liked: false,
    },
    {
      id: "feed-2",
      authorName: "Jordan Lee",
      authorAvatar: "https://i.pravatar.cc/120?img=12",
      time: "5h ago",
      content: "Energy levels trending up. Loving the new Terra sync charts.",
      photos: [],
      shared: true,
      source: "friend" as const,
      likesCount: 7,
      liked: false,
    },
    {
      id: "feed-3",
      authorName: "You",
      authorAvatar: avatar,
      time: "Yesterday",
      content: "Started sharing my progress publicly this week.",
      photos: [],
      shared: true,
      source: "you" as const,
      likesCount: 3,
      liked: false,
    },
  ];

  const [feedItems, setFeedItems] = useState<FeedItem[]>(() => {
    if (typeof window === "undefined") {
      return buildDefaultFeedItems(photoUrl || "");
    }
    const stored = window.localStorage.getItem(FEED_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as FeedItem[];
      } catch {
        return buildDefaultFeedItems(photoUrl || "");
      }
    }
    return buildDefaultFeedItems(photoUrl || "");
  });
  const [showDeleteFeedDialog, setShowDeleteFeedDialog] = useState(false);

  useEffect(() => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.source === "you" ? { ...item, authorAvatar: photoUrl || "" } : item
      )
    );
  }, [photoUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(feedItems));
    } catch (error) {
      const withoutPhotos = feedItems.map((item) => ({ ...item, photos: [] }));
      try {
        window.localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(withoutPhotos));
      } catch {
        try {
          window.localStorage.setItem(
            FEED_STORAGE_KEY,
            JSON.stringify(withoutPhotos.slice(0, 1))
          );
        } catch {
          // Ignore storage failures (e.g., quota exceeded).
        }
      }
    }
  }, [feedItems]);

  const publicFeedItems = useMemo(
    () => feedItems.filter((item) => item.shared),
    [feedItems]
  );

  const handleToggleLike = (id: string) => {
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextLiked = !item.liked;
        const nextCount = Math.max(0, item.likesCount + (nextLiked ? 1 : -1));
        return { ...item, liked: nextLiked, likesCount: nextCount };
      })
    );
  };

  const handleClearFeed = () => {
    setFeedItems([]);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(FEED_STORAGE_KEY);
        window.localStorage.removeItem(FEED_NOTIFIED_KEY);
      } catch {
        // Ignore storage failures.
      }
    }
    setShowDeleteFeedDialog(false);
    toast({
      title: "Feed cleared",
      description: "Your feed has been deleted.",
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canNotify()) return;
    try {
      const stored = window.localStorage.getItem(FEED_NOTIFIED_KEY);
      const notified = new Set<string>(stored ? (JSON.parse(stored) as string[]) : []);
      const newFriendItems = feedItems.filter(
        (item) => item.source === "friend" && !notified.has(item.id)
      );
      if (newFriendItems.length > 0) {
        newFriendItems.forEach((item) => {
          sendNotification("Friend update", `${item.authorName} shared an update.`);
          notified.add(item.id);
        });
        window.localStorage.setItem(FEED_NOTIFIED_KEY, JSON.stringify([...notified]));
      }
    } catch {
      // Ignore notification tracking errors.
    }
  }, [feedItems]);

  const handleShareUpdate = () => {
    if (!updateText.trim() && updatePhotos.length === 0) {
      toast({
        title: "Add a note or photo",
        description: "Share a short update or add photos to post.",
        variant: "destructive",
      });
      return;
    }

    const newItem = {
      id: `feed-${Date.now()}`,
      authorName: "You",
      authorAvatar: photoUrl || "",
      time: "Just now",
      content: updateText.trim() || "Shared new progress.",
      photos: updatePhotos,
      shared: shareUpdate,
      source: "you" as const,
      likesCount: 0,
      liked: false,
    };

    setFeedItems((prev) => [newItem, ...prev]);
    setUpdateText("");
    setUpdatePhotos([]);
    setShareUpdate(true);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FEED_DRAFT_KEY);
    }
    toast({
      title: "Update shared",
      description: "Your latest progress is now visible in the feed.",
    });
    sendNotification("Update shared", "Your progress update is live.");
  };

  const getCurrentLocation = useCallback(
    () =>
      new Promise<ChallengeLocation>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }),
    []
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTimeLocal = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const getLocalDateKey = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const getLongevityConfig = (type: LongevityChallengeType) =>
    LONGEVITY_OPTIONS.find((option) => option.type === type);

  const getScheduleBounds = () => {
    const now = Date.now();
    return {
      min: new Date(now + 24 * 60 * 60 * 1000),
      max: new Date(now + 7 * 24 * 60 * 60 * 1000),
    };
  };

  const resetChallengeDialog = () => {
    setSelectedChallengeType(null);
    setInvitedFriends([]);
    setScheduleChallenge(false);
    setScheduledStart("");
    setShareScheduledChallenge(true);
  };

  useEffect(() => {
    if (!scheduleChallenge) return;
    if (scheduledStart) return;
    const { min } = getScheduleBounds();
    setScheduledStart(formatDateTimeLocal(min));
  }, [scheduleChallenge, scheduledStart]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setScheduleTick((prev) => prev + 1);
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const formatCoord = (value: number) => value.toFixed(6);

  const getDistanceKm = (start: ChallengeLocation, end: ChallengeLocation) => {
    if (!start || !end) return 0;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(end.lat - start.lat);
    const dLng = toRad(end.lng - start.lng);
    const lat1 = toRad(start.lat);
    const lat2 = toRad(end.lat);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getZoomForDistance = (distanceKm: number) => {
    if (distanceKm < 0.5) return 15;
    if (distanceKm < 2) return 14;
    if (distanceKm < 5) return 13;
    if (distanceKm < 10) return 12;
    if (distanceKm < 20) return 11;
    return 10;
  };

  const buildChallengeMapUrl = (start: ChallengeLocation, end: ChallengeLocation) => {
    const points = [start, end].filter(Boolean) as { lat: number; lng: number }[];
    if (points.length === 0) return "";
    const distanceKm = points.length === 2 ? getDistanceKm(points[0], points[1]) : 0.3;
    const zoom = getZoomForDistance(distanceKm);
    const centerLat =
      points.length === 2 ? (points[0].lat + points[1].lat) / 2 : points[0].lat;
    const centerLng =
      points.length === 2 ? (points[0].lng + points[1].lng) / 2 : points[0].lng;
    const markers = points
      .map((point, index) =>
        `${formatCoord(point.lat)},${formatCoord(point.lng)},${
          index === 0 ? "red-pushpin" : "blue-pushpin"
        }`
      )
      .join("|");
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${formatCoord(
      centerLat
    )},${formatCoord(centerLng)}&zoom=${zoom}&size=640x320&maptype=mapnik&markers=${encodeURIComponent(
      markers
    )}`;
  };

  const saveChallenge = (challenge: ChallengeRecord) => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(CHALLENGE_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as ChallengeRecord[]) : [];
      const updated = [challenge, ...parsed];
      window.localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage failures.
    }
  };

  const handleStartChallenge = async (
    type: ChallengeType,
    options?: { invitedFriends?: string[] }
  ) => {
    if (!user) return;
    if (activeChallenge) {
      toast({
        title: "Challenge in progress",
        description: "Stop the current challenge before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    const startedAt = new Date().toISOString();
    const stepsStart = typeof latestHealth?.steps === "number" ? latestHealth.steps : 0;
    const startLocation = await getCurrentLocation();
    const id = `challenge-${Date.now()}`;
    setActiveChallenge({
      id,
      type,
      startedAt,
      stepsStart,
      startLocation,
      invitedFriends: options?.invitedFriends ?? [],
    });
    setElapsedSeconds(0);
    lastStepsRef.current = stepsStart;
    lastStepChangeAtRef.current = Date.now();
    setShowChallengePicker(false);
    resetChallengeDialog();
    toast({
      title: `${type} challenge started`,
      description: "Timer is running. Move to record steps.",
    });
  };

  const handleScheduleChallenge = async () => {
    if (!user || !selectedChallengeType) return;
    if (!scheduledStart) {
      toast({
        title: "Pick a start time",
        description: "Schedule at least 24 hours ahead.",
        variant: "destructive",
      });
      return;
    }
    const scheduledDate = new Date(scheduledStart);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast({
        title: "Invalid time",
        description: "Please choose a valid start date and time.",
        variant: "destructive",
      });
      return;
    }
    const { min, max } = getScheduleBounds();
    if (scheduledDate < min || scheduledDate > max) {
      toast({
        title: "Schedule window",
        description: "Challenges must be scheduled 24 hours to 7 days in advance.",
        variant: "destructive",
      });
      return;
    }
    const record: ChallengeSchedule = {
      id: `schedule-${Date.now()}`,
      userId: user.uid,
      type: selectedChallengeType,
      scheduledFor: scheduledDate.toISOString(),
      createdAt: new Date().toISOString(),
      invitedFriends,
      shared: shareScheduledChallenge,
    };
    setScheduledChallenges((prev) => [record, ...prev]);
    const notificationsEnabled = await ensureNotificationsEnabled();
    if (!notificationsEnabled) {
      toast({
        title: "Notifications disabled",
        description: "Enable notifications to get challenge reminders.",
      });
    }
    if (shareScheduledChallenge) {
      const feedItem: FeedItem = {
        id: `challenge-schedule-${record.id}`,
        authorName: "You",
        authorAvatar: photoUrl || "",
        time: "Just now",
        content: `Scheduled a ${record.type} challenge.`,
        photos: [],
        shared: true,
        source: "you",
        likesCount: 0,
        liked: false,
        challengeSchedule: {
          type: record.type,
          scheduledFor: record.scheduledFor,
          invitedFriends: record.invitedFriends,
        },
      };
      setFeedItems((prev) => [feedItem, ...prev]);
    }
    setShowChallengePicker(false);
    resetChallengeDialog();
    toast({
      title: "Challenge scheduled",
      description: `Starts ${scheduledDate.toLocaleString()}.`,
    });
  };

  const handleStartScheduledChallenge = (challenge: ChallengeSchedule) => {
    const startTime = new Date(challenge.scheduledFor).getTime();
    if (Date.now() < startTime) {
      toast({
        title: "Too early",
        description: "This challenge cannot start before its scheduled time.",
        variant: "destructive",
      });
      return;
    }
    setScheduledChallenges((prev) => prev.filter((item) => item.id !== challenge.id));
    handleStartChallenge(challenge.type, { invitedFriends: challenge.invitedFriends });
  };

  const toggleInviteFriend = (name: string) => {
    setInvitedFriends((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleStartLongevityChallenge = () => {
    if (!user || !selectedLongevityType) {
      toast({
        title: "Select a challenge",
        description: "Pick a longevity challenge to get started.",
        variant: "destructive",
      });
      return;
    }
    const record: LongevityChallenge = {
      id: `longevity-${Date.now()}`,
      userId: user.uid,
      type: selectedLongevityType,
      startedAt: new Date().toISOString(),
      logs: [],
    };
    setLongevityChallenge(record);
    setSelectedLongevityType(null);
    setLongevityPhotos([]);
    setLongevityNote("");
    toast({
      title: "Longevity challenge started",
      description: "Log your daily activity with photos.",
    });
  };

  const handleLogLongevityDay = () => {
    if (!longevityChallenge) return;
    if (longevityPhotos.length === 0) {
      toast({
        title: "Add photos",
        description: "Upload at least one photo for today.",
        variant: "destructive",
      });
      return;
    }
    const todayKey = getLocalDateKey(new Date());
    if (longevityChallenge.logs.some((log) => log.date === todayKey)) {
      toast({
        title: "Already logged today",
        description: "Come back tomorrow to add another entry.",
        variant: "destructive",
      });
      return;
    }
    const startedAt = new Date(longevityChallenge.startedAt).getTime();
    const daysSinceStart = Math.floor((Date.now() - startedAt) / (24 * 60 * 60 * 1000)) + 1;
    if (daysSinceStart > 7) {
      toast({
        title: "Week complete",
        description: "Start a new longevity challenge for this week.",
        variant: "destructive",
      });
      return;
    }
    const log: LongevityLog = {
      date: todayKey,
      photos: longevityPhotos,
      note: longevityNote.trim() ? longevityNote.trim() : undefined,
    };
    setLongevityChallenge((prev) =>
      prev ? { ...prev, logs: [log, ...prev.logs] } : prev
    );
    setLongevityPhotos([]);
    setLongevityNote("");
    toast({
      title: "Day logged",
      description: "Your longevity activity has been saved.",
    });
  };

  const handleResetLongevityChallenge = () => {
    setLongevityChallenge(null);
    setSelectedLongevityType(null);
    setLongevityPhotos([]);
    setLongevityNote("");
  };

  const handleStopChallenge = useCallback(
    async (autoStopped = false) => {
      if (!activeChallenge || !user) return;
      const current = activeChallenge;
      setActiveChallenge(null);
      const endLocation = await getCurrentLocation();
      const stepsEnd =
        typeof latestHealth?.steps === "number"
          ? latestHealth.steps
          : lastStepsRef.current ?? current.stepsStart;
      const stepsDelta = Math.max(0, stepsEnd - current.stepsStart);
      const endedAt = new Date().toISOString();
      const durationSec = Math.max(
        0,
        Math.floor((Date.now() - new Date(current.startedAt).getTime()) / 1000)
      );
      const record: ChallengeRecord = {
        id: current.id,
        userId: user.uid,
        type: current.type,
        startedAt: current.startedAt,
        endedAt,
        durationSec,
        stepsStart: current.stepsStart,
        stepsEnd,
        stepsDelta,
        startLocation: current.startLocation,
        endLocation,
        autoStopped,
        shared: false,
        invitedFriends: current.invitedFriends,
      };
      lastStepsRef.current = null;
      lastStepChangeAtRef.current = null;
      setPendingChallenge(record);
      setShareChallenge(true);
      toast({
        title: autoStopped ? "Challenge auto-stopped" : "Challenge stopped",
        description: "Review details and choose to share.",
      });
    },
    [activeChallenge, getCurrentLocation, latestHealth?.steps, toast, user]
  );

  const handleFinalizeChallenge = (shared: boolean) => {
    if (!pendingChallenge) return;
    const record = { ...pendingChallenge, shared };
    saveChallenge(record);
    if (shared) {
      const feedItem: FeedItem = {
        id: `challenge-${record.id}`,
        authorName: "You",
        authorAvatar: photoUrl || "",
        time: "Just now",
        content: `${record.type} challenge completed in ${formatDuration(record.durationSec)} (${record.stepsDelta.toLocaleString()} steps).`,
        photos: [],
        shared,
        source: "you",
        likesCount: 0,
        liked: false,
        challenge: {
          type: record.type,
          durationSec: record.durationSec,
          stepsDelta: record.stepsDelta,
          startLocation: record.startLocation,
          endLocation: record.endLocation,
          invitedFriends: record.invitedFriends,
        },
      };
      setFeedItems((prev) => [feedItem, ...prev]);
    }
    setPendingChallenge(null);
    setShareChallenge(true);
  };

  useEffect(() => {
    if (!activeChallenge) return;
    const started = new Date(activeChallenge.startedAt).getTime();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeChallenge]);

  useEffect(() => {
    if (!activeChallenge) return;
    if (typeof latestHealth?.steps !== "number") return;
    if (lastStepsRef.current === null) {
      lastStepsRef.current = latestHealth.steps;
      lastStepChangeAtRef.current = Date.now();
      return;
    }
    if (latestHealth.steps !== lastStepsRef.current) {
      lastStepsRef.current = latestHealth.steps;
      lastStepChangeAtRef.current = Date.now();
    }
  }, [activeChallenge, latestHealth?.steps]);

  useEffect(() => {
    if (!activeChallenge) return;
    const interval = window.setInterval(() => {
      refetchHealth();
      const lastChange = lastStepChangeAtRef.current ?? Date.now();
      if (Date.now() - lastChange >= 5 * 60 * 1000) {
        handleStopChallenge(true);
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [activeChallenge, handleStopChallenge, refetchHealth]);

  const handleInviteFriend = () => {
    if (!inviteValue.trim()) {
      toast({
        title: "Enter an email or username",
        description: "Add a friend by invite to grow your circle.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Invite sent",
      description: `We sent an invite to ${inviteValue}.`,
    });
    setInviteValue("");
    setShowInviteForm(false);
  };

  const handleSendNetworkRequest = (member: NetworkMember) => {
    toast({
      title: "Friend request sent",
      description: `Request sent to ${member.name}.`,
    });
    sendNotification("Friend request sent", `Request sent to ${member.name}.`);
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

  const scheduleBounds = getScheduleBounds();
  const scheduleMin = formatDateTimeLocal(scheduleBounds.min);
  const scheduleMax = formatDateTimeLocal(scheduleBounds.max);
  const scheduleNow = useMemo(() => Date.now(), [scheduleTick]);
  const longevityConfig = longevityChallenge ? getLongevityConfig(longevityChallenge.type) : null;
  const longevityRequiredDays = longevityConfig?.requiredDays ?? 7;
  const longevityLoggedDays = longevityChallenge?.logs.length ?? 0;
  const longevityStartedAtLabel = longevityChallenge
    ? new Date(longevityChallenge.startedAt).toLocaleDateString()
    : "";
  const longevityTodayKey = getLocalDateKey(new Date());
  const longevityHasLoggedToday = longevityChallenge
    ? longevityChallenge.logs.some((log) => log.date === longevityTodayKey)
    : false;
  const longevityDaysSinceStart = longevityChallenge
    ? Math.floor(
        (Date.now() - new Date(longevityChallenge.startedAt).getTime()) / (24 * 60 * 60 * 1000)
      ) + 1
    : 0;
  const longevityDaysRemaining = longevityChallenge
    ? Math.max(0, 7 - longevityDaysSinceStart)
    : 0;
  const longevityIsComplete = longevityChallenge
    ? longevityLoggedDays >= longevityRequiredDays
    : false;
  const longevityLogs = longevityChallenge
    ? [...longevityChallenge.logs].sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white"
            data-testid="button-back-to-home"
          >
            Back to Home
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full"
                      data-testid="button-update-profile-photo"
                    >
                      <ProfileAvatar className="h-20 w-20" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black border-white/10 text-white text-xs">
                    Update image
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div>
                <h1 className="text-2xl font-bold">{displayName}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareOptions((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <Share2 className="h-4 w-4" />
                Share this page
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            data-testid="input-profile-photo"
          />

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


        <Dialog
          open={isCropOpen}
          onOpenChange={(open) => {
            if (!open) handleCropCancel();
          }}
        >
          <DialogContent className="bg-black border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg">Crop profile photo</DialogTitle>
              <DialogDescription className="text-white/60">
                Drag to reposition and use the slider to zoom.
              </DialogDescription>
            </DialogHeader>
            {cropImageUrl && (
              <div className="space-y-4">
                <div
                  className={`relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/60 ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{ width: CROP_SIZE, height: CROP_SIZE }}
                  onPointerDown={handleCropPointerDown}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerLeave={handleCropPointerUp}
                >
                  <img
                    ref={imageRef}
                    src={cropImageUrl}
                    alt="Crop preview"
                    onLoad={(event) => {
                      const target = event.currentTarget;
                      setImageSize({
                        width: target.naturalWidth,
                        height: target.naturalHeight,
                      });
                    }}
                    className="absolute left-1/2 top-1/2 select-none"
                    style={imageStyle}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={cropZoom}
                    onChange={(event) => setCropZoom(Number(event.target.value))}
                    className="w-full accent-[#6fa5ff]"
                    data-testid="input-crop-zoom"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleCropCancel} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleCropSave} className="flex-1">
                    Save
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Share an Update
              </h3>
              <p className="text-xs text-white/50">
                Post progress updates to your friends feed (max 4 photos).
              </p>
            </div>
            <span className="text-xs text-white/40">No photo storage</span>
          </div>
          <textarea
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleShareUpdate();
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
            placeholder="Share a milestone or weekly progress..."
            data-testid="input-share-update"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white">
              <Camera className="h-3.5 w-3.5" />
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddUpdatePhotos}
                data-testid="input-update-photos"
              />
            </label>
            <span className="text-xs text-white/40">
              {updatePhotos.length}/4 photos
            </span>
            <div className="ml-auto flex items-center gap-2 text-xs text-white/60">
              <span>{shareUpdate ? "Shared" : "Private"}</span>
              <Switch checked={shareUpdate} onCheckedChange={setShareUpdate} />
            </div>
          </div>
          {updatePhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {updatePhotos.map((photo, index) => (
                <div
                  key={`${photo}-${index}`}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40"
                >
                  <img src={photo} alt="Update upload" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveUpdatePhoto(index)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white/80"
                    data-testid={`button-remove-update-photo-${index}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Challenges
            </h3>
            <p className="text-xs text-white/50">
              Join a challenge to track your time, steps, and pins.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowChallengePicker(true)}
            data-testid="button-join-challenge"
            disabled={!user}
          >
            Join Challenge
          </Button>
        </div>
        {activeChallenge && (
          <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeChallenge.type} Challenge</p>
                <p className="text-xs text-white/50">
                  Started {new Date(activeChallenge.startedAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-lg font-mono text-primary">
                {formatDuration(elapsedSeconds)}
              </div>
            </div>
            {activeChallenge.startLocation && (
              <div className="text-xs text-white/50">
                Start pin: {activeChallenge.startLocation.lat.toFixed(4)},{" "}
                {activeChallenge.startLocation.lng.toFixed(4)}
              </div>
            )}
            {activeChallenge.invitedFriends.length > 0 && (
              <div className="text-xs text-white/50">
                Invited: {activeChallenge.invitedFriends.join(", ")}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">
                Steps recorded:{" "}
                {(lastStepsRef.current ?? activeChallenge.stepsStart).toLocaleString()}
              </div>
              <Button
                variant="destructive"
                onClick={() => handleStopChallenge(false)}
                data-testid="button-stop-challenge"
              >
                Stop Challenge
              </Button>
            </div>
            <p className="text-[11px] text-white/40">
              Auto-stops after 5 minutes with no step updates.
            </p>
          </div>
        )}
        {scheduledChallenges.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Scheduled Challenges</p>
            {scheduledChallenges.map((challenge) => {
              const startTime = new Date(challenge.scheduledFor).getTime();
              const isReady = scheduleNow >= startTime;
              return (
                <div
                  key={challenge.id}
                  className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{challenge.type} Challenge</p>
                      <p className="text-xs text-white/50">
                        Starts {new Date(challenge.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isReady ? "default" : "outline"}
                      onClick={() => handleStartScheduledChallenge(challenge)}
                      disabled={!isReady || !!activeChallenge}
                      data-testid={`button-start-scheduled-${challenge.id}`}
                    >
                      {isReady ? "Start Challenge" : "Scheduled"}
                    </Button>
                  </div>
                  {challenge.invitedFriends.length > 0 && (
                    <p className="text-xs text-white/50">
                      Invited: {challenge.invitedFriends.join(", ")}
                    </p>
                  )}
                  <p className="text-[11px] text-white/40">
                    {canNotify()
                      ? "Reminder notification scheduled."
                      : "Enable notifications to get a reminder."}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={showChallengePicker}
        onOpenChange={(open) => {
          setShowChallengePicker(open);
          if (!open) {
            resetChallengeDialog();
          }
        }}
      >
        <DialogContent className="bg-black border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Join a challenge</DialogTitle>
            <DialogDescription className="text-white/60">
              Pick a challenge type to start your timer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-white/40">Challenge Type</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["Hiking", "Running", "Biking"] as ChallengeType[]).map((type) => {
                  const isSelected = selectedChallengeType === type;
                  return (
                    <Button
                      key={type}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => setSelectedChallengeType(type)}
                      data-testid={`button-select-${type.toLowerCase()}-challenge`}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-white/40">Invite Friends</p>
              <div className="grid gap-2">
                {friends.map((friend) => (
                  <label
                    key={friend.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={invitedFriends.includes(friend.name)}
                      onChange={() => toggleInviteFriend(friend.name)}
                      data-testid={`checkbox-invite-${friend.id}`}
                    />
                    <span>{friend.name}</span>
                  </label>
                ))}
                {friends.length === 0 && (
                  <p className="text-xs text-white/50">No friends to invite yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Schedule for later</p>
                  <p className="text-xs text-white/50">
                    Start 24 hours to 7 days in advance.
                  </p>
                </div>
                <Switch checked={scheduleChallenge} onCheckedChange={setScheduleChallenge} />
              </div>
              {scheduleChallenge && (
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Start time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledStart}
                    min={scheduleMin}
                    max={scheduleMax}
                    onChange={(event) => setScheduledStart(event.target.value)}
                    className="bg-black/40 border-white/10 text-sm"
                    data-testid="input-schedule-challenge"
                  />
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-white/80">Share scheduled challenge</p>
                      <p className="text-[11px] text-white/50">
                        Posts the invite to your public profile.
                      </p>
                    </div>
                    <Switch
                      checked={shareScheduledChallenge}
                      onCheckedChange={setShareScheduledChallenge}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setShowChallengePicker(false)}>
                Cancel
              </Button>
              {scheduleChallenge ? (
                <Button
                  onClick={handleScheduleChallenge}
                  disabled={!selectedChallengeType}
                  data-testid="button-schedule-challenge"
                >
                  Schedule Challenge
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    selectedChallengeType &&
                    handleStartChallenge(selectedChallengeType, { invitedFriends })
                  }
                  disabled={!selectedChallengeType}
                  data-testid="button-start-challenge"
                >
                  Start Challenge
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingChallenge}
        onOpenChange={(open) => {
          if (!open && pendingChallenge) {
            handleFinalizeChallenge(false);
          }
        }}
      >
        <DialogContent className="bg-black border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Challenge complete</DialogTitle>
            <DialogDescription className="text-white/60">
              Review your stats and choose whether to share.
            </DialogDescription>
          </DialogHeader>
          {pendingChallenge && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{pendingChallenge.type} Challenge</span>
                  <span className="font-mono text-primary">
                    {formatDuration(pendingChallenge.durationSec)}
                  </span>
                </div>
                <div className="text-xs text-white/60">
                  Steps: {pendingChallenge.stepsDelta.toLocaleString()}
                </div>
                {pendingChallenge.invitedFriends &&
                  pendingChallenge.invitedFriends.length > 0 && (
                    <div className="text-xs text-white/60">
                      Invited: {pendingChallenge.invitedFriends.join(", ")}
                    </div>
                  )}
                {pendingChallenge.autoStopped && (
                  <div className="text-xs text-yellow-300/80">
                    Auto-stopped after steps stopped updating.
                  </div>
                )}
                {pendingChallenge.startLocation && (
                  <div className="text-xs text-white/60">
                    Start pin: {pendingChallenge.startLocation.lat.toFixed(4)},{" "}
                    {pendingChallenge.startLocation.lng.toFixed(4)}
                  </div>
                )}
                {pendingChallenge.endLocation && (
                  <div className="text-xs text-white/60">
                    Stop pin: {pendingChallenge.endLocation.lat.toFixed(4)},{" "}
                    {pendingChallenge.endLocation.lng.toFixed(4)}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium">Share to public profile</p>
                  <p className="text-xs text-white/60">Adds this challenge to the leaderboard.</p>
                </div>
                <Switch checked={shareChallenge} onCheckedChange={setShareChallenge} />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => handleFinalizeChallenge(false)}>
                  Keep Private
                </Button>
                <Button onClick={() => handleFinalizeChallenge(shareChallenge)}>
                  Save Challenge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Longevity Challenge
            </h3>
            <p className="text-xs text-white/50">
              Pick a weekly habit and post daily photo proof.
            </p>
          </div>
          {longevityChallenge && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetLongevityChallenge}
              data-testid="button-reset-longevity"
            >
              Start New
            </Button>
          )}
        </div>
        {longevityChallenge ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {longevityConfig?.title ?? "Longevity Challenge"}{" "}
                    <span className="text-xs text-white/50">({longevityConfig?.cadence})</span>
                  </p>
                  <p className="text-xs text-white/50">Started {longevityStartedAtLabel}</p>
                </div>
                <div className="text-xs text-white/60 text-right">
                  <div>
                    {longevityLoggedDays}/{longevityRequiredDays} days logged
                  </div>
                  <div>{longevityDaysRemaining} days remaining</div>
                </div>
              </div>
              <p className="text-xs text-white/60">{longevityConfig?.description}</p>
              {longevityIsComplete && (
                <div className="text-xs text-green-300">
                  Week complete! Start a new challenge to continue.
                </div>
              )}
            </div>

            {!longevityIsComplete && longevityDaysSinceStart <= 7 && (
              <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Log today's activity</p>
                    <p className="text-xs text-white/50">
                      {longevityHasLoggedToday
                        ? "Already logged for today."
                        : "Add photos of today's activity."}
                    </p>
                  </div>
                  <span className="text-[11px] uppercase tracking-widest text-white/40">
                    {longevityHasLoggedToday ? "Logged" : "Pending"}
                  </span>
                </div>
                {!longevityHasLoggedToday && (
                  <>
                    <textarea
                      value={longevityNote}
                      onChange={(event) => setLongevityNote(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      rows={2}
                      placeholder="Activity note (optional)"
                      data-testid="input-longevity-note"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white">
                        <Camera className="h-3.5 w-3.5" />
                        Add photos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleAddLongevityPhotos}
                          data-testid="input-longevity-photos"
                        />
                      </label>
                      <span className="text-xs text-white/40">
                        {longevityPhotos.length}/4 photos
                      </span>
                    </div>
                    {longevityPhotos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {longevityPhotos.map((photo, index) => (
                          <div
                            key={`${photo}-${index}`}
                            className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40"
                          >
                            <img src={photo} alt="Longevity upload" className="h-24 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveLongevityPhoto(index)}
                              className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white/80"
                              data-testid={`button-remove-longevity-photo-${index}`}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleLogLongevityDay}
                        disabled={longevityPhotos.length === 0}
                        data-testid="button-log-longevity-day"
                      >
                        Post Today's Activity
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {longevityDaysSinceStart > 7 && !longevityIsComplete && (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-xs text-yellow-100">
                This weekly challenge window is complete. Start a new longevity challenge to
                continue.
              </div>
            )}

            {longevityLogs.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-white/40">Daily Posts</p>
                {longevityLogs.map((log) => (
                  <div
                    key={log.date}
                    className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{log.date}</span>
                      <span>{log.photos.length} photos</span>
                    </div>
                    {log.note && <p className="text-sm text-white/80">{log.note}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      {log.photos.map((photo, index) => (
                        <img
                          key={`${log.date}-${index}`}
                          src={photo}
                          alt="Longevity day"
                          className="h-24 w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {LONGEVITY_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setSelectedLongevityType(option.type)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedLongevityType === option.type
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 bg-black/40 hover:border-white/30"
                  }`}
                  data-testid={`button-select-longevity-${option.type.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{option.title}</p>
                    <span className="text-xs text-white/50">{option.cadence}</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleStartLongevityChallenge}
                disabled={!selectedLongevityType}
                data-testid="button-start-longevity"
              >
                Start Longevity Challenge
              </Button>
            </div>
          </div>
        )}
      </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNetworkMembers((prev) => !prev)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition hover:border-white/30 hover:text-white"
                data-testid="button-open-network-members"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                  Friends Feed
                </h3>
                <p className="text-xs text-white/50">Latest shared updates from friends.</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteFeedDialog(true)}
              data-testid="button-delete-feed"
            >
              Delete feed
            </Button>
          </div>
          {showNetworkMembers && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNetworkDegree("second")}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    networkDegree === "second"
                      ? "border-primary/60 text-primary"
                      : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                  }`}
                  data-testid="button-second-degree"
                >
                  2nd Degree
                </button>
                <button
                  type="button"
                  onClick={() => setNetworkDegree("third")}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    networkDegree === "third"
                      ? "border-primary/60 text-primary"
                      : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                  }`}
                  data-testid="button-third-degree"
                >
                  3rd Degree
                </button>
                <span className="text-[11px] text-white/40">
                  {networkDegree === "second"
                    ? "Friends of friends"
                    : "Members in your area"}
                </span>
              </div>
              <div className="grid gap-2">
                {(networkDegree === "second" ? secondDegreeMembers : thirdDegreeMembers).map(
                  (member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSendNetworkRequest(member)}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/30 hover:text-white"
                      data-testid={`button-network-member-${member.id}`}
                    >
                      <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span>{member.name}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {publicFeedItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {item.authorAvatar ? (
                        <img src={item.authorAvatar} alt={item.authorName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                          {item.authorName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.authorName}</p>
                      <p className="text-xs text-white/40">{item.time}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-white/40">
                    {item.source === "you" ? "You" : "Friend"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/80">{item.content}</p>
                {item.challengeSchedule && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{item.challengeSchedule.type} Challenge</span>
                      <span>
                        {new Date(item.challengeSchedule.scheduledFor).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      Scheduled start (24 hours to 7 days in advance).
                    </p>
                    {item.challengeSchedule.invitedFriends.length > 0 && (
                      <p className="mt-2 text-[11px] text-white/60">
                        Invited: {item.challengeSchedule.invitedFriends.join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {item.challenge && (
                  <div className="mt-3 space-y-2">
                    {item.challenge.invitedFriends && item.challenge.invitedFriends.length > 0 && (
                      <div className="text-[11px] text-white/60">
                        Invited: {item.challenge.invitedFriends.join(", ")}
                      </div>
                    )}
                    {(() => {
                      const mapUrl = buildChallengeMapUrl(
                        item.challenge.startLocation ?? null,
                        item.challenge.endLocation ?? null
                      );
                      if (!mapUrl) {
                        return (
                          <div className="text-xs text-white/50">
                            Challenge location pins unavailable. Enable location access to show maps.
                          </div>
                        );
                      }
                      return (
                      <>
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          <img
                            src={mapUrl}
                            alt="Challenge map with start and stop pins"
                            className="h-40 w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                          {item.challenge.startLocation && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-300" />
                              Start {item.challenge.startLocation.lat.toFixed(4)},{" "}
                              {item.challenge.startLocation.lng.toFixed(4)}
                            </span>
                          )}
                          {item.challenge.endLocation && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-sky-300" />
                              Stop {item.challenge.endLocation.lat.toFixed(4)},{" "}
                              {item.challenge.endLocation.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </>
                      );
                    })()}
                  </div>
                )}
                {item.source === "friend" && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(item.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                        item.liked
                          ? "border-rose-400/50 text-rose-200"
                          : "border-white/10 text-white/60 hover:text-white"
                      }`}
                      data-testid={`button-like-${item.id}`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${item.liked ? "fill-rose-300 text-rose-300" : ""}`} />
                      Like
                    </button>
                    <span className="text-xs text-white/50">
                      {item.likesCount} {item.likesCount === 1 ? "like" : "likes"}
                    </span>
                  </div>
                )}
                {item.photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {item.photos.map((photo, index) => (
                      <img
                        key={`${item.id}-photo-${index}`}
                        src={photo}
                        alt="Shared update"
                        className="h-24 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <Dialog open={showDeleteFeedDialog} onOpenChange={setShowDeleteFeedDialog}>
          <DialogContent className="bg-black border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Delete feed?</DialogTitle>
              <DialogDescription className="text-white/60">
                This removes all posts from your feed. You can still create new updates later.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteFeedDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearFeed}>
                Delete feed
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Friends List
              </h3>
              <p className="text-xs text-white/50">People you follow.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteForm((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/60 hover:text-white"
              data-testid="button-invite-friend"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite
            </button>
          </div>
          {showInviteForm && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder="Email or username"
                className="h-10 flex-1 bg-black/40 border-white/10 text-sm"
                data-testid="input-invite-friend"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleInviteFriend}
                data-testid="button-send-invite"
              >
                Send invite
              </Button>
            </div>
          )}
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{friend.name}</p>
                  <p className="text-xs text-white/50">{friend.status}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-white/60 hover:text-white"
                  onClick={() => onViewFriend?.(friend)}
                  data-testid={`button-view-friend-${friend.id}`}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
