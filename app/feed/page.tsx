'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getActivities } from '@/lib/firebase/firestore';
import { ActivityPost } from '@/components/feed/ActivityPost';
import { CreateActivityModal } from '@/components/feed/CreateActivityModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Activity } from '@/types';

export default function FeedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      const { activities: fetchedActivities } = await getActivities(20);
      setActivities(fetchedActivities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivityCreated() {
    await loadActivities();
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 bg-card border-b border-border px-6 py-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Xuunu</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-muted hover:text-foreground"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push(`/profile/${user?.uid}`)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center font-bold"
            >
              {user?.email?.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Create Activity Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary w-full py-4 text-lg"
          >
            ➕ Log Activity
          </button>
        </div>

        {/* Activity Feed */}
        {activities.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🏃</div>
            <h3 className="text-xl font-semibold mb-2">No activities yet</h3>
            <p className="text-muted mb-6">
              Start tracking your workouts to see them here
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Log Your First Activity
            </button>
          </div>
        ) : (
          <div>
            {activities.map((activity) => (
              <ActivityPost key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onActivityCreated={handleActivityCreated}
      />
    </div>
  );
}
