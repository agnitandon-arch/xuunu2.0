export interface ActivityOption {
  id: string;
  label: string;
  emoji: string;
}

interface SelectActivitiesProps {
  activities: ActivityOption[];
  selected: string[];
  onToggle: (activityId: string) => void;
}

export default function SelectActivities({
  activities,
  selected,
  onToggle,
}: SelectActivitiesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">
          Select your activities
        </h2>
        <p className="text-sm text-white/70">
          Pick at least one to personalize your experience.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {activities.map((activity) => {
          const isSelected = selected.includes(activity.id);
          return (
            <button
              key={activity.id}
              type="button"
              onClick={() => onToggle(activity.id)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition ${
                isSelected
                  ? "border-[#0066ff] bg-[#0066ff]/15"
                  : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
              aria-pressed={isSelected}
            >
              <span className="text-2xl">{activity.emoji}</span>
              <span className="text-sm font-medium text-white">
                {activity.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-white/50">
        Selected: {selected.length}{" "}
        {selected.length === 1 ? "activity" : "activities"}
      </p>
    </div>
  );
}
