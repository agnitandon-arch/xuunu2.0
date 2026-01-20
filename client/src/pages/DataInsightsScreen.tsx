import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Share2,
  Camera,
  Users,
  UserPlus,
  Heart,
  Plus,
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

type ShareTarget = {
  id: "tiktok" | "facebook" | "x" | "instagram" | "whatsapp";
  label: string;
  requiresCopy?: boolean;
  buildUrl: (url: string, text: string) => string;
};

const FEED_STORAGE_KEY = "xuunu-feed-items";

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

  const handleRemoveUpdatePhoto = (index: number) => {
    setUpdatePhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const buildDefaultFeedItems = (avatar: string) => [
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

  const [feedItems, setFeedItems] = useState(() => {
    if (typeof window === "undefined") {
      return buildDefaultFeedItems(photoUrl || "");
    }
    const stored = window.localStorage.getItem(FEED_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ReturnType<typeof buildDefaultFeedItems>;
      } catch {
        return buildDefaultFeedItems(photoUrl || "");
      }
    }
    return buildDefaultFeedItems(photoUrl || "");
  });

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
      // Ignore storage failures (e.g., quota exceeded).
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
    toast({
      title: "Update shared",
      description: "Your latest progress is now visible in the feed.",
    });
  };

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
                onClick={() => {
                  if (onPreviewPublicProfile) {
                    onPreviewPublicProfile();
                    return;
                  }
                  window.open(profileUrl || "/app/profile/sample", "_blank");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/40 hover:text-white"
                data-testid="button-preview-public-profile"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview public profile
              </button>
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
                onClick={() => setShowProfileShare((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share profile
              </button>
            </div>
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
