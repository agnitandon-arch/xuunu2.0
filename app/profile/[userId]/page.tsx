"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBiosignature, getUserActivities, getUserProfile } from "@/lib/firebase/firestore";
import type { Activity, Biosignature, UserProfile } from "@/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [biosignature, setBiosignature] = useState<Biosignature | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const userProfile = await getUserProfile(userId);
        const userActivities = await getUserActivities(userId);

        // Get current week's biosignature
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const weekStart = startOfWeek.toISOString().split("T")[0];

        const currentBiosig = await getBiosignature(userId, weekStart);

        setProfile(userProfile);
        setActivities(userActivities);
        setBiosignature(currentBiosig);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
          <button onClick={() => router.push("/feed")} className="btn-primary">
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/feed")} className="text-muted hover:text-foreground">
            &lt;- Back
          </button>
          <h1 className="font-semibold">Profile</h1>
          <button className="btn-primary text-sm">Edit Profile</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-3xl font-bold text-white">
              {profile.fullName.charAt(0) || profile.id.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{profile.fullName || "User"}</h2>
              <p className="text-muted mb-3">{profile.bio || "No bio yet"}</p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-primary">{profile.stats.totalActivities}</span> activities
                </div>
                <div>
                  <span className="font-semibold text-primary">{profile.stats.followers}</span> followers
                </div>
                <div>
                  <span className="font-semibold text-primary">{profile.stats.following}</span> following
                </div>
                <div>
                  <span className="font-semibold text-primary">{profile.stats.currentStreak}</span> day streak
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard Link */}
        <div className="card mb-6 bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">View Your Analytics</h3>
              <p className="text-muted">Explore detailed insights with Google Looker Studio dashboards</p>
            </div>
            <button onClick={() => router.push("/dashboard")} className="btn-primary">
              Open Dashboards -&gt;
            </button>
          </div>
        </div>

        {/* Biosignature */}
        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4">Your Biosignature</h3>
          {biosignature ? (
            <div>
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="text-6xl font-bold text-primary mb-2">{biosignature.score}</div>
                  <div className="text-muted">Overall Score</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{biosignature.metrics.energy}</div>
                  <div className="text-sm text-muted">Energy</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{biosignature.metrics.recovery}</div>
                  <div className="text-sm text-muted">Recovery</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{biosignature.metrics.sleepQuality}</div>
                  <div className="text-sm text-muted">Sleep</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <div className="text-2xl font-bold text-primary">{biosignature.metrics.readiness}</div>
                  <div className="text-sm text-muted">Readiness</div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Insights</h4>
                <ul className="space-y-2 text-sm text-muted">
                  {biosignature.insights.map((insight, index) => (
                    <li key={index}>- {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted mb-4">
                Your personalized biosignature will be calculated after 7 days of health data.
              </p>
              <div className="h-40 bg-card border border-border rounded-lg flex items-center justify-center">
                <p className="text-muted">Collecting data...</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Recent Activities</h3>
          {activities.length === 0 ? (
            <p className="text-muted text-center py-8">No activities yet</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{activity.title}</h4>
                    <span className="text-sm text-muted">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-2">{activity.description}</p>
                  <div className="flex gap-4 text-sm">
                    <span>{activity.durationMinutes} min</span>
                    {activity.distanceMiles && <span>{activity.distanceMiles.toFixed(2)} mi</span>}
                    {activity.calories && <span>{activity.calories} cal</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
