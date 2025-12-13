import DeviceIntegrationItem from "../DeviceIntegrationItem";
import { Activity, Heart, Droplets } from "lucide-react";

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
      <DeviceIntegrationItem
        name="Continuous Glucose Monitor"
        icon={<Droplets className="w-6 h-6 text-primary" />}
        connected={true}
        lastSync="15 minutes ago"
        onClick={() => console.log("CGM clicked")}
      />
      <DeviceIntegrationItem
        name="Heart Rate Monitor"
        icon={<Heart className="w-6 h-6 opacity-40" />}
        connected={false}
        onClick={() => console.log("HRM clicked")}
      />
    </div>
  );
}
