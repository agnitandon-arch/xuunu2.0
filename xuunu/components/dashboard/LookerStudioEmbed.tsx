type LookerStudioEmbedProps = {
  src: string;
  title?: string;
};

export default function LookerStudioEmbed({
  src,
  title = "Looker Studio dashboard",
}: LookerStudioEmbedProps) {
  return (
    <div className="card">
      <iframe
        title={title}
        src={src}
        className="h-[600px] w-full rounded-xl border border-border"
        allowFullScreen
      />
    </div>
  );
}
