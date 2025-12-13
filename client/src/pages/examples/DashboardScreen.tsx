import DashboardScreen from "../DashboardScreen";

export default function DashboardScreenExample() {
  return (
    <div className="h-screen flex flex-col bg-black">
      <DashboardScreen onTrackClick={() => console.log("Track clicked")} />
    </div>
  );
}
