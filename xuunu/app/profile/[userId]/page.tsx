type ProfilePageProps = {
  params: {
    userId: string;
  };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <p className="mt-2 text-muted">User: {params.userId}</p>
    </main>
  );
}
