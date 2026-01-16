'use client';

interface LookerStudioEmbedProps {
  dashboardUrl: string;
  title: string;
  height?: string;
}

export function LookerStudioEmbed({
  dashboardUrl,
  title,
  height = '800px',
}: LookerStudioEmbedProps) {
  if (!dashboardUrl) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">Dashboard Not Configured</h3>
        <p className="text-muted">
          This dashboard will be available once you have enough data.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <iframe
        src={dashboardUrl}
        style={{
          width: '100%',
          height,
          border: 'none',
          backgroundColor: '#000000',
        }}
        title={title}
        allowFullScreen
      />
    </div>
  );
}
