interface LookerStudioEmbedProps {
  dashboardUrl: string;
  title: string;
  height?: string;
}

export function LookerStudioEmbed({
  dashboardUrl,
  title,
  height = "800px",
}: LookerStudioEmbedProps) {
  if (!dashboardUrl) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 py-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">
          Dashboard Not Configured
        </h3>
        <p className="text-sm text-muted-foreground">
          This dashboard will be available once you have enough data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <iframe
        src={dashboardUrl}
        style={{
          width: "100%",
          height,
          border: "none",
          backgroundColor: "#000000",
        }}
        title={title}
        allowFullScreen
      />
    </div>
  );
}
