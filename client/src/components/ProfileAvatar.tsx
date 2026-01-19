import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface ProfileAvatarProps {
  className?: string;
}

export default function ProfileAvatar({ className }: ProfileAvatarProps) {
  const { user } = useAuth();
  const { photoUrl } = useProfilePhoto();

  const avatarUrl = photoUrl || user?.photoURL || "";
  const fallbackInitial =
    user?.displayName?.charAt(0) || user?.email?.charAt(0) || "";

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile photo" /> : null}
      <AvatarFallback className="bg-white/10 text-xs text-white/70">
        {fallbackInitial ? fallbackInitial.toUpperCase() : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
