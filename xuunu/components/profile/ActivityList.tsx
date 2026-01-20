import type { Activity } from "@/types";

type ActivityListProps = {
  activities: Activity[];
};

export default function ActivityList({ activities }: ActivityListProps) {
  return (
    <ul className="space-y-3">
      {activities.map((activity) => (
        <li key={activity.id} className="card">
          <div className="text-sm text-muted">{activity.timestamp}</div>
          <div className="text-base font-semibold">{activity.title}</div>
        </li>
      ))}
    </ul>
  );
}
