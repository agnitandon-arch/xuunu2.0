import Button from "@/components/ui/Button";

type WelcomeProps = {
  onNext?: () => void;
};

export default function Welcome({ onNext }: WelcomeProps) {
  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold">Welcome to Xuunu</h2>
      <p className="text-sm text-muted">
        We will guide you through a quick setup.
      </p>
      <Button onClick={onNext}>Get started</Button>
    </section>
  );
}
