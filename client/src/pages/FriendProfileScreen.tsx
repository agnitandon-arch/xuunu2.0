import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type FriendProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  teamChallengeCount: number;
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
          <Avatar className="h-14 w-14">
            {friend?.avatarUrl ? <AvatarImage src={friend.avatarUrl} alt={friend.name} /> : null}
            <AvatarFallback className="bg-white/10 text-sm text-white/70">
              {friend?.name?.charAt(0) || "F"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{friend?.name || "Friend Profile"}</h1>
            <p className="text-xs text-white/50">{friend?.email || "Email unavailable"}</p>
            <p className="text-xs text-white/60">
              Group challenges completed: {friend?.teamChallengeCount ?? 0}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
