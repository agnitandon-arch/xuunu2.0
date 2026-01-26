import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share2, UserPlus, Heart, Plus, MapPin, Flag, Medal, Users, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import type { FriendProfile } from "@/pages/FriendProfileScreen";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteUser, updateProfile } from "firebase/auth";
import { useQuery } from "@tanstack/react-query";
import type { HealthEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit,
  where,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { getDeviceFeedItems, saveDeviceFeedItems } from "@/lib/deviceFeedStore";

const PAID_ACCOUNT_EMAIL = "agnishikha@yahoo.com";

type ChallengeType =
  | "Hiking"
  | "Running"
  | "Biking"
  | "Swimming"
  | "Strength Training"
  | "Longevity Challenge";

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

const isLongevityType = (value: unknown): value is LongevityChallengeType =>
  value === "Veggies" || value === "Strength" || value === "Cardio";

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
  userId?: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  time: string;
  postedAt?: string;
  content: string;
  photos: string[];
  shared: boolean;
  source: "friend" | "you";
  likesCount: number;
  liked: boolean;
  challenge?: ChallengeSummary;
  challengeSchedule?: ChallengeScheduleSummary;
  groupId?: string;
  groupName?: string;
};

type GroupRecord = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  members: string[];
  invitedFriends: string[];
  createdAt: string;
};

type PublicProfileMatch = {
  userId: string;
  displayName: string;
  photoUrl?: string;
};

interface DataInsightsScreenProps {
  onBack?: () => void;
  onPreviewPublicProfile?: () => void;
  onViewFriend?: (friend: FriendProfile) => void;
  onViewGroup?: (group: { id: string; name: string }) => void;
  openChallengePicker?: boolean;
  onChallengePickerOpened?: () => void;
}

export default function DataInsightsScreen({
  onBack,
  onPreviewPublicProfile,
  onViewFriend,
  onViewGroup,
  openChallengePicker,
  onChallengePickerOpened,
}: DataInsightsScreenProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { photoUrl, setPhotoUrl } = useProfilePhoto();
  const [shareUrl, setShareUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [updatePhotos, setUpdatePhotos] = useState<string[]>([]);
  const [isSharingUpdate, setIsSharingUpdate] = useState(false);
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isProfileInvisible, setIsProfileInvisible] = useState(false);
  const [profileVisibilityDraft, setProfileVisibilityDraft] = useState(false);
  const [isPaidAccount, setIsPaidAccount] = useState(false);
  const [firestorePaidStatus, setFirestorePaidStatus] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editingFeedItemId, setEditingFeedItemId] = useState<string | null>(null);
  const [editingFeedTimestamp, setEditingFeedTimestamp] = useState("");
  const [teamChallengeCount, setTeamChallengeCount] = useState(0);
  const [longevityChallenge, setLongevityChallenge] = useState<LongevityChallenge | null>(null);
  const [selectedLongevityType, setSelectedLongevityType] =
    useState<LongevityChallengeType | null>(null);
  const [longevityPhotos, setLongevityPhotos] = useState<string[]>([]);
  const [longevityNote, setLongevityNote] = useState("");
  const [showLongevityDialog, setShowLongevityDialog] = useState(false);
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [selectedChallengeType, setSelectedChallengeType] = useState<ChallengeType | null>(null);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
  const [groupInvitedFriends, setGroupInvitedFriends] = useState<string[]>([]);
  const [scheduleChallenge, setScheduleChallenge] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("");
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
  const liveLocationRef = useRef<ChallengeLocation>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const notifiedSchedulesRef = useRef<Set<string>>(new Set());
  const dailyNotifiedRef = useRef<Record<string, string>>({});
  const feedNotifiedRef = useRef<Set<string>>(new Set());
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
  const [contactsMatches, setContactsMatches] = useState<PublicProfileMatch[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [shareToGroup, setShareToGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [showGroupUpdatesDialog, setShowGroupUpdatesDialog] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupName, setActiveGroupName] = useState("");
  const [groupUpdates, setGroupUpdates] = useState<FeedItem[]>([]);
  const [isLoadingGroupUpdates, setIsLoadingGroupUpdates] = useState(false);
  const env = import.meta.env as Record<string, string | undefined>;
  const stripePortalUrl = env.VITE_STRIPE_PAYMENT_URL;
  const stripeMonthlyUrl = env.VITE_STRIPE_MONTHLY_URL;
  const stripeYearlyUrl = env.VITE_STRIPE_YEARLY_URL;

  const CROP_SIZE = 240;
  const OUTPUT_SIZE = 320;
  const displayName =
    displayNameOverride || user?.displayName || user?.email?.split("@")[0] || "Member";

  const { data: latestHealth, refetch: refetchHealth } = useQuery<HealthEntry | null>({
    queryKey: [`/api/health-entries/latest?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const { data: featureFlags } = useQuery<{
    paidStatus: boolean;
    cardLast4?: string | null;
    cardBrand?: string | null;
    stripeStatus?: string | null;
    hasCustomer?: boolean;
  }>({
    queryKey: [`/api/user-features?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const canNotify = () =>
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    notificationsEnabled;

  const sendNotification = (title: string, body: string) => {
    if (!canNotify()) return;
    toast({ title, description: body });
  };

  const ensureNotificationsEnabled = async () => {
    if (!user?.uid) return false;
    if (notificationsEnabled) return true;
    await setDoc(
      doc(db, "users", user.uid),
      { notificationsEnabled: true },
      { merge: true }
    );
    setNotificationsEnabled(true);
    return true;
  };

  const handleOpenPaymentPortal = async (plan?: "monthly" | "yearly") => {
    const planUrl =
      plan === "monthly" ? stripeMonthlyUrl : plan === "yearly" ? stripeYearlyUrl : undefined;
    const fallbackUrl =
      planUrl || stripePortalUrl || stripeMonthlyUrl || stripeYearlyUrl || "https://stripe.com";
    if (!user?.uid) {
      window.open(fallbackUrl, "_blank");
      return;
    }
    try {
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        userId: user.uid,
        plan: plan ?? "monthly",
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      console.error("Stripe checkout failed:", error);
    }
    window.open(fallbackUrl, "_blank");
    toast({
      title: "Premium membership",
      description:
        plan === "monthly"
          ? "Stripe monthly • $9.99/month."
          : plan === "yearly"
            ? "Stripe yearly • $99/year."
            : "Powered by Stripe • $9.99/month or $99/year.",
    });
  };

  const handleOpenPrimaryGroup = () => {
    if (groups.length === 0) {
      setShowGroupDialog(true);
      return;
    }
    if (groups.length === 1) {
      void handleOpenGroupUpdates(groups[0]);
      return;
    }
    setShowGroupPicker(true);
  };

  const handleManageBilling = async () => {
    if (!user?.uid) return;
    try {
      const response = await apiRequest("POST", "/api/stripe/create-portal-session", {
        userId: user.uid,
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      console.error("Stripe portal failed:", error);
    }
    if (stripePortalUrl) {
      window.open(stripePortalUrl, "_blank");
      return;
    }
    toast({
      title: "Billing unavailable",
      description: "We couldn't open the billing portal right now.",
      variant: "destructive",
    });
  };

  const deleteCollectionDocs = async (userId: string, collectionName: string) => {
    const ref = collection(db, "users", userId, collectionName);
    const snapshot = await getDocs(ref);
    if (snapshot.empty) return;
    await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid) return;
    if (deleteConfirmText.trim() !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: "Type DELETE to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }
    setIsDeletingAccount(true);
    try {
      await Promise.all([
        deleteCollectionDocs(user.uid, "feedItems"),
        deleteCollectionDocs(user.uid, "healthEntries"),
        deleteCollectionDocs(user.uid, "environmentalReadings"),
        deleteCollectionDocs(user.uid, "medications"),
        deleteCollectionDocs(user.uid, "medicationLogs"),
        deleteCollectionDocs(user.uid, "notes"),
        deleteCollectionDocs(user.uid, "bioSignatureSnapshots"),
        deleteCollectionDocs(user.uid, "challenges"),
        deleteCollectionDocs(user.uid, "challengeSchedules"),
        deleteCollectionDocs(user.uid, "longevityChallenge"),
        deleteCollectionDocs(user.uid, "settings"),
        deleteCollectionDocs(user.uid, "meta"),
      ]);

      const sentRequestsQuery = query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", user.uid)
      );
      const receivedRequestsQuery = query(
        collection(db, "friendRequests"),
        where("toUserId", "==", user.uid)
      );
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(sentRequestsQuery),
        getDocs(receivedRequestsQuery),
      ]);
      await Promise.all([
        ...sentSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
        ...receivedSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
      ]);

      await deleteDoc(doc(db, "publicProfiles", user.uid));
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      toast({
        title: "Account deleted",
        description: "Your account and data have been removed.",
      });
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      if (error?.code === "auth/requires-recent-login") {
        toast({
          title: "Re-authentication required",
          description: "Please sign in again and retry account deletion.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delete failed",
          description: "We couldn't delete your account right now.",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const friends = useMemo<FriendProfile[]>(
    () => [
      {
        id: "friend-1",
        name: "Ava Martinez",
        email: "ava.martinez@example.com",
        avatarUrl: "https://i.pravatar.cc/120?img=16",
        teamChallengeCount: 3,
      },
      {
        id: "friend-2",
        name: "Jordan Lee",
        email: "jordan.lee@example.com",
        avatarUrl: "https://i.pravatar.cc/120?img=12",
        teamChallengeCount: 1,
      },
      {
        id: "friend-3",
        name: "Riley Patel",
        email: "riley.patel@example.com",
        avatarUrl: "https://i.pravatar.cc/120?img=22",
        teamChallengeCount: 0,
      },
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
    if (!user || showEditProfileDialog) return;
    const baseName = user.displayName || user.email?.split("@")[0] || "";
    setUsernameDraft(baseName);
  }, [user?.uid, user?.displayName, user?.email, showEditProfileDialog]);

  useEffect(() => {
    if (!user?.uid) {
      setDisplayNameOverride(null);
      setIsPaidAccount(false);
      setFirestorePaidStatus(false);
      setIsProfileInvisible(false);
      setProfileVisibilityDraft(false);
      setTeamChallengeCount(0);
      setNotificationsEnabled(false);
      return;
    }
    const emailPaid =
      user.email?.toLowerCase() === PAID_ACCOUNT_EMAIL.toLowerCase();
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() ?? {};
        setDisplayNameOverride(
          typeof data.displayNameOverride === "string" ? data.displayNameOverride : null
        );
        setFirestorePaidStatus(!!data.paidStatus);
        setIsProfileInvisible(!!data.profileInvisible);
        setProfileVisibilityDraft(!!data.profileInvisible);
        setTeamChallengeCount(typeof data.teamChallengeCount === "number" ? data.teamChallengeCount : 0);
        setNotificationsEnabled(!!data.notificationsEnabled);
      },
      () => {
        setDisplayNameOverride(null);
        setFirestorePaidStatus(false);
        setIsProfileInvisible(false);
        setProfileVisibilityDraft(false);
        setTeamChallengeCount(0);
        setNotificationsEnabled(false);
      }
    );
    return unsubscribe;
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid) return;
    const emailPaid =
      user.email?.toLowerCase() === PAID_ACCOUNT_EMAIL.toLowerCase();
    const serverPaid = !!featureFlags?.paidStatus;
    const paid = emailPaid || serverPaid || firestorePaidStatus;
    setIsPaidAccount(paid);
    if (featureFlags && firestorePaidStatus !== serverPaid) {
      void setDoc(
        doc(db, "users", user.uid),
        { paidStatus: serverPaid },
        { merge: true }
      );
    }
  }, [user?.uid, user?.email, featureFlags, firestorePaidStatus]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid, "longevityChallenge", "current");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<LongevityChallenge>;
          if (!isLongevityType(data.type)) {
            setLongevityChallenge(null);
          } else {
            const logs = Array.isArray(data.logs)
              ? data.logs.map(normalizeLongevityLog).filter(Boolean)
              : [];
            const startedAt = normalizeDateValue(data.startedAt) ?? new Date().toISOString();
            setLongevityChallenge({
              id: data.id || snapshot.id,
              userId: data.userId || user.uid,
              type: data.type,
              startedAt,
              logs: logs as LongevityLog[],
            });
          }
        } else {
          setLongevityChallenge(null);
        }
        setSelectedLongevityType(null);
        setLongevityPhotos([]);
        setLongevityNote("");
      },
      () => {
        setLongevityChallenge(null);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setGroups([]);
      return;
    }
    const groupsRef = collection(db, "groups");
    const groupsQuery = query(groupsRef, where("members", "array-contains", user.uid));
    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const results = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<GroupRecord>;
          const members = Array.isArray(data.members)
            ? data.members.filter((member) => typeof member === "string")
            : [];
          const invitedFriends = Array.isArray(data.invitedFriends)
            ? data.invitedFriends.filter((friend) => typeof friend === "string")
            : [];
          return {
            id: docSnap.id,
            name: typeof data.name === "string" ? data.name : "Group",
            ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
            inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : "",
            members,
            invitedFriends,
            createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
          } as GroupRecord;
        });
        setGroups(results);
      },
      () => setGroups([])
    );
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = collection(db, "users", user.uid, "challengeSchedules");
    const scheduleQuery = query(ref, orderBy("scheduledFor", "asc"));
    const unsubscribe = onSnapshot(
      scheduleQuery,
      (snapshot) => {
        const schedules = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Omit<ChallengeSchedule, "id">;
            const scheduledFor = normalizeDateValue(data.scheduledFor);
            if (!scheduledFor) return null;
            return {
              id: docSnap.id,
              ...data,
              scheduledFor,
              invitedFriends: Array.isArray(data.invitedFriends) ? data.invitedFriends : [],
            };
          })
          .filter(Boolean) as ChallengeSchedule[];
        setScheduledChallenges(schedules);
      },
      () => setScheduledChallenges([])
    );
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const notified = notifiedSchedulesRef.current;
    Object.values(scheduleTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scheduleTimeoutsRef.current = {};

    scheduledChallenges.forEach((challenge) => {
      const scheduledTime = getDateMs(challenge.scheduledFor);
      if (!scheduledTime) {
        return;
      }
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
          notifiedSchedulesRef.current.add(challenge.id);
        }
      }, delay);
    });

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

  const handleCropSave = async () => {
    if (!cropImageUrl || !imageRef.current || !imageSize) {
      toast({
        title: "Photo not ready",
        description: "Please wait for the image to load, then try again.",
        variant: "destructive",
      });
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
    handleCropCancel();
    try {
      await setPhotoUrl(dataUrl);
      toast({
        title: "Profile photo updated",
        description: "Your photo will appear across all tabs.",
      });
    } catch {
      toast({
        title: "Photo update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
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

    const remainingSlots = 1 - updatePhotos.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Photo limit reached",
        description: "You can add up to 1 photo per update.",
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

    Promise.all(selected.map((file) => prepareUpdatePhoto(file)))
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

    Promise.all(selected.map((file) => readAndResizeImage(file, 1280)))
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

  const handleRemoveUpdatePhoto = (index: number) => {
    setUpdatePhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const normalizeFeedItems = (items: unknown): FeedItem[] => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const entry = item as Partial<FeedItem>;
        const authorName = entry.authorName || "You";
        const postedAtValue = normalizeDateValue(entry.postedAt) ?? undefined;
        const challenge =
          entry.challenge && typeof entry.challenge === "object"
            ? {
                ...entry.challenge,
                invitedFriends: Array.isArray(entry.challenge.invitedFriends)
                  ? entry.challenge.invitedFriends
                  : [],
              }
            : undefined;
        const challengeSchedule =
          entry.challengeSchedule && typeof entry.challengeSchedule === "object"
            ? {
                ...entry.challengeSchedule,
                scheduledFor:
                  normalizeDateValue(entry.challengeSchedule.scheduledFor) ?? "",
                invitedFriends: Array.isArray(entry.challengeSchedule.invitedFriends)
                  ? entry.challengeSchedule.invitedFriends
                  : [],
              }
            : undefined;
        return {
          id: entry.id || `feed-${Date.now()}`,
          userId: typeof entry.userId === "string" ? entry.userId : undefined,
          authorId: typeof entry.authorId === "string" ? entry.authorId : undefined,
          authorName,
          authorAvatar: entry.authorAvatar || "",
          postedAt: postedAtValue,
          time: entry.time || "Just now",
          content: entry.content || "",
          photos: Array.isArray(entry.photos) ? entry.photos : [],
          shared: typeof entry.shared === "boolean" ? entry.shared : true,
          source: entry.source === "friend" ? "friend" : "you",
          likesCount: typeof entry.likesCount === "number" ? entry.likesCount : 0,
          liked: typeof entry.liked === "boolean" ? entry.liked : false,
          challenge,
          challengeSchedule,
          groupId: typeof entry.groupId === "string" ? entry.groupId : undefined,
          groupName: typeof entry.groupName === "string" ? entry.groupName : undefined,
        };
      })
      .filter(Boolean) as FeedItem[];
  };

  const stripUndefined = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value
        .map((item) => stripUndefined(item))
        .filter((item) => item !== undefined);
    }
    if (value instanceof Date) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
        if (val === undefined) return acc;
        const cleaned = stripUndefined(val);
        if (cleaned === undefined) return acc;
        acc[key] = cleaned;
        return acc;
      }, {});
    }
    return value;
  };

  const saveFeedItem = async (item: FeedItem) => {
    if (!user?.uid) return false;
    try {
      const cleaned = stripUndefined({
        ...item,
        userId: user.uid,
        authorId: item.authorId ?? user.uid,
      }) as FeedItem;
      await setDoc(doc(db, "users", user.uid, "feedItems", item.id), cleaned, {
        merge: true,
      });
      return true;
    } catch (error) {
      console.error("Failed to save feed item:", error);
      return false;
    }
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
  ];

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  const mergeFeedItems = (lists: FeedItem[][]) => {
    const map = new Map<string, FeedItem>();
    lists.flat().forEach((item) => {
      map.set(item.id, item);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aTime = getDateMs(a.postedAt) ?? 0;
      const bTime = getDateMs(b.postedAt) ?? 0;
      return bTime - aTime;
    });
  };

  useEffect(() => {
    if (!user?.uid) {
      setFeedItems(buildDefaultFeedItems(photoUrl || ""));
      return;
    }
    let isActive = true;
    const loadFeedItems = async () => {
      const localItemsRaw = await getDeviceFeedItems(`feed-${user.uid}`);
      const localItems = normalizeFeedItems(localItemsRaw);
      if (isActive && localItems.length > 0) {
        setFeedItems(mergeFeedItems([localItems, buildDefaultFeedItems(photoUrl || "")]));
      }
      try {
        const feedRef = collection(db, "users", user.uid, "feedItems");
        const feedQuery = query(feedRef, orderBy("postedAt", "desc"));
        const snapshot = await getDocs(feedQuery);
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FeedItem, "id">),
        }));
        const normalized = normalizeFeedItems(data);
        const merged = mergeFeedItems([
          normalized,
          localItems,
          buildDefaultFeedItems(photoUrl || ""),
        ]);
        if (isActive) setFeedItems(merged);
        await saveDeviceFeedItems(`feed-${user.uid}`, normalized);
      } catch (error) {
        console.error("Failed to load feed items:", error);
        if (isActive && localItems.length === 0) {
          setFeedItems(buildDefaultFeedItems(photoUrl || ""));
        }
      }

      try {
        const response = await apiRequest("GET", `/api/user-updates?userId=${user.uid}&limit=50`);
        const updates = await response.json();
        const normalizedUpdates = normalizeFeedItems(updates);
        if (isActive && normalizedUpdates.length > 0) {
          setFeedItems((prev) => mergeFeedItems([normalizedUpdates, prev]));
        }
      } catch (error) {
        console.error("Failed to load server updates:", error);
      }
    };
    void loadFeedItems();
    return () => {
      isActive = false;
    };
  }, [user?.uid, photoUrl]);

  useEffect(() => {
    if (!user?.uid) return;
    void saveDeviceFeedItems(`feed-${user.uid}`, feedItems);
  }, [feedItems, user?.uid]);

  useEffect(() => {
    if (!user?.uid || feedItems.length === 0) return;
    const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const expired = feedItems.filter((item) => {
      if (item.source !== "you") return false;
      if (!item.photos || item.photos.length === 0) return false;
      const postedMs = getDateMs(item.postedAt);
      return postedMs !== null && postedMs < cutoffMs;
    });
    if (expired.length === 0) return;
    const expiredIds = new Set(expired.map((item) => item.id));
    setFeedItems((prev) =>
      prev.map((item) => (expiredIds.has(item.id) ? { ...item, photos: [] } : item))
    );
    const updates = expired.map((item) =>
      updateDoc(doc(db, "users", user.uid, "feedItems", item.id), {
        photos: [],
      }).catch((error) => {
        console.error("Failed to clear expired photos:", error);
      })
    );
    const groupUpdates = expired
      .filter((item) => item.groupId)
      .map((item) =>
        updateDoc(doc(db, "groups", item.groupId as string, "updates", item.id), {
          photos: [],
        }).catch((error) => {
          console.error("Failed to clear group photos:", error);
        })
      );
    void Promise.all([...updates, ...groupUpdates]);
  }, [feedItems, user?.uid]);

  useEffect(() => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.source === "you"
          ? { ...item, authorAvatar: photoUrl || "", authorName: displayName }
          : item
      )
    );
  }, [photoUrl, displayName]);

  const publicFeedItems = useMemo(
    () => feedItems.filter((item) => item.shared || item.source === "you"),
    [feedItems]
  );

  const hasUserChallengePost = useMemo(
    () =>
      feedItems.some(
        (item) =>
          item.source === "you" &&
          (item.challenge || item.challengeSchedule)
      ) || scheduledChallenges.length > 0,
    [feedItems, scheduledChallenges.length]
  );

  const invitedFriendNames = useMemo(() => {
    const names = new Set<string>();
    const addNames = (list?: string[]) => {
      list?.forEach((name) => names.add(name));
    };
    scheduledChallenges.forEach((challenge) => addNames(challenge.invitedFriends));
    feedItems.forEach((item) => {
      if (item.challenge?.invitedFriends) {
        addNames(item.challenge.invitedFriends);
      }
      if (item.challengeSchedule?.invitedFriends) {
        addNames(item.challengeSchedule.invitedFriends);
      }
    });
    if (activeChallenge?.invitedFriends) {
      addNames(activeChallenge.invitedFriends);
    }
    if (pendingChallenge?.invitedFriends) {
      addNames(pendingChallenge.invitedFriends);
    }
    return names;
  }, [scheduledChallenges, feedItems, activeChallenge, pendingChallenge]);

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

  const handleDeleteFeedItem = async (id: string) => {
    setFeedItems((prev) => prev.filter((item) => item.id !== id));
    if (editingFeedItemId === id) {
      setEditingFeedItemId(null);
      setEditingFeedTimestamp("");
    }
    if (user?.uid) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "feedItems", id));
      } catch {
        // Ignore delete errors.
      }
    }
    toast({
      title: "Post deleted",
      description: "Your post has been removed from the feed.",
    });
  };

  const handleStartEditFeedTime = (item: FeedItem) => {
    const baseDate = item.postedAt ? new Date(item.postedAt) : new Date();
    const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    setEditingFeedItemId(item.id);
    setEditingFeedTimestamp(formatDateTimeLocal(safeDate));
  };

  const handleSaveFeedTime = async () => {
    if (!editingFeedItemId) return;
    const nextDate = new Date(editingFeedTimestamp);
    if (Number.isNaN(nextDate.getTime())) {
      toast({
        title: "Invalid date",
        description: "Please select a valid time and date.",
        variant: "destructive",
      });
      return;
    }
    const nextIso = nextDate.toISOString();
    const nextLabel = nextDate.toLocaleString();
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === editingFeedItemId
          ? {
              ...item,
              postedAt: nextIso,
              time: nextLabel,
            }
          : item
      )
    );
    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid, "feedItems", editingFeedItemId), {
          postedAt: nextIso,
          time: nextLabel,
        });
      } catch {
        // Ignore update errors.
      }
    }
    setEditingFeedItemId(null);
    setEditingFeedTimestamp("");
    toast({
      title: "Time updated",
      description: "Challenge date and time updated.",
    });
  };

  const handleCancelEditFeedTime = () => {
    setEditingFeedItemId(null);
    setEditingFeedTimestamp("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canNotify()) return;
    const notified = feedNotifiedRef.current;
    const newFriendItems = feedItems.filter(
      (item) => item.source === "friend" && !notified.has(item.id)
    );
    if (newFriendItems.length > 0) {
      newFriendItems.forEach((item) => {
        sendNotification("Friend update", `${item.authorName} shared an update.`);
        notified.add(item.id);
      });
      feedNotifiedRef.current = new Set(notified);
    }
  }, [feedItems]);

  const handleShareUpdate = async () => {
    if (!updateText.trim() && updatePhotos.length === 0) {
      toast({
        title: "Add a note or photo",
        description: "Share a short update or add photos to post.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to share an update.",
        variant: "destructive",
      });
      return;
    }

    if (isSharingUpdate) return;
    setIsSharingUpdate(true);
    const feedId = `feed-${Date.now()}`;

    const selectedGroup = groups.find((group) => group.id === selectedGroupId);
    const draft = {
      text: updateText,
      photos: updatePhotos,
      shareToGroup,
      selectedGroupId,
    };

    let sanitizedPhotos = updatePhotos;
    try {
      sanitizedPhotos = await Promise.all(
        updatePhotos.map(async (photo) =>
          photo.startsWith("data:") ? compressImageForFirestore(photo) : photo
        )
      );
    } catch (error) {
      console.error("Failed to compress update photos:", error);
      toast({
        title: "Photo upload failed",
        description: "Please try adding your photo again.",
        variant: "destructive",
      });
      setIsSharingUpdate(false);
      return;
    }

    const sharedPublicly = !shareToGroup && !isProfileInvisible;
    const newItem: FeedItem = {
      id: feedId,
      authorId: user.uid,
      authorName: "You",
      authorAvatar: photoUrl || "",
      postedAt: new Date().toISOString(),
      time: "Just now",
      content: updateText.trim() || "Shared new progress.",
      photos: sanitizedPhotos,
      shared: sharedPublicly,
      source: "you" as const,
      likesCount: 0,
      liked: false,
      groupId: shareToGroup ? selectedGroup?.id : undefined,
      groupName: shareToGroup ? selectedGroup?.name : undefined,
    };

    setFeedItems((prev) => [newItem, ...prev]);
    setUpdateText("");
    setUpdatePhotos([]);
    setShareToGroup(false);
    setSelectedGroupId("");
    let firestoreSaved = false;
    let serverSaved = false;
    try {
      const firestoreSave = saveFeedItem(newItem);
      const timeoutMs = 6000;
      firestoreSaved = await Promise.race([
        firestoreSave,
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), timeoutMs);
        }),
      ]);

      if (!firestoreSaved) {
        try {
          const serverPayload = stripUndefined({
            userId: user.uid,
            id: feedId,
            content: newItem.content,
            photos: newItem.photos,
            shared: newItem.shared,
            groupId: newItem.groupId,
            groupName: newItem.groupName,
            postedAt: newItem.postedAt,
          });
          const response = await apiRequest("POST", "/api/user-updates", serverPayload);
          serverSaved = response.ok;
        } catch (error) {
          console.error("Failed to save update to server:", error);
        }
      }

      if (shareToGroup && selectedGroup) {
        try {
          const groupPayload = stripUndefined({
            ...newItem,
            authorId: user.uid,
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
          }) as Record<string, unknown>;
          await setDoc(doc(db, "groups", selectedGroup.id, "updates", feedId), groupPayload);
        } catch (error) {
          console.error("Failed to save group update:", error);
        }
      }

      if (firestoreSaved || serverSaved) {
        toast({
          title: "Update shared",
          description: "Your latest progress is now visible in the feed.",
        });
      } else {
        toast({
          title: "Update failed",
          description: "We couldn't save your update. Please try again.",
          variant: "destructive",
        });
        setFeedItems((prev) => prev.filter((item) => item.id !== feedId));
        setUpdateText(draft.text);
        setUpdatePhotos(draft.photos);
        setShareToGroup(draft.shareToGroup);
        setSelectedGroupId(draft.selectedGroupId);
      }
    } catch (error) {
      console.error("Failed to share update:", error);
      toast({
        title: "Update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharingUpdate(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to update your username.",
        variant: "destructive",
      });
      return false;
    }
    const nextName = usernameDraft.trim();
    if (!nextName) {
      toast({
        title: "Enter a username",
        description: "Your username cannot be empty.",
        variant: "destructive",
      });
      return false;
    }
    setIsSavingName(true);
    try {
      const timeoutMs = 6000;
      await Promise.race([
        updateProfile(user, { displayName: nextName }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutMs)
        ),
      ]);
      await Promise.race([
        setDoc(
          doc(db, "users", user.uid),
          { displayNameOverride: nextName },
          { merge: true }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutMs)
        ),
      ]);
      await setDoc(
        doc(db, "publicProfiles", user.uid),
        {
          displayName: nextName,
          emailLower: user.email ? user.email.toLowerCase() : null,
          photoUrl: photoUrl || null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setDisplayNameOverride(nextName);
      setFeedItems((prev) =>
        prev.map((item) =>
          item.source === "you" ? { ...item, authorName: nextName } : item
        )
      );
      toast({
        title: "Username updated",
        description: "Your profile name has been saved.",
      });
      return true;
    } catch {
      toast({
        title: "Update failed",
        description: "Unable to update your username right now.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveProfileSettings = async () => {
    setShowEditProfileDialog(false);
    const trimmedName = usernameDraft.trim();
    if (trimmedName && trimmedName !== displayName) {
      const saved = await handleSaveDisplayName();
      if (!saved) {
        return;
      }
    }
    if (user && profileVisibilityDraft !== isProfileInvisible) {
      setIsProfileInvisible(profileVisibilityDraft);
      if (profileVisibilityDraft) {
        setFeedItems((prev) =>
          prev.map((item) =>
            item.source === "you" ? { ...item, shared: false } : item
          )
        );
      }
      void setDoc(
        doc(db, "users", user.uid),
        { profileInvisible: profileVisibilityDraft },
        { merge: true }
      );
      toast({
        title: profileVisibilityDraft ? "Profile hidden" : "Profile visible",
        description: profileVisibilityDraft
          ? "Your profile is now invisible to everyone."
          : "Your profile is visible again.",
      });
    }
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

  const isStrengthTraining = (type?: string) => type === "Strength Training";

  const getChallengeMinutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));

  const getChallengeMetricLabel = (type?: string) =>
    isStrengthTraining(type) ? "Minutes" : "Steps";

  const getChallengeMetricValue = (type: string | undefined, durationSec: number, stepsDelta: number) =>
    isStrengthTraining(type)
      ? getChallengeMinutes(durationSec).toLocaleString()
      : stepsDelta.toLocaleString();

  const formatDateTimeLocal = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const formatTime = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatCountdown = (target: Date) => {
    const diffMs = target.getTime() - scheduleNow;
    if (diffMs <= 0) return "Start time reached";
    const totalMinutes = Math.floor(diffMs / (60 * 1000));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const buildScheduledDate = (date: Date, timeValue: string) => {
    const [hours, minutes] = timeValue.split(":").map((value) => Number(value));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    return next;
  };

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const getLocalDateKey = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

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

  const getDateMs = (value: unknown) => {
    const normalized = normalizeDateValue(value);
    if (!normalized) return null;
    const parsed = new Date(normalized);
    const time = parsed.getTime();
    return Number.isNaN(time) ? null : time;
  };

  const formatOptionalDate = (value: unknown, fallback: string) => {
    const normalized = normalizeDateValue(value);
    if (!normalized) return fallback;
    return new Date(normalized).toLocaleString();
  };

  const formatOptionalDateOnly = (value: unknown, fallback: string) => {
    const normalized = normalizeDateValue(value);
    if (!normalized) return fallback;
    return new Date(normalized).toLocaleDateString();
  };

  const normalizeLongevityLog = (log: unknown): LongevityLog | null => {
    if (!log || typeof log !== "object") return null;
    const entry = log as Partial<LongevityLog>;
    if (typeof entry.date !== "string") return null;
    return {
      date: entry.date,
      photos: Array.isArray(entry.photos) ? entry.photos : [],
      note: typeof entry.note === "string" ? entry.note : undefined,
    };
  };

  const createInviteCode = () =>
    Math.random().toString(36).slice(2, 8).toUpperCase();

  const handleCreateGroup = async () => {
    if (!user?.uid) {
      toast({
        title: "Not signed in",
        description: "Please sign in to create a group.",
        variant: "destructive",
      });
      return;
    }
    const trimmed = groupName.trim();
    if (!trimmed) {
      toast({
        title: "Group name required",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }
    if (trimmed.length > 20) {
      toast({
        title: "Group name too long",
        description: "Group names can be up to 20 characters.",
        variant: "destructive",
      });
      return;
    }
    setIsCreatingGroup(true);
    setShowGroupDialog(false);
    try {
      const inviteCode = createInviteCode();
      const groupRef = doc(collection(db, "groups"));
      const record: GroupRecord = {
        id: groupRef.id,
        name: trimmed,
        ownerId: user.uid,
        inviteCode,
        members: [user.uid],
        invitedFriends: groupInvitedFriends,
        createdAt: new Date().toISOString(),
      };
      await setDoc(groupRef, record);
      setGroupName("");
      setGroupInvitedFriends([]);
      setShowGroupDialog(false);
      toast({
        title: "Group created",
        description: `Invite code: ${inviteCode}`,
      });
      try {
        await setDoc(doc(db, "groupInvites", inviteCode), {
          groupId: record.id,
          ownerId: user.uid,
          groupName: record.name,
          createdAt: record.createdAt,
        });
      } catch (inviteError) {
        console.error("Failed to save group invite:", inviteError);
        toast({
          title: "Invite not saved",
          description: "Group created, but invite code failed to save.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create group:", error);
      toast({
        title: "Group creation failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleShareGroupInvite = async (group: GroupRecord) => {
    const message = `Join my group "${group.name}" in Xuunu with invite code: ${group.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Xuunu Group Invite", text: message });
        return;
      } catch {
        // fall back to copy
      }
    }
    await copyToClipboard(message, "Invite code");
  };

  const handleOpenGroupUpdates = async (group: GroupRecord) => {
    if (!group.id) return;
    if (onViewGroup) {
      onViewGroup({ id: group.id, name: group.name });
      return;
    }
    setActiveGroupId(group.id);
    setActiveGroupName(group.name);
    setShowGroupUpdatesDialog(true);
    setIsLoadingGroupUpdates(true);
    try {
      const updatesRef = collection(db, "groups", group.id, "updates");
      const updatesQuery = query(updatesRef, orderBy("postedAt", "desc"), limit(20));
      const snapshot = await getDocs(updatesQuery);
      const updates = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FeedItem, "id">),
      }));
      setGroupUpdates(normalizeFeedItems(updates));
    } catch (error) {
      console.error("Failed to load group updates:", error);
      setGroupUpdates([]);
    } finally {
      setIsLoadingGroupUpdates(false);
    }
  };

  const resizeImageDataUrl = (
    dataUrl: string,
    maxSize = 720,
    quality = 0.74
  ) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = Math.max(image.width, image.height);
        if (maxDimension <= maxSize) {
          resolve(dataUrl);
          return;
        }
        const scale = maxSize / maxDimension;
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to resize image"));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = () => reject(new Error("Unable to load image"));
      image.src = dataUrl;
    });

  const readAndResizeImage = async (file: File, maxSize = 720, quality = 0.74) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resized = await resizeImageDataUrl(reader.result as string, maxSize, quality);
          resolve(resized);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const estimateDataUrlBytes = (dataUrl: string) => {
    const base64 = dataUrl.split(",")[1] ?? "";
    return Math.ceil((base64.length * 3) / 4);
  };

  const compressImageForFirestore = async (
    dataUrl: string,
    maxSize = 720,
    targetBytes = 360_000,
    startQuality = 0.7
  ) => {
    let quality = startQuality;
    let size = maxSize;
    let result = await resizeImageDataUrl(dataUrl, size, quality);
    let attempts = 0;
    while (estimateDataUrlBytes(result) > targetBytes && attempts < 4) {
      quality = Math.max(0.45, quality - 0.1);
      size = Math.max(420, Math.round(size * 0.85));
      result = await resizeImageDataUrl(result, size, quality);
      attempts += 1;
    }
    return result;
  };

  const prepareUpdatePhoto = async (file: File) => {
    const resized = await readAndResizeImage(file, 960, 0.72);
    return compressImageForFirestore(resized);
  };

  const uploadPhotoDataUrls = async (photos: string[], pathPrefix: string) => {
    if (!user?.uid || photos.length === 0) return [];
    const uploads = photos.map(async (photo, index) => {
      if (!photo.startsWith("data:")) return photo;
      const resized = await resizeImageDataUrl(photo);
      const photoRef = ref(storage, `${pathPrefix}/${Date.now()}-${index}.jpg`);
      await uploadString(photoRef, resized, "data_url");
      return await getDownloadURL(photoRef);
    });
    return Promise.all(uploads);
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
    setScheduleDate(undefined);
    setScheduleTime("");
    setShareScheduledChallenge(true);
  };

  useEffect(() => {
    if (!scheduleChallenge) return;
    if (scheduleDate && scheduleTime) return;
    const { min } = getScheduleBounds();
    setScheduleDate(min);
    setScheduleTime(formatTime(min));
  }, [scheduleChallenge, scheduleDate, scheduleTime]);

  useEffect(() => {
    if (!isProfileInvisible) return;
    setShareScheduledChallenge(false);
    setShareChallenge(false);
  }, [isProfileInvisible]);

  useEffect(() => {
    if (!openChallengePicker) return;
    setShowChallengePicker(true);
    onChallengePickerOpened?.();
  }, [openChallengePicker, onChallengePickerOpened]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setScheduleTick((prev) => prev + 1);
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const formatCoord = (value: number) => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed.toFixed(6);
  };

  const formatCoordDisplay = (value: number) => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return "--";
    return parsed.toFixed(4);
  };

  const normalizeChallengeLocation = (location: ChallengeLocation): ChallengeLocation => {
    if (!location) return null;
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

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
    const validPoints = points
      .map((point) => ({
        lat: Number(point.lat),
        lng: Number(point.lng),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (validPoints.length === 0) return "";
    const distanceKm =
      validPoints.length === 2 ? getDistanceKm(validPoints[0], validPoints[1]) : 0.3;
    const zoom = getZoomForDistance(distanceKm);
    const centerLat =
      validPoints.length === 2
        ? (validPoints[0].lat + validPoints[1].lat) / 2
        : validPoints[0].lat;
    const centerLng =
      validPoints.length === 2
        ? (validPoints[0].lng + validPoints[1].lng) / 2
        : validPoints[0].lng;
    const markers = validPoints
      .map((point, index) => {
        const lat = formatCoord(point.lat);
        const lng = formatCoord(point.lng);
        if (!lat || !lng) return null;
        return `${lat},${lng},${index === 0 ? "red" : "blue"}`;
      })
      .filter(Boolean)
      .join("|");
    if (!markers) return "";
    const centerLatValue = formatCoord(centerLat);
    const centerLngValue = formatCoord(centerLng);
    if (!centerLatValue || !centerLngValue) return "";
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLatValue},${centerLngValue}&zoom=${zoom}&size=640x320&maptype=mapnik&markers=${encodeURIComponent(
      markers
    )}`;
  };

  const saveChallenge = async (challenge: ChallengeRecord) => {
    if (!user?.uid) return;
    const sanitized: ChallengeRecord = {
      ...challenge,
      startLocation: normalizeChallengeLocation(challenge.startLocation),
      endLocation: normalizeChallengeLocation(challenge.endLocation),
      invitedFriends: challenge.invitedFriends ?? [],
    };
    await setDoc(doc(db, "users", user.uid, "challenges", challenge.id), sanitized, {
      merge: true,
    });
  };

  const handleStartChallenge = async (
    type: ChallengeType,
    options?: { invitedFriends?: string[] }
  ) => {
    if (!user) return;
    if (challengesLocked) {
      toast({
        title: "Unlock challenges",
        description: "Upgrade to a paid account to join challenges.",
        variant: "destructive",
      });
      return;
    }
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
      description: isStrengthTraining(type)
        ? "Timer is running. Track your minutes."
        : "Timer is running. Move to record steps.",
    });
  };

  const handleScheduleChallenge = async () => {
    if (!user || !selectedChallengeType) return;
    if (challengesLocked) {
      toast({
        title: "Unlock challenges",
        description: "Upgrade to a paid account to schedule challenges.",
        variant: "destructive",
      });
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast({
        title: "Pick a start time",
        description: "Schedule at least 24 hours ahead.",
        variant: "destructive",
      });
      return;
    }
    const scheduledDate = buildScheduledDate(scheduleDate, scheduleTime);
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
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
    await setDoc(doc(db, "users", user.uid, "challengeSchedules", record.id), record);
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
        postedAt: new Date().toISOString(),
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
      await saveFeedItem(feedItem);
      setFeedItems((prev) => [feedItem, ...prev]);
    }
    setShowChallengePicker(false);
    resetChallengeDialog();
    toast({
      title: "Challenge scheduled",
      description: `Starts ${scheduledDate.toLocaleString()}.`,
    });
  };

  const handleStartScheduledChallenge = async (challenge: ChallengeSchedule) => {
    const startTime = getDateMs(challenge.scheduledFor);
    if (!startTime) {
      toast({
        title: "Missing schedule time",
        description: "This challenge is missing a valid start time.",
        variant: "destructive",
      });
      return;
    }
    if (Date.now() < startTime) {
      toast({
        title: "Too early",
        description: "This challenge cannot start before its scheduled time.",
        variant: "destructive",
      });
      return;
    }
    if (user?.uid) {
      await deleteDoc(doc(db, "users", user.uid, "challengeSchedules", challenge.id));
    }
    handleStartChallenge(challenge.type, { invitedFriends: challenge.invitedFriends });
  };

  const toggleInviteFriend = (name: string) => {
    setInvitedFriends((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const toggleGroupInviteFriend = (name: string) => {
    setGroupInvitedFriends((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const saveLongevityChallenge = async (challenge: LongevityChallenge | null) => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid, "longevityChallenge", "current");
    if (challenge) {
      await setDoc(ref, challenge);
    } else {
      await deleteDoc(ref);
    }
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
    if (challengesLocked) {
      toast({
        title: "Unlock challenges",
        description: "Upgrade to a paid account to start longevity challenges.",
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
    void saveLongevityChallenge(record);
    setSelectedLongevityType(null);
    setLongevityPhotos([]);
    setLongevityNote("");
    toast({
      title: "Longevity challenge started",
      description: "Log your daily activity with photos.",
    });
  };

  const handleLogLongevityDay = async () => {
    if (!longevityChallenge) return;
    if (!user?.uid) {
      toast({
        title: "Not signed in",
        description: "Please sign in to log your challenge.",
        variant: "destructive",
      });
      return;
    }
    if (challengesLocked) {
      toast({
        title: "Unlock challenges",
        description: "Upgrade to a paid account to log challenge days.",
        variant: "destructive",
      });
      return;
    }
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
    const startedAt = getDateMs(longevityChallenge.startedAt) ?? Date.now();
    const daysSinceStart = Math.floor((Date.now() - startedAt) / (24 * 60 * 60 * 1000)) + 1;
    if (daysSinceStart > 7) {
      toast({
        title: "Week complete",
        description: "Start a new longevity challenge for this week.",
        variant: "destructive",
      });
      return;
    }
    let uploadedPhotos: string[] = [];
    try {
      uploadedPhotos = await uploadPhotoDataUrls(
        longevityPhotos,
        `users/${user.uid}/longevity/${longevityChallenge.id}/${todayKey}`
      );
    } catch {
      toast({
        title: "Photo upload failed",
        description: "Please try again. Your log was not saved.",
        variant: "destructive",
      });
      return;
    }
    const log: LongevityLog = {
      date: todayKey,
      photos: uploadedPhotos,
      note: longevityNote.trim() ? longevityNote.trim() : undefined,
    };
    const updated = {
      ...longevityChallenge,
      logs: [log, ...longevityChallenge.logs],
    };
    setLongevityChallenge(updated);
    await saveLongevityChallenge(updated);
    setLongevityPhotos([]);
    setLongevityNote("");
    toast({
      title: "Day logged",
      description: "Your longevity activity has been saved.",
    });
  };

  const handleResetLongevityChallenge = () => {
    setLongevityChallenge(null);
    void saveLongevityChallenge(null);
    setSelectedLongevityType(null);
    setLongevityPhotos([]);
    setLongevityNote("");
  };

  const handleStopChallenge = useCallback(
    async (autoStopped = false) => {
      if (!activeChallenge || !user) return;
      const current = activeChallenge;
      setActiveChallenge(null);
      const endLocation = liveLocationRef.current ?? (await getCurrentLocation());
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

  const handleFinalizeChallenge = async (shared: boolean, closeImmediately = false) => {
    if (!pendingChallenge) return;
    if (!user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to save your challenge.",
        variant: "destructive",
      });
      return;
    }
    const record = { ...pendingChallenge, shared };
    if (closeImmediately) {
      setPendingChallenge(null);
      setShareChallenge(true);
    }
    let challengeSaved = true;
    try {
      await saveChallenge(record);
    } catch (error) {
      console.error("Failed to save challenge:", error);
      challengeSaved = false;
    }
    if (record.invitedFriends && record.invitedFriends.length > 0 && user) {
      const nextCount = teamChallengeCount + 1;
      setTeamChallengeCount(nextCount);
      await setDoc(
        doc(db, "users", user.uid),
        { teamChallengeCount: nextCount },
        { merge: true }
      );
    }
    let feedSaved = true;
    if (shared) {
      const feedItem: FeedItem = {
        id: `challenge-${record.id}`,
        authorName: "You",
        authorAvatar: photoUrl || "",
        postedAt: new Date().toISOString(),
        time: "Just now",
        content: `${record.type} challenge completed in ${formatDuration(record.durationSec)} (${getChallengeMetricValue(
          record.type,
          record.durationSec,
          record.stepsDelta
        )} ${getChallengeMetricLabel(record.type).toLowerCase()}).`,
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
      feedSaved = await saveFeedItem(feedItem);
      setFeedItems((prev) => [feedItem, ...prev]);
    }
    if (!challengeSaved || (shared && !feedSaved)) {
      toast({
        title: "Challenge saved with issues",
        description: "We couldn't sync this challenge to the cloud. Please try again.",
        variant: "destructive",
      });
    }
    if (!closeImmediately) {
      setPendingChallenge(null);
      setShareChallenge(true);
    }
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
    if (!activeChallenge) {
      if (locationWatchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
      locationWatchIdRef.current = null;
      liveLocationRef.current = null;
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        liveLocationRef.current = nextLocation;
        setActiveChallenge((prev) =>
          prev && !prev.startLocation ? { ...prev, startLocation: nextLocation } : prev
        );
      },
      () => {
        // Ignore location watch errors.
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    locationWatchIdRef.current = watchId;
    return () => {
      navigator.geolocation.clearWatch(watchId);
      locationWatchIdRef.current = null;
    };
  }, [activeChallenge]);

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
    const invites = inviteValue
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (invites.length === 0) {
      toast({
        title: "Enter an email or username",
        description: "Add a friend by invite to grow your circle.",
        variant: "destructive",
      });
      return;
    }
    const inviteLink = profileUrl || shareUrl || window.location.origin;
    const message = `Join me on Xuunu: ${inviteLink}`;
    const sendInvite = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Xuunu Invite", text: message });
          return;
        } catch {
          // fall back to copy
        }
      }
      await copyToClipboard(message, "Invite link");
    };
    void sendInvite().finally(() => {
      toast({
        title: "Invite ready to share",
        description: `Share with ${invites.length} contact${invites.length === 1 ? "" : "s"}.`,
      });
      setInviteValue("");
      setShowInviteForm(false);
    });
  };

  const handleLoadContacts = async () => {
    if (!user?.uid) {
      toast({
        title: "Not signed in",
        description: "Sign in to load contacts.",
        variant: "destructive",
      });
      return;
    }
    if (isLoadingContacts) return;
    const contactApi = typeof navigator !== "undefined" ? (navigator as any).contacts : null;
    if (!contactApi?.select) {
      setContactsError("Contact access isn't supported on this device.");
      setContactsLoaded(true);
      toast({
        title: "Contacts not supported",
        description: "Use a mobile browser that supports contact access.",
      });
      return;
    }

    setIsLoadingContacts(true);
    setContactsError(null);
    try {
      const contacts = await contactApi.select(["name", "email"], { multiple: true });
      const emails = Array.from(
        new Set(
          contacts
            .flatMap((contact: { email?: string[] }) => contact.email || [])
            .map((email: string) => email.trim().toLowerCase())
            .filter(Boolean)
        )
      );
      if (emails.length === 0) {
        setContactsMatches([]);
        setContactsLoaded(true);
        return;
      }

      const batches: string[][] = [];
      for (let i = 0; i < emails.length; i += 10) {
        batches.push(emails.slice(i, i + 10));
      }

      const matches = new Map<string, PublicProfileMatch>();
      for (const batch of batches) {
        const profileQuery = query(
          collection(db, "publicProfiles"),
          where("emailLower", "in", batch)
        );
        const snapshot = await getDocs(profileQuery);
        snapshot.forEach((docSnap) => {
          if (docSnap.id === user.uid) return;
          const data = docSnap.data() as {
            displayName?: string;
            photoUrl?: string;
            photoDataUrl?: string;
          };
          matches.set(docSnap.id, {
            userId: docSnap.id,
            displayName: data.displayName || "Member",
            photoUrl: data.photoUrl || data.photoDataUrl,
          });
        });
      }

      setContactsMatches(Array.from(matches.values()));
      setContactsLoaded(true);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      setContactsError("Unable to load contacts. Please try again.");
      setContactsLoaded(true);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSendNetworkRequest = async (member: PublicProfileMatch) => {
    if (!user?.uid) {
      toast({
        title: "Not signed in",
        description: "Sign in to send friend requests.",
        variant: "destructive",
      });
      return;
    }
    if (sentRequests.has(member.userId)) {
      toast({
        title: "Request already sent",
        description: `You've already requested ${member.displayName}.`,
      });
      return;
    }
    try {
      await setDoc(
        doc(db, "friendRequests", `${user.uid}_${member.userId}`),
        {
          fromUserId: user.uid,
          toUserId: member.userId,
          fromName: displayName,
          fromPhotoUrl: photoUrl || "",
          createdAt: new Date().toISOString(),
          status: "pending",
        },
        { merge: true }
      );
      setSentRequests((prev) => {
        const next = new Set(prev);
        next.add(member.userId);
        return next;
      });
      toast({
        title: "Friend request sent",
        description: `Request sent to ${member.displayName}.`,
      });
    } catch (error) {
      console.error("Friend request failed:", error);
      toast({
        title: "Request failed",
        description: "Unable to send friend request right now.",
        variant: "destructive",
      });
    }
  };

  const scheduleBounds = getScheduleBounds();
  const scheduleNow = useMemo(() => Date.now(), [scheduleTick]);
  const longevityConfig = longevityChallenge ? getLongevityConfig(longevityChallenge.type) : null;
  const longevityRequiredDays = longevityConfig?.requiredDays ?? 7;
  const longevityLoggedDays = longevityChallenge?.logs.length ?? 0;
  const longevityStartedAtLabel = longevityChallenge
    ? formatOptionalDateOnly(longevityChallenge.startedAt, "")
    : "";
  const longevityTodayKey = getLocalDateKey(new Date());
  const longevityHasLoggedToday = longevityChallenge
    ? longevityChallenge.logs.some((log) => log.date === longevityTodayKey)
    : false;
  const longevityStartMs = longevityChallenge ? getDateMs(longevityChallenge.startedAt) : null;
  const longevityDaysSinceStart = longevityChallenge && longevityStartMs
    ? Math.floor((Date.now() - longevityStartMs) / (24 * 60 * 60 * 1000)) + 1
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
  const challengesLocked = false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canNotify()) return;
    const todayKey = getLocalDateKey(new Date());
    const dailyNotified = dailyNotifiedRef.current;
    let updated = false;

    scheduledChallenges.forEach((challenge) => {
      const scheduledTime = getDateMs(challenge.scheduledFor);
      if (!scheduledTime || scheduledTime <= Date.now()) {
        return;
      }
      const notifyKey = `scheduled-${challenge.id}`;
      if (dailyNotified[notifyKey] === todayKey) return;
      sendNotification(
        "Challenge reminder",
        `${challenge.type} challenge starts ${formatOptionalDate(
          challenge.scheduledFor,
          "soon"
        )}.`
      );
      dailyNotified[notifyKey] = todayKey;
      updated = true;
    });

    if (longevityChallenge && !longevityHasLoggedToday) {
      const notifyKey = `longevity-${longevityChallenge.id}`;
      if (dailyNotified[notifyKey] !== todayKey) {
        const title = longevityConfig?.title ?? "Longevity challenge";
        sendNotification(
          "Longevity challenge reminder",
          `Post today's activity for ${title}.`
        );
        dailyNotified[notifyKey] = todayKey;
        updated = true;
      }
    }

    if (updated) {
      dailyNotifiedRef.current = { ...dailyNotified };
    }
  }, [
    scheduledChallenges,
    longevityChallenge,
    longevityHasLoggedToday,
    longevityConfig?.title,
    scheduleTick,
  ]);

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
              <div className="flex flex-col items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full"
                        data-testid="button-update-profile-photo"
                      >
                        <ProfileAvatar
                          className={`h-20 w-20 ${
                            isPaidAccount ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
                          }`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black border-white/10 text-white text-xs">
                      Update image
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {(hasUserChallengePost || teamChallengeCount > 0) && (
                  <div className="inline-flex items-center gap-2 text-primary/80">
                    {hasUserChallengePost && (
                      <span className="inline-flex items-center" aria-label="Challenge active">
                        <Flag className="h-3 w-3" />
                      </span>
                    )}
                    {teamChallengeCount > 0 && (
                      <span
                        className="inline-flex items-center text-yellow-300"
                        aria-label="Team challenge completed"
                      >
                        <Medal className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {isProfileInvisible && (
                  <p className="text-xs text-white/50">Profile invisible</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUsernameDraft(displayName);
                    setProfileVisibilityDraft(isProfileInvisible);
                    setShowEditProfileDialog(true);
                  }}
                  className="mt-1 text-xs text-white/50 hover:text-white"
                  data-testid="button-edit-profile"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenPrimaryGroup}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/40 hover:text-white"
                data-testid="button-open-groups"
              >
                <Users className="h-4 w-4" />
                Groups
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isProfileInvisible) return;
                  const link = profileUrl || shareUrl;
                  if (!link) {
                    toast({
                      title: "Link unavailable",
                      description: "Please reload and try again.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (navigator.share && link) {
                    try {
                      await navigator.share({
                        title: "Xuunu Profile",
                        text: "Check out my Xuunu profile.",
                        url: link,
                      });
                      return;
                    } catch {
                      // fall back to share options
                    }
                  }
                  await copyToClipboard(link, "Profile link");
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition ${
                  isProfileInvisible
                    ? "border-white/10 text-white/30 cursor-not-allowed"
                    : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                }`}
                disabled={isProfileInvisible}
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

        </div>

      <Dialog
        open={showEditProfileDialog}
        onOpenChange={(open) => {
          setShowEditProfileDialog(open);
          if (!open) {
            setProfileVisibilityDraft(isProfileInvisible);
            setShowDeleteConfirm(false);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="bg-black border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit profile</DialogTitle>
            <DialogDescription className="text-white/60">
              Update your photo and name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-white/60">Tap to update your avatar.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-edit-profile-photo"
              >
                Change
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/60">Username</Label>
              <p className="text-xs text-white/50">Use your code to join a group.</p>
              <Input
                value={usernameDraft}
                onChange={(event) => setUsernameDraft(event.target.value)}
                className="h-10 bg-black/40 border-white/10 text-sm"
                data-testid="input-edit-username"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Manage Subscription</p>
                  <p className="text-xs text-white/60">
                    Status: {isPaidAccount ? "Active" : "Inactive"}
                  </p>
                  {featureFlags?.cardLast4 && (
                    <p className="text-xs text-white/50">
                      Card: {featureFlags.cardBrand ? `${featureFlags.cardBrand} ••••` : "••••"}{featureFlags.cardLast4}
                    </p>
                  )}
                  {featureFlags?.stripeStatus && (
                    <p className="text-xs text-white/50">
                      Subscription: {featureFlags.stripeStatus}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={!featureFlags?.hasCustomer}
                  data-testid="button-manage-subscription"
                >
                  Manage
                </Button>
              </div>
              {!featureFlags?.hasCustomer && (
                <p className="text-xs text-white/40">
                  No active subscription.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-white/70">Delete account</p>
                <p className="text-xs text-white/50">
                  This permanently removes your account and data. This cannot be undone.
                </p>
              </div>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="button-start-delete-account"
                >
                  Delete account
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-white/50">
                    Type DELETE to confirm account deletion.
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(event) => setDeleteConfirmText(event.target.value)}
                    className="h-10 bg-black/40 border-white/20 text-sm text-white/80"
                    data-testid="input-delete-confirm"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount || deleteConfirmText.trim() !== "DELETE"}
                      data-testid="button-confirm-delete-account"
                    >
                      {isDeletingAccount ? "Deleting..." : "Confirm delete"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditProfileDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfileSettings}
                disabled={isSavingName}
                data-testid="button-save-profile"
              >
                {isSavingName ? "Saving" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


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
                Post progress updates to your friends feed.
              </p>
            </div>
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
                className="hidden"
                onChange={handleAddUpdatePhotos}
                data-testid="input-update-photos"
              />
            </label>
            <span className="text-xs text-white/40">
              {updatePhotos.length}/1 photo
            </span>
            {groups.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shareToGroup}
                    onChange={(event) => setShareToGroup(event.target.checked)}
                  />
                  Share to group
                </label>
                {shareToGroup && (
                  <select
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/80"
                    data-testid="select-group-share"
                  >
                    <option value="">Select group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
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
          <div className="flex justify-end">
            <Button
              onClick={handleShareUpdate}
              disabled={
                isSharingUpdate ||
                (!updateText.trim() && updatePhotos.length === 0) ||
                (shareToGroup && !selectedGroupId)
              }
              data-testid="button-share-update"
            >
              {isSharingUpdate ? "Saving..." : "Save"}
            </Button>
          </div>
        </section>

      <section
        className={`rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 ${
          challengesLocked ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Challenges
            </h3>
            <p className="text-xs text-white/50">
              Join a challenge to track your time, steps, and pins.
            </p>
            {challengesLocked && (
              <p className="text-xs text-white/40 mt-1">
                Upgrade to unlock challenges.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (challengesLocked) {
                toast({
                  title: "Unlock challenges",
                  description: "Upgrade to a paid account to join challenges.",
                  variant: "destructive",
                });
                return;
              }
              setShowChallengePicker(true);
            }}
            data-testid="button-join-challenge"
            disabled={!user || challengesLocked}
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
                Start pin: {formatCoordDisplay(activeChallenge.startLocation.lat)},{" "}
                {formatCoordDisplay(activeChallenge.startLocation.lng)}
              </div>
            )}
            {activeChallenge.invitedFriends.length > 0 && (
              <div className="text-xs text-white/50">
                Invited: {activeChallenge.invitedFriends.join(", ")}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">
                {isStrengthTraining(activeChallenge.type) ? "Minutes recorded:" : "Steps recorded:"}{" "}
                {isStrengthTraining(activeChallenge.type)
                  ? getChallengeMinutes(elapsedSeconds).toLocaleString()
                  : (lastStepsRef.current ?? activeChallenge.stepsStart).toLocaleString()}
              </div>
              <Button
                variant="destructive"
                onClick={() => handleStopChallenge(false)}
                data-testid="button-stop-challenge"
                disabled={challengesLocked}
              >
                Stop Challenge
              </Button>
            </div>
            <p className="text-[11px] text-white/40">
              Auto-stops after 5 minutes with no{" "}
              {isStrengthTraining(activeChallenge.type) ? "activity" : "step"} updates.
            </p>
          </div>
        )}
        {scheduledChallenges.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Scheduled Challenges</p>
            {scheduledChallenges.map((challenge) => {
              const startTime = getDateMs(challenge.scheduledFor);
              const isReady = startTime !== null && scheduleNow >= startTime;
              return (
                <div
                  key={challenge.id}
                  className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{challenge.type} Challenge</p>
                      <p className="text-xs text-white/50">
                        Starts {formatOptionalDate(challenge.scheduledFor, "Scheduled")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isReady ? "default" : "outline"}
                      onClick={() => handleStartScheduledChallenge(challenge)}
                      disabled={!isReady || !!activeChallenge || challengesLocked}
                      data-testid={`button-start-scheduled-${challenge.id}`}
                    >
                      {isReady ? "Start Challenge" : "Scheduled"}
                    </Button>
                  </div>
                  {challenge.invitedFriends?.length > 0 && (
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
          if (challengesLocked) {
            setShowChallengePicker(false);
            return;
          }
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
                {(
                  [
                    "Hiking",
                    "Running",
                    "Biking",
                    "Swimming",
                    "Strength Training",
                    "Longevity Challenge",
                  ] as ChallengeType[]
                ).map((type) => {
                  const isSelected = selectedChallengeType === type;
                  const isLongevity = type === "Longevity Challenge";
                  return (
                    <Button
                      key={type}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        if (isLongevity) {
                          setShowChallengePicker(false);
                          resetChallengeDialog();
                          setShowLongevityDialog(true);
                          return;
                        }
                        setSelectedChallengeType(type);
                      }}
                      data-testid={`button-select-${type.toLowerCase().replace(/\s+/g, "-")}-challenge`}
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
                <div />
                <Switch
                  checked={scheduleChallenge}
                  onCheckedChange={setScheduleChallenge}
                  disabled={challengesLocked}
                />
              </div>
              {scheduleChallenge && (
                <div className="space-y-2">
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Pick a date</label>
                    <div className="rounded-lg border border-white/10 bg-black/40 p-2">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(date) =>
                          date < startOfDay(scheduleBounds.min) ||
                          date > endOfDay(scheduleBounds.max)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Pick a time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="bg-black/40 border-white/10 text-sm"
                      data-testid="input-schedule-challenge"
                    />
                    {scheduleDate && scheduleTime && buildScheduledDate(scheduleDate, scheduleTime) && (
                      <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
                        Starts in{" "}
                        {formatCountdown(buildScheduledDate(scheduleDate, scheduleTime) as Date)}
                      </div>
                    )}
                    <p className="text-[11px] text-white/40">
                      Earliest: {scheduleBounds.min.toLocaleString()} • Latest:{" "}
                      {scheduleBounds.max.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-white/80">Share scheduled challenge</p>
                      <p className="text-[11px] text-white/50">
                        {isProfileInvisible
                          ? "Profile is invisible. Sharing is disabled."
                          : "Posts the invite to your public profile."}
                      </p>
                    </div>
                    <Switch
                      checked={shareScheduledChallenge}
                      onCheckedChange={setShareScheduledChallenge}
                      disabled={isProfileInvisible}
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
                    disabled={!selectedChallengeType || challengesLocked}
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
                    disabled={!selectedChallengeType || challengesLocked}
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
                  {getChallengeMetricLabel(pendingChallenge.type)}:{" "}
                  {getChallengeMetricValue(
                    pendingChallenge.type,
                    pendingChallenge.durationSec,
                    pendingChallenge.stepsDelta
                  )}
                </div>
                {pendingChallenge.invitedFriends &&
                  pendingChallenge.invitedFriends.length > 0 && (
                    <div className="text-xs text-white/60">
                      Invited: {pendingChallenge.invitedFriends.join(", ")}
                    </div>
                  )}
                {pendingChallenge.autoStopped && (
                  <div className="text-xs text-yellow-300/80">
                    Auto-stopped after{" "}
                    {isStrengthTraining(pendingChallenge.type) ? "activity" : "steps"} stopped
                    updating.
                  </div>
                )}
                {pendingChallenge.startLocation && (
                  <div className="text-xs text-white/60">
                    Start pin: {formatCoordDisplay(pendingChallenge.startLocation.lat)},{" "}
                    {formatCoordDisplay(pendingChallenge.startLocation.lng)}
                  </div>
                )}
                {pendingChallenge.endLocation && (
                  <div className="text-xs text-white/60">
                    Stop pin: {formatCoordDisplay(pendingChallenge.endLocation.lat)},{" "}
                    {formatCoordDisplay(pendingChallenge.endLocation.lng)}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium">Share to public profile</p>
                  <p className="text-xs text-white/60">
                    {isProfileInvisible
                      ? "Profile is invisible. Sharing is disabled."
                      : "Adds this challenge to the leaderboard."}
                  </p>
                </div>
                <Switch
                  checked={shareChallenge}
                  onCheckedChange={setShareChallenge}
                  disabled={isProfileInvisible}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => handleFinalizeChallenge(shareChallenge, true)}>
                  Save Challenge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLongevityDialog} onOpenChange={setShowLongevityDialog}>
        <DialogContent className="bg-black border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Longevity Challenge</DialogTitle>
            <DialogDescription className="text-white/60">
              Pick a weekly habit and post daily photo proof.
            </DialogDescription>
          </DialogHeader>
          <div
            className={`rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 ${
              challengesLocked ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">
                  {challengesLocked
                    ? "Upgrade to unlock longevity challenges."
                    : "Complete daily posts to finish the week."}
                </p>
              </div>
              {longevityChallenge && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetLongevityChallenge}
                  disabled={challengesLocked}
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
                        <span className="text-xs text-white/50">
                          ({longevityConfig?.cadence})
                        </span>
                      </p>
                      <p className="text-xs text-white/50">
                        Started {longevityStartedAtLabel}
                      </p>
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
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              handleLogLongevityDay();
                            }
                          }}
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
                        </div>
                        {longevityPhotos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {longevityPhotos.map((photo, index) => (
                              <div
                                key={`${photo}-${index}`}
                                className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40"
                              >
                                <img
                                  src={photo}
                                  alt="Longevity upload"
                                  className="h-24 w-full object-cover"
                                />
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
                            disabled={longevityPhotos.length === 0 || challengesLocked}
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
                    This weekly challenge window is complete. Start a new longevity
                    challenge to continue.
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
                      disabled={challengesLocked}
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
                    disabled={!selectedLongevityType || challengesLocked}
                    data-testid="button-start-longevity"
                  >
                    Start Longevity Challenge
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          </div>
          {showNetworkMembers && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Find friends on Xuunu</p>
                  <p className="text-xs text-white/50">
                    Load your phone contacts to see who is already on Xuunu.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadContacts}
                  disabled={isLoadingContacts}
                  data-testid="button-load-contacts"
                >
                  {isLoadingContacts
                    ? "Loading..."
                    : contactsLoaded
                      ? "Refresh contacts"
                      : "Load contacts"}
                </Button>
              </div>
              {contactsError && (
                <p className="text-xs text-rose-200">{contactsError}</p>
              )}
              {contactsLoaded && !contactsError && contactsMatches.length === 0 && (
                <p className="text-xs text-white/50">No contacts on Xuunu yet.</p>
              )}
              <div className="grid gap-2">
                {contactsMatches.map((member) => {
                  const isRequested = sentRequests.has(member.userId);
                  return (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => handleSendNetworkRequest(member)}
                      disabled={isRequested}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        isRequested
                          ? "border-white/10 bg-white/5 text-white/40"
                          : "border-white/10 bg-black/30 text-white/80 hover:border-white/30 hover:text-white"
                      }`}
                      data-testid={`button-network-member-${member.userId}`}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                            {member.displayName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{member.displayName}</p>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-white/50">
                        {isRequested ? "Requested" : "Add"}
                      </span>
                    </button>
                  );
                })}
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
                      <p className="text-xs text-white/40">
                        {formatOptionalDate(item.postedAt, item.time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-white/40">
                      {item.source === "you" ? "You" : "Friend"}
                    </span>
                    {item.source === "you" && (
                      <div className="flex items-center gap-2 text-[11px] text-white/50">
                        {(item.challenge || item.challengeSchedule) && (
                          <button
                            type="button"
                            onClick={() => handleStartEditFeedTime(item)}
                            className="hover:text-white"
                            data-testid={`button-edit-time-${item.id}`}
                          >
                            Edit time
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFeedItem(item.id)}
                          className="text-rose-200 hover:text-rose-100"
                          data-testid={`button-delete-item-${item.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {editingFeedItemId === item.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={editingFeedTimestamp}
                      onChange={(event) => setEditingFeedTimestamp(event.target.value)}
                      className="h-9 bg-black/40 border-white/10 text-xs"
                      data-testid="input-edit-challenge-time"
                    />
                    <Button size="sm" onClick={handleSaveFeedTime}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEditFeedTime}>
                      Cancel
                    </Button>
                  </div>
                )}
                <p className="mt-3 text-sm text-white/80">{item.content}</p>
                {item.challengeSchedule && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{item.challengeSchedule.type} Challenge</span>
                    <span>
                      {formatOptionalDate(item.challengeSchedule.scheduledFor, "Scheduled")}
                    </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      Scheduled start (24 hours to 7 days in advance).
                    </p>
                    {item.challengeSchedule.invitedFriends?.length > 0 && (
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
                              Start {formatCoordDisplay(item.challenge.startLocation.lat)},{" "}
                              {formatCoordDisplay(item.challenge.startLocation.lng)}
                            </span>
                          )}
                          {item.challenge.endLocation && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-sky-300" />
                              Stop {formatCoordDisplay(item.challenge.endLocation.lat)},{" "}
                              {formatCoordDisplay(item.challenge.endLocation.lng)}
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

        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
          <DialogContent className="bg-black border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create a group</DialogTitle>
              <DialogDescription className="text-white/60">
                Invite-only groups keep updates private.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-white/60">Group name (max 20 chars)</Label>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value.slice(0, 20))}
                  className="bg-black/40 border-white/10"
                  data-testid="input-group-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/60">Invite friends</Label>
                <div className="grid gap-2">
                  {friends.map((friend) => (
                    <label key={friend.id} className="flex items-center gap-2 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={groupInvitedFriends.includes(friend.name)}
                        onChange={() => toggleGroupInviteFriend(friend.name)}
                      />
                      {friend.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup}
                  data-testid="button-create-group"
                >
                  {isCreatingGroup ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showGroupPicker} onOpenChange={setShowGroupPicker}>
          <DialogContent className="bg-black border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Select a group</DialogTitle>
              <DialogDescription className="text-white/60">
                Choose which group updates to view.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setShowGroupPicker(false);
                    void handleOpenGroupUpdates(group);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-left transition hover:border-white/30"
                  data-testid={`button-select-group-${group.id}`}
                >
                  <p className="text-sm font-semibold">{group.name}</p>
                  <p className="text-xs text-white/50">
                    {group.members.length} member{group.members.length === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setShowGroupPicker(false);
                  setShowGroupDialog(true);
                }}
                data-testid="button-create-group-from-picker"
              >
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showGroupUpdatesDialog} onOpenChange={setShowGroupUpdatesDialog}>
          <DialogContent className="bg-black border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>{activeGroupName || "Group updates"}</DialogTitle>
              <DialogDescription className="text-white/60">
                Updates shared exclusively with this group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {groupUpdates.length === 0 ? (
                <div className="text-xs text-white/50">No updates yet.</div>
              ) : (
                groupUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{update.authorName}</span>
                      <span>{formatOptionalDate(update.postedAt, update.time)}</span>
                    </div>
                    <p className="text-sm text-white/80">{update.content}</p>
                    {update.photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {update.photos.map((photo, index) => (
                          <img
                            key={`${update.id}-photo-${index}`}
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
                  <p className="text-xs text-white/50">{friend.email}</p>
                  <p className="text-[11px] text-white/40">
                    Group challenges: {friend.teamChallengeCount}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-white/60 hover:text-white"
                  onClick={() =>
                    onViewFriend?.(friend)
                  }
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
