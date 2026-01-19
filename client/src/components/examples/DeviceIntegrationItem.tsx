import DeviceIntegrationItem from "../DeviceIntegrationItem";
import { Activity } from "lucide-react";

export default function DeviceIntegrationItemExample() {
  return (
    <div className="min-h-screen bg-black p-6 space-y-3">
      <DeviceIntegrationItem
        name="Epic Health Records"
        icon={<Activity className="w-6 h-6 text-primary" />}
        connected={true}
        lastSync="2 hours ago"
        onClick={() => console.log("Epic clicked")}
      />
    </div>
  );
}
