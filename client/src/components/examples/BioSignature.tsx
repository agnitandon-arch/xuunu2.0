import BioSignature from "../BioSignature";

export default function BioSignatureExample() {
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
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Your 7-day Bio SYGnature</h1>
          <p className="text-sm opacity-60">
            A living visualization of your last 7 days
          </p>
        </div>
        <BioSignature healthData={healthData} size={400} />
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="opacity-60 mb-1">GLUCOSE</div>
            <div className="font-mono font-bold">{healthData.glucose} mg/dL</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="opacity-60 mb-1">ACTIVITY</div>
            <div className="font-mono font-bold">{healthData.activity} hrs</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="opacity-60 mb-1">RECOVERY</div>
            <div className="font-mono font-bold">{healthData.recovery}%</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="opacity-60 mb-1">STRAIN</div>
            <div className="font-mono font-bold">{healthData.strain}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
