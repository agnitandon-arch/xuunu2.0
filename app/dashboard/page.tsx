'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { LookerStudioEmbed } from '@/components/dashboard/LookerStudioEmbed';
import { DashboardSelector } from '@/components/dashboard/DashboardSelector';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentDashboard, setCurrentDashboard] = useState('performance');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/signin');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-muted">Loading dashboards...</p>
        </div>
      </div>
    );
  }

  const dashboardUrls: Record<string, { url: string; title: string }> = {
    performance: {
      url: process.env.NEXT_PUBLIC_LOOKER_PERFORMANCE_DASHBOARD_URL || '',
      title: 'Performance Metrics Dashboard',
    },
    health: {
      url: process.env.NEXT_PUBLIC_LOOKER_HEALTH_DASHBOARD_URL || '',
      title: 'Health Trends Dashboard',
    },
    recovery: {
      url: process.env.NEXT_PUBLIC_LOOKER_RECOVERY_DASHBOARD_URL || '',
      title: 'Sleep & Recovery Dashboard',
    },
    energy: {
      url: process.env.NEXT_PUBLIC_LOOKER_ENERGY_DASHBOARD_URL || '',
      title: 'Energy & Nutrition Dashboard',
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-card border-b border-border px-6 py-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-sm text-muted">
              Powered by Google Looker Studio
            </p>
          </div>
          <button
            onClick={() => router.push('/feed')}
            className="text-muted hover:text-foreground"
          >
            ← Back to Feed
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <DashboardSelector
          currentDashboard={currentDashboard}
          onSelectDashboard={setCurrentDashboard}
        />

        <LookerStudioEmbed
          dashboardUrl={dashboardUrls[currentDashboard].url}
          title={dashboardUrls[currentDashboard].title}
          height="900px"
        />

        <div className="mt-8 card">
          <h3 className="text-lg font-semibold mb-4">
            📊 How to Set Up Your Dashboards
          </h3>
          <div className="space-y-3 text-sm text-muted">
            <p>
              <strong>1.</strong> Go to{' '}
              <a
                href="https://lookerstudio.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Looker Studio
              </a>
            </p>
            <p>
              <strong>2.</strong> Create a new report and connect to your
              Firestore database
            </p>
            <p>
              <strong>3.</strong> Use the following collections:
              <ul className="ml-6 mt-2 space-y-1 list-disc">
                <li>
                  <code>activities</code> - Your workout data
                </li>
                <li>
                  <code>healthData</code> - Sleep, HRV, glucose, weight, etc.
                </li>
                <li>
                  <code>biosignatures</code> - Your weekly biosignature scores
                </li>
              </ul>
            </p>
            <p>
              <strong>4.</strong> Publish your dashboard and copy the embed URL
            </p>
            <p>
              <strong>5.</strong> Add URLs to your environment variables in
              Vercel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
