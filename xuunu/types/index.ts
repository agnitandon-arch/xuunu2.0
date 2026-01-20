export type Activity = {
  id: string;
  title: string;
  timestamp: string;
  summary?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
};

export type DashboardType = "performance" | "health" | "biosignature";
