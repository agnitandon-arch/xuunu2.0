import { useState } from "react";
import MinimalBottomNav from "../MinimalBottomNav";

export default function MinimalBottomNavExample() {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="flex-1 flex items-center justify-center text-white">
        <p className="opacity-60">Active tab: {activeTab}</p>
      </div>
      <MinimalBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
