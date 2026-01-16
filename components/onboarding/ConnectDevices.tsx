export interface DeviceOption {
  name: string;
  emoji: string;
  description: string;
}

interface ConnectDevicesProps {
  devices: DeviceOption[];
  isWidgetLoading: boolean;
  onOpenWidget: () => void;
  onSkip: () => void;
}

export default function ConnectDevices({
  devices,
  isWidgetLoading,
  onOpenWidget,
  onSkip,
}: ConnectDevicesProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Connect devices</h2>
        <p className="text-sm text-white/70">
          Sync your wearables and health apps to unlock your full biosignature.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {devices.map((device) => (
          <div
            key={device.name}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{device.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {device.name}
                </p>
                <p className="text-xs text-white/60">{device.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onOpenWidget}
          className="w-full rounded-full bg-[#0066ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a75ff] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isWidgetLoading}
        >
          {isWidgetLoading ? "Opening Terra widget..." : "Connect with Terra"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Skip - I'll connect later
        </button>
      </div>
    </div>
  );
}
