type ActivityPageProps = {
  params: {
    activityId: string;
  };
};

export default function ActivityPage({ params }: ActivityPageProps) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">Activity</h1>
      <p className="mt-2 text-muted">Activity ID: {params.activityId}</p>
    </main>
  );
}
