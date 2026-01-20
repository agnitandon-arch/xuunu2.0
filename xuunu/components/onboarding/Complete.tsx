import Button from "@/components/ui/Button";

type CompleteProps = {
  onFinish?: () => void;
};

export default function Complete({ onFinish }: CompleteProps) {
  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold">All set!</h2>
      <p className="text-sm text-muted">
        Your Xuunu workspace is ready to explore.
      </p>
      <Button onClick={onFinish}>Go to dashboard</Button>
    </section>
  );
}
