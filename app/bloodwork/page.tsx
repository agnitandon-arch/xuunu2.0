"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../lib/firebase/config";
import { getBloodWorkHistory, saveBloodWork } from "../../lib/firebase/firestore";
import { calculateMetabolicScore } from "../../lib/biosignature/calculate";
import { isTerraLabsEnabled } from "../../lib/featureFlags";
import type { BloodWorkData } from "../../types";

const biomarkerFields = [
  { key: "hba1c", label: "HbA1c", unit: "%" },
  { key: "glucoseFasting", label: "Fasting Glucose", unit: "mg/dL" },
  { key: "ldlCholesterol", label: "LDL Cholesterol", unit: "mg/dL" },
  { key: "hdlCholesterol", label: "HDL Cholesterol", unit: "mg/dL" },
  { key: "totalCholesterol", label: "Total Cholesterol", unit: "mg/dL" },
  { key: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
  { key: "vitaminD", label: "Vitamin D", unit: "ng/mL" },
  { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
  { key: "bun", label: "BUN", unit: "mg/dL" },
  { key: "thyroidTSH", label: "TSH", unit: "mIU/L" },
  { key: "crp", label: "CRP", unit: "mg/L" },
] as const;

type BiomarkerFieldKey = (typeof biomarkerFields)[number]["key"];

export default function BloodWorkPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bloodWork, setBloodWork] = useState<BloodWorkData[]>([]);
  const [testDate, setTestDate] = useState("");
  const [provider, setProvider] = useState<BloodWorkData["provider"]>("manual");
  const [biomarkerValues, setBiomarkerValues] = useState<
    Record<BiomarkerFieldKey, string>
  >(() =>
    biomarkerFields.reduce((acc, field) => {
      acc[field.key] = "";
      return acc;
    }, {} as Record<BiomarkerFieldKey, string>)
  );
  const [customMarkers, setCustomMarkers] = useState<
    Array<{ name: string; value: string }>
  >([{ name: "", value: "" }]);

  const labsEnabled = isTerraLabsEnabled();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      setUserId(user.uid);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    setLoading(true);
    getBloodWorkHistory(userId)
      .then((data) => {
        if (isMounted) {
          setBloodWork(data);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const metabolicScore = useMemo(
    () => calculateMetabolicScore(bloodWork),
    [bloodWork]
  );

  const handleBiomarkerChange = (key: BiomarkerFieldKey, value: string) => {
    setBiomarkerValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCustomMarkerChange = (
    index: number,
    field: "name" | "value",
    value: string
  ) => {
    setCustomMarkers((prev) =>
      prev.map((marker, idx) =>
        idx === index ? { ...marker, [field]: value } : marker
      )
    );
  };

  const addCustomMarker = () => {
    setCustomMarkers((prev) => [...prev, { name: "", value: "" }]);
  };

  const parseNumber = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!testDate) {
      alert("Please choose a test date.");
      return;
    }

    const biomarkers: BloodWorkData["biomarkers"] = {};
    biomarkerFields.forEach((field) => {
      const parsed = parseNumber(biomarkerValues[field.key]);
      if (parsed !== undefined) {
        biomarkers[field.key] = parsed;
      }
    });

    customMarkers.forEach((marker) => {
      const name = marker.name.trim();
      const parsed = parseNumber(marker.value);
      if (name && parsed !== undefined) {
        biomarkers[name] = parsed;
      }
    });

    if (Object.keys(biomarkers).length === 0) {
      alert("Please enter at least one biomarker value.");
      return;
    }

    setSaving(true);
    try {
      await saveBloodWork(userId, testDate, {
        provider,
        biomarkers,
        rawData: { source: "manual", markers: customMarkers },
      });

      const updated = await getBloodWorkHistory(userId);
      setBloodWork(updated);
      setTestDate("");
      setProvider("manual");
      setBiomarkerValues(
        biomarkerFields.reduce((acc, field) => {
          acc[field.key] = "";
          return acc;
        }, {} as Record<BiomarkerFieldKey, string>)
      );
      setCustomMarkers([{ name: "", value: "" }]);
    } finally {
      setSaving(false);
    }
  };

  const trends = useMemo(() => {
    const trendKeys = [
      { key: "hba1c", label: "A1C", unit: "%" },
      { key: "ldlCholesterol", label: "LDL", unit: "mg/dL" },
      { key: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
      { key: "vitaminD", label: "Vitamin D", unit: "ng/mL" },
    ] as const;

    return trendKeys.map((trend) => {
      const values = bloodWork
        .map((entry) => ({
          date: entry.testDate,
          value: entry.biomarkers?.[trend.key],
        }))
        .filter((item) => typeof item.value === "number")
        .slice(0, 5);
      return { ...trend, values };
    });
  }, [bloodWork]);

  if (!labsEnabled) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold">Blood Work</h1>
          <p className="mt-3 text-sm text-white/60">
            Terra Labs integration is currently disabled. Enable the feature flag
            to manage lab results here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Blood Work</h1>
          <p className="text-sm text-white/60">
            Track lab results from Quest, LabCorp, Everlywell, or manual uploads.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Metabolic Score</h2>
              <p className="text-sm text-white/60">
                Scores from bloodwork feed directly into your biosignature.
              </p>
            </div>
            <div className="text-3xl font-semibold text-[#6fa5ff]">
              {metabolicScore}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Manual Upload</h2>
            <p className="text-sm text-white/60">
              Enter values from your latest blood test report.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs text-white/60">
                Test Date
                <input
                  type="date"
                  value={testDate}
                  onChange={(event) => setTestDate(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                />
              </label>

              <label className="flex flex-col gap-2 text-xs text-white/60">
                Provider
                <select
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as BloodWorkData["provider"])
                  }
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="quest">Quest</option>
                  <option value="labcorp">LabCorp</option>
                  <option value="everlywell">Everlywell</option>
                  <option value="letsgetchecked">LetsGetChecked</option>
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {biomarkerFields.map((field) => (
                <label
                  key={field.key}
                  className="flex flex-col gap-2 text-xs text-white/60"
                >
                  {field.label} ({field.unit})
                  <input
                    type="number"
                    inputMode="decimal"
                    value={biomarkerValues[field.key]}
                    onChange={(event) =>
                      handleBiomarkerChange(field.key, event.target.value)
                    }
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Custom Biomarkers</h3>
                <button
                  type="button"
                  onClick={addCustomMarker}
                  className="text-xs font-semibold text-[#6fa5ff]"
                >
                  + Add another
                </button>
              </div>
              <div className="space-y-3">
                {customMarkers.map((marker, index) => (
                  <div key={`marker-${index}`} className="grid gap-3 sm:grid-cols-2">
                    <input
                      placeholder="Marker name"
                      value={marker.name}
                      onChange={(event) =>
                        handleCustomMarkerChange(index, "name", event.target.value)
                      }
                      className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Value"
                      value={marker.value}
                      onChange={(event) =>
                        handleCustomMarkerChange(index, "value", event.target.value)
                      }
                      className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full rounded-full bg-[#0066ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a75ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Blood Work"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Trends</h2>
            <p className="text-sm text-white/60">
              Recent values across key biomarkers.
            </p>
            <div className="mt-4 space-y-4">
              {trends.map((trend) => (
                <div
                  key={trend.key}
                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{trend.label}</span>
                    <span className="text-xs text-white/50">{trend.unit}</span>
                  </div>
                  {trend.values.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                      {trend.values.map((value) => (
                        <span
                          key={`${trend.key}-${value.date}`}
                          className="rounded-full border border-white/10 px-3 py-1"
                        >
                          {value.date}: {value.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-white/40">
                      No data yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Blood Tests</h2>
            <span className="text-xs text-white/50">
              {loading ? "Loading..." : `${bloodWork.length} records`}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/10" />
          ) : bloodWork.length === 0 ? (
            <div className="mt-6 text-sm text-white/50">
              No blood work data yet. Add your first lab results above.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {bloodWork.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.testDate}
                      </p>
                      <p className="text-xs text-white/50 capitalize">
                        {entry.provider} • {Object.keys(entry.biomarkers || {}).length} markers
                      </p>
                    </div>
                    <span className="text-xs text-white/40">
                      {entry.createdAt?.toString?.() || ""}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                    {Object.entries(entry.biomarkers || {}).slice(0, 5).map(
                      ([key, value]) => (
                        <span
                          key={`${entry.id}-${key}`}
                          className="rounded-full border border-white/10 px-3 py-1"
                        >
                          {key}: {value}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
