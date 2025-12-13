import { Check, X } from "lucide-react";

interface DeviceIntegrationItemProps {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  lastSync?: string;
  onClick: () => void;
}

export default function DeviceIntegrationItem({ 
  name, 
  icon, 
  connected, 
  lastSync,
  onClick 
}: DeviceIntegrationItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
      data-testid={`button-device-${name.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="font-medium">{name}</div>
        {lastSync && (
          <div className="text-xs opacity-40 mt-1">Last sync: {lastSync}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <Check className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary">Connected</span>
          </>
        ) : (
          <>
            <X className="w-4 h-4 opacity-40" />
            <span className="text-xs opacity-40">Not connected</span>
          </>
        )}
      </div>
    </button>
  );
}
