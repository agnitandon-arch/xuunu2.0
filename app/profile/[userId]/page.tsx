'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProfile, getUserActivities } from '@/lib/firebase/firestore';
import type { UserProfile, Activity } from '@/types';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const userProfile = await getUserProfile(userId);
      const userActivities = await getUserActivities(userId);

      setProfile(userProfile);
      setActivities(userActivities);
      setLoading(false);
    }

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Profile not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-muted hover:text-foreground"
          >
            ← Back
          </button>
          <h1 className="font-semibold">Profile</h1>
          <button className="btn-primary">Edit Profile</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="card mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-3xl font-bold">
              {profile.fullName.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">
                {profile.fullName}
              </h2>
              <p className="text-muted mb-3">{profile.bio}</p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-primary">
                    {profile.stats.totalActivities}
                  </span>{' '}
                  activities
                </div>
                <div>
                  <span className="font-semibold text-primary">
                    {profile.stats.followers}
                  </span>{' '}
                  followers
                </div>
                <div>
                  <span className="font-semibold text-primary">
                    {profile.stats.following}
                  </span>{' '}
                  following
                </div>
                <div>
                  <span className="font-semibold text-primary">
                    {profile.stats.currentStreak}
                  </span>{' '}
                  day streak
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6 bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                📊 View Your Analytics
              </h3>
              <p className="text-muted">
                Explore detailed insights with Google Looker Studio dashboards
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary"
            >
              Open Dashboards →
            </button>
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4">
            🧬 Your Biosignature
          </h3>
          <p className="text-muted mb-4">
            Your personalized performance pattern will be calculated after 7
            days of data.
          </p>
          <div className="h-40 bg-card border border-border rounded-lg flex items-center justify-center">
            <p className="text-muted">Collecting data...</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Recent Activities</h3>
          {activities.length === 0 ? (
            <p className="text-muted text-center py-8">No activities yet</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-b border-border pb-4 last:border-0"
                >
                  <h4 className="font-semibold mb-1">{activity.title}</h4>
                  <p className="text-sm text-muted">
                    {activity.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
