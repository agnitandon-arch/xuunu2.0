import { Button } from "@/components/ui/button";
import { LogOut, ImagePlus, Trash2, Users, MessageSquare, Camera } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ProfileAvatar from "@/components/ProfileAvatar";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import { Switch } from "@/components/ui/switch";

import type { FriendProfile } from "@/pages/FriendProfileScreen";

interface AccountScreenProps {
  onLogout?: () => void;
  onViewFriend?: (friend: FriendProfile) => void;
}

export default function AccountScreen({ onLogout, onViewFriend }: AccountScreenProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { photoUrl, setPhotoUrl } = useProfilePhoto();
  const [updateText, setUpdateText] = useState("");
  const [updatePhotos, setUpdatePhotos] = useState<string[]>([]);
  const [shareUpdate, setShareUpdate] = useState(true);

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

  const [feedItems, setFeedItems] = useState(() => [
    {
      id: "feed-1",
      authorName: "Ava Martinez",
      authorAvatar: "https://i.pravatar.cc/120?img=16",
      time: "2h ago",
      content: "Shared a recovery win after consistent sleep + breathwork.",
      photos: ["https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80"],
      shared: true,
      source: "friend" as const,
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
    },
    {
      id: "feed-3",
      authorName: "You",
      authorAvatar: photoUrl || "",
      time: "Yesterday",
      content: "Started sharing my progress publicly this week.",
      photos: [],
      shared: true,
      source: "you" as const,
    },
  ]);

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

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
        toast({
          title: "Profile photo updated",
          description: "Your photo will appear across all tabs.",
        });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    toast({
      title: "Profile photo removed",
      description: "You can upload a new photo anytime.",
    });
  };

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

    const nextUrls: string[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith("image/")) continue;
      nextUrls.push(URL.createObjectURL(file));
    }

    if (nextUrls.length === 0) {
      toast({
        title: "Unsupported files",
        description: "Please choose image files only.",
        variant: "destructive",
      });
      return;
    }

    setUpdatePhotos((prev) => [...prev, ...nextUrls]);
    event.target.value = "";
  };

  const handleRemoveUpdatePhoto = (index: number) => {
    setUpdatePhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed);
      }
      return next;
    });
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

  const publicFeedItems = useMemo(
    () => feedItems.filter((item) => item.shared),
    [feedItems]
  );

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto m-6 p-8 bg-black border border-white/10 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <ProfileAvatar className="h-16 w-16" />
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest opacity-60">Profile Photo</div>
            <div className="text-sm opacity-60" data-testid="text-user-email">
              {authUser?.email || ""}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-profile-photo"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                {photoUrl ? "Change photo" : "Upload photo"}
              </Button>
              {photoUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemovePhoto}
                  data-testid="button-remove-profile-photo"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
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

      </div>

      <div className="max-w-lg mx-auto px-6 mt-6 space-y-6">
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
              <Switch
                checked={shareUpdate}
                onCheckedChange={setShareUpdate}
              />
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
          <Button
            type="button"
            onClick={handleShareUpdate}
            className="w-full"
            data-testid="button-share-update"
          >
            Share update
          </Button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Friends Feed
              </h3>
              <p className="text-xs text-white/50">Latest shared updates from friends.</p>
            </div>
            <MessageSquare className="h-4 w-4 text-white/40" />
          </div>
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
            <Users className="h-4 w-4 text-white/40" />
          </div>
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

        <Button
          variant="destructive"
          onClick={onLogout}
          className="w-full h-13 rounded-full"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>

        <div className="text-center pt-4">
          <p className="text-xs opacity-40">Xuunu v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
