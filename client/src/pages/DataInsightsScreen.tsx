import VoiceRecorder from "@/components/VoiceRecorder";
import VoiceNotesList from "@/components/VoiceNotesList";

export default function DataInsightsScreen() {
  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Data</h1>
          <p className="text-sm opacity-60">Insights and voice notes</p>
        </div>

        <VoiceRecorder />
        
        <VoiceNotesList />

        <div className="flex gap-2">
          {["7D", "30D", "90D", "1Y"].map((range) => (
            <button
              key={range}
              className="px-4 py-2 rounded-full text-sm bg-white/5 border border-white/10 hover-elevate active-elevate-2"
              data-testid={`button-range-${range}`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">GLUCOSE TREND</div>
          <div className="h-48 flex items-end justify-between gap-2">
            {[120, 135, 125, 145, 130, 125, 115].map((value, index) => {
              const height = (value / 200) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/30 rounded-t"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs opacity-40">{["M", "T", "W", "T", "F", "S", "S"][index]}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <div className="text-2xl font-mono font-bold">127</div>
            <div className="text-xs opacity-60">Average this week</div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">CORRELATIONS</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">High AQI Days</div>
                <div className="text-xs opacity-60 mt-1">Environmental impact</div>
              </div>
              <div className="text-right">
                <div className="text-primary text-lg font-mono">+18</div>
                <div className="text-xs opacity-60">mg/dL higher</div>
              </div>
            </div>
            <div className="h-px bg-white/10"></div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Active Days</div>
                <div className="text-xs opacity-60 mt-1">Activity correlation</div>
              </div>
              <div className="text-right">
                <div className="text-primary text-lg font-mono">-12</div>
                <div className="text-xs opacity-60">mg/dL lower</div>
              </div>
            </div>
          </div>
        </div>

        <button 
          className="w-full p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
          data-testid="button-export-data"
        >
          <div className="text-sm font-medium">Export Data</div>
          <div className="text-xs opacity-60 mt-1">Download your health data as CSV</div>
        </button>
      </div>
    </div>
  );
}
