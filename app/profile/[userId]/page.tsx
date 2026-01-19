"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../../lib/firebase/config";
import { getBloodWorkHistory, getUserProfile } from "../../../lib/firebase/firestore";
import { calculateMetabolicScore } from "../../../lib/biosignature/calculate";
import type { BloodWorkData, UserProfile } from "../../../types";

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileUserId = typeof params?.userId === "string" ? params.userId : "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bloodWork, setBloodWork] = useState<BloodWorkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      if (!profileUserId) return;

      Promise.all([
        getUserProfile(profileUserId),
        getBloodWorkHistory(profileUserId),
      ])
        .then(([profileData, bloodData]) => {
          setProfile(profileData);
          setBloodWork(bloodData);
        })
        .finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, [profileUserId, router]);

  const metabolicScore = useMemo(
    () => calculateMetabolicScore(bloodWork),
    [bloodWork]
  );

  if (!profileUserId) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-sm text-white/60">Profile not found.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-sm text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-black/40">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName || "Profile avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                  No photo
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                {profile?.fullName || "Your Profile"}
              </h1>
              <p className="text-sm text-white/60">{profile?.bio || ""}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Metabolic Snapshot</h2>
              <p className="text-sm text-white/60">
                Latest blood work contribution to your biosignature.
              </p>
            </div>
            <div className="text-3xl font-semibold text-[#6fa5ff]">
              {metabolicScore}
            </div>
          </div>
        </section>

        {/* Blood Work Trends */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">🩸 Blood Work Trends</h3>
            <button
              type="button"
              onClick={() => router.push("/bloodwork")}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Add Bloodwork
            </button>
          </div>
          {bloodWork.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-black/40 rounded-lg">
                <div className="text-2xl font-bold text-[#6fa5ff]">
                  {bloodWork[0].biomarkers.hba1c ?? "--"}%
                </div>
                <div className="text-sm text-white/60">A1C</div>
              </div>
              <div className="text-center p-4 bg-black/40 rounded-lg">
                <div className="text-2xl font-bold text-[#6fa5ff]">
                  {bloodWork[0].biomarkers.ldlCholesterol ?? "--"}
                </div>
                <div className="text-sm text-white/60">LDL</div>
              </div>
              <div className="text-center p-4 bg-black/40 rounded-lg">
                <div className="text-2xl font-bold text-[#6fa5ff]">
                  {bloodWork[0].biomarkers.hdlCholesterol ?? "--"}
                </div>
                <div className="text-sm text-white/60">HDL</div>
              </div>
              <div className="text-center p-4 bg-black/40 rounded-lg">
                <div className="text-2xl font-bold text-[#6fa5ff]">
                  {bloodWork[0].biomarkers.triglycerides ?? "--"}
                </div>
                <div className="text-sm text-white/60">Triglycerides</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60 mb-4">No blood work data yet</p>
              <button
                type="button"
                onClick={() => router.push("/bloodwork")}
                className="rounded-full bg-[#0066ff] px-4 py-2 text-sm font-semibold text-white"
              >
                Import Blood Test
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
