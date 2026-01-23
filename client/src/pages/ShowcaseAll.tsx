import LoginScreen from "./LoginScreen";
import DashboardScreen from "./DashboardScreen";
import TrackEntryScreen from "./TrackEntryScreen";
import DataInsightsScreen from "./DataInsightsScreen";
import AccountScreen from "./AccountScreen";
import EnvironmentalScreen from "./EnvironmentalScreen";
import BioSignature from "@/components/BioSignature";
import EnvironmentalSynergyRing from "@/components/EnvironmentalSynergyRing";

export default function ShowcaseAll() {
  const healthData = {
    glucose: 125,
    activity: 8.2,
    recovery: 84,
    strain: 12.5,
    aqi: 65,
    heartRate: 72,
    sleep: 7.5,
  };

  return (
    <div className="bg-black">
      <div className="text-center py-8 border-b border-white/10">
        <h1 className="text-3xl font-bold mb-2">Xuunu - All Screens</h1>
        <p className="text-sm opacity-60">Minimalist Health Tracking Platform</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-12 px-8 border-b border-white/10">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-widest">Environmental Synergy</h2>
            <EnvironmentalSynergyRing synergyLevel={78} size={280} />
            <p className="mt-4 text-sm opacity-60 max-w-md mx-auto">
              Measures how well your health metrics align with environmental conditions.
              <br />Completion ring shows 0-100% synergy level.
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-widest">7-day Bio Signature</h2>
            <BioSignature healthData={healthData} size={280} />
            <p className="mt-4 text-sm opacity-60 max-w-md mx-auto">
              A unique, animated visualization that reflects your last 7 days.
              <br />Challenge completion nudges the pattern toward healthier symmetry.
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 p-8">
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Login Screen</h2>
          </div>
          <div className="h-[800px] overflow-hidden">
            <LoginScreen onLogin={() => {}} onSignUp={() => {}} />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Dashboard</h2>
          </div>
          <div className="h-[800px] overflow-hidden">
            <DashboardScreen onTrackClick={() => {}} />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Track Entry</h2>
          </div>
          <div className="h-[800px] overflow-hidden">
            <TrackEntryScreen onSave={() => {}} />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Environmental Tracking</h2>
          </div>
          <div className="h-[800px] overflow-hidden">
            <EnvironmentalScreen />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Data & Insights</h2>
          </div>
          <div className="h-[800px] overflow-hidden">
            <DataInsightsScreen />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Account Management</h2>
          </div>
          <div className="h-[800px] overflow-hidden">
            <AccountScreen onLogout={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}
