import { Capacitor, registerPlugin } from "@capacitor/core";

type HealthkitPlugin = {
  isAvailable: () => Promise<{ value?: boolean; available?: boolean }>;
  requestAuthorization: (options: { all?: string[]; read?: string[]; write?: string[] }) => Promise<void>;
};

const CapacitorHealthkit = registerPlugin<HealthkitPlugin>("CapacitorHealthkit");

export const isNativeIos = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const connectAppleHealth = async () => {
  if (!isNativeIos()) {
    return { ok: false, reason: "not_ios" } as const;
  }
  try {
    const availability = await CapacitorHealthkit.isAvailable();
    const available =
      typeof availability?.value === "boolean"
        ? availability.value
        : availability?.available !== false;
    if (!available) {
      return { ok: false, reason: "unavailable" } as const;
    }
    await CapacitorHealthkit.requestAuthorization({
      read: ["steps", "distance", "duration", "calories", "activity"],
      write: [],
    });
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, reason: "failed", error } as const;
  }
};
