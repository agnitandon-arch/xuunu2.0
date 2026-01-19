import type { ActivityOption } from "./SelectActivities";

interface CreateProfileProps {
  fullName: string;
  bio: string;
  avatarPreviewUrl: string;
  activities: ActivityOption[];
  selectedActivities: string[];
  onFullNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onAvatarChange: (file: File | null) => void;
  onToggleActivity: (activityId: string) => void;
}

export default function CreateProfile({
  fullName,
  bio,
  avatarPreviewUrl,
  activities,
  selectedActivities,
  onFullNameChange,
  onBioChange,
  onAvatarChange,
  onToggleActivity,
}: CreateProfileProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Create your profile</h2>
        <p className="text-sm text-white/70">
          Add a photo and details so your wins stand out.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-white/15 bg-white/5">
          {avatarPreviewUrl ? (
            <img
              src={avatarPreviewUrl}
              alt="Profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
              Upload
            </div>
          )}
        </div>
        <div>
          <label
            htmlFor="avatar-upload"
            className="inline-flex cursor-pointer items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Upload photo
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) =>
              onAvatarChange(event.target.files?.[0] ?? null)
            }
          />
          <p className="mt-2 text-xs text-white/50">PNG or JPG recommended.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            placeholder="Jordan Lee"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#0066ff] focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(event) => onBioChange(event.target.value)}
            placeholder="What are you training for?"
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#0066ff] focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">Favorite activities</p>
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => {
            const isSelected = selectedActivities.includes(activity.id);
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onToggleActivity(activity.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? "border-[#0066ff] bg-[#0066ff]/20 text-white"
                    : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
                }`}
                aria-pressed={isSelected}
              >
                {activity.emoji} {activity.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
