import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Medication, MedicationLog } from "@shared/schema";

const REMINDER_SENT_KEY = "xuunu:medication-reminders-sent";
const REMINDER_ENABLED_KEY = "xuunu:medication-reminders-enabled";

type ReminderKey = `${string}:${string}:${string}:${string}`;

const loadSentKeys = () => {
  if (typeof window === "undefined") return new Set<ReminderKey>();
  const raw = window.localStorage.getItem(REMINDER_SENT_KEY);
  if (!raw) return new Set<ReminderKey>();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set<ReminderKey>(parsed as ReminderKey[]);
    }
  } catch {
    return new Set<ReminderKey>();
  }
  return new Set<ReminderKey>();
};

const persistSentKeys = (keys: Set<ReminderKey>) => {
  if (typeof window === "undefined") return;
  const values = Array.from(keys);
  window.localStorage.setItem(REMINDER_SENT_KEY, JSON.stringify(values));
};

const getStoredEnabled = () => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(REMINDER_ENABLED_KEY);
  if (raw === null) return true;
  return raw === "true";
};

const setStoredEnabled = (value: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMINDER_ENABLED_KEY, value ? "true" : "false");
  window.dispatchEvent(new Event("medication-reminders-change"));
};

const toDateKey = (date: Date) => date.toISOString().split("T")[0];

const buildReminderKey = (
  userId: string,
  medicationId: string,
  dateKey: string,
  time: string
): ReminderKey => `${userId}:${medicationId}:${dateKey}:${time}`;

const getNextOccurrence = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);
  if (scheduled.getTime() <= now.getTime()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  return scheduled;
};

export function useMedicationReminders(
  userId?: string,
  enabled: boolean = true
) {
  const { toast } = useToast();
  const scheduledRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sentRef = useRef<Set<ReminderKey>>(loadSentKeys());

  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: [`/api/medications?userId=${userId}`],
    enabled: !!userId && enabled,
  });

  const { data: logs = [] } = useQuery<MedicationLog[]>({
    queryKey: [`/api/medication-logs?userId=${userId}`],
    enabled: !!userId && enabled,
  });

  const takenLookup = useMemo(() => {
    const today = new Date().toDateString();
    const taken = new Set<string>();
    logs.forEach((log) => {
      const scheduled = log.scheduledTime || "";
      if (scheduled && new Date(log.takenAt).toDateString() === today) {
        taken.add(`${log.medicationId}:${scheduled}`);
      }
    });
    return taken;
  }, [logs]);

  useEffect(() => {
    scheduledRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    scheduledRef.current = [];

    if (!enabled || !userId || medications.length === 0) {
      return;
    }

    const todayKey = toDateKey(new Date());
    const sentKeys = sentRef.current;

    medications.forEach((medication) => {
      const scheduledTimes = (medication.scheduledTimes as string[]) || [];
      scheduledTimes.forEach((time) => {
        if (!time) return;
        if (takenLookup.has(`${medication.id}:${time}`)) return;

        const next = getNextOccurrence(time);
        if (!next) return;

        const dateKey = toDateKey(next);
        const reminderKey = buildReminderKey(
          userId,
          medication.id,
          dateKey,
          time
        );

        if (sentKeys.has(reminderKey)) {
          return;
        }

        const delayMs = next.getTime() - Date.now();
        if (delayMs <= 0) {
          return;
        }

        const timeoutId = setTimeout(() => {
          toast({
            title: "Medication Reminder",
            description: `${medication.name} · ${medication.dosage} at ${time}`,
          });
          sentKeys.add(reminderKey);
          persistSentKeys(sentKeys);
        }, delayMs);

        scheduledRef.current.push(timeoutId);
      });
    });

    // prune old keys
    const pruned = new Set(
      Array.from(sentKeys).filter((key) => {
        const [, , dateKey] = key.split(":");
        return dateKey >= todayKey;
      })
    );
    sentRef.current = pruned;
    persistSentKeys(pruned);
  }, [enabled, medications, takenLookup, toast, userId]);
}

export function useMedicationReminderPreference() {
  const [enabled, setEnabled] = useState(getStoredEnabled);

  useEffect(() => {
    const handleChange = () => setEnabled(getStoredEnabled());
    window.addEventListener("storage", handleChange);
    window.addEventListener("medication-reminders-change", handleChange);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener("medication-reminders-change", handleChange);
    };
  }, []);

  const update = (value: boolean) => {
    setEnabled(value);
    setStoredEnabled(value);
  };

  return [enabled, update] as const;
}
