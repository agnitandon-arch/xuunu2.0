import type { Activity } from "@/types";
import ActivityPost from "@/components/feed/ActivityPost";

type FeedListProps = {
  activities: Activity[];
};

export default function FeedList({ activities }: FeedListProps) {
  if (!activities.length) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityPost key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
