import EnvironmentalSynergyRing from "../EnvironmentalSynergyRing";

export default function EnvironmentalSynergyRingExample() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="flex gap-8">
        <EnvironmentalSynergyRing synergyLevel={85} />
        <EnvironmentalSynergyRing synergyLevel={62} />
        <EnvironmentalSynergyRing synergyLevel={38} />
      </div>
    </div>
  );
}
