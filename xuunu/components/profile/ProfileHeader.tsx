import type { UserProfile } from "@/types";

type ProfileHeaderProps = {
  profile: UserProfile;
};

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <header className="space-y-2">
      <h2 className="text-2xl font-semibold">{profile.name}</h2>
      {profile.bio ? <p className="text-sm text-muted">{profile.bio}</p> : null}
    </header>
  );
}
