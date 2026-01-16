import type { Activity } from "@/types";

type ActivityPostProps = {
  activity: Activity;
};

export default function ActivityPost({ activity }: ActivityPostProps) {
  return (
    <article className="card space-y-2">
      <h3 className="text-lg font-semibold">{activity.title}</h3>
      <p className="text-sm text-muted">{activity.timestamp}</p>
      {activity.summary ? <p className="text-sm">{activity.summary}</p> : null}
    </article>
  );
}
