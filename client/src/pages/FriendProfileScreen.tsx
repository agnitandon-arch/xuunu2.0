import { ArrowLeft, Flag, Image } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type FriendProfile = {
  id: string;
  name: string;
  status: string;
  avatarUrl?: string;
  sharedDashboards: Record<string, boolean>;
  hasChallengeInvite?: boolean;
};

interface FriendProfileScreenProps {
  friend: FriendProfile | null;
  onBack: () => void;
}

export default function FriendProfileScreen({ friend, onBack }: FriendProfileScreenProps) {
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
          <div className="flex flex-col items-center gap-1">
            <Avatar className="h-14 w-14">
              {friend?.avatarUrl ? <AvatarImage src={friend.avatarUrl} alt={friend.name} /> : null}
              <AvatarFallback className="bg-white/10 text-sm text-white/70">
                {friend?.name?.charAt(0) || "F"}
              </AvatarFallback>
            </Avatar>
            {friend?.hasChallengeInvite && (
              <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary/80">
                <Flag className="h-3 w-3" />
                Challenge
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{friend?.name || "Friend Profile"}</h1>
            <p className="text-xs text-white/50">{friend?.status || "Public dashboards"}</p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
                Photos & Updates
              </h2>
              <p className="text-xs text-white/50">
                Friends can only see photos and updates you share.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60 flex items-start gap-3">
            <Image className="h-4 w-4 text-white/40" />
            <span>
              No shared updates yet. When they post photos or updates, they will show up here.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
