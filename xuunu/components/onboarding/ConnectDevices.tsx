import Button from "@/components/ui/Button";

type ConnectDevicesProps = {
  onNext?: () => void;
};

export default function ConnectDevices({ onNext }: ConnectDevicesProps) {
  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold">Connect devices</h2>
      <p className="text-sm text-muted">
        Sync wearables and health services with Terra.
      </p>
      <Button onClick={onNext}>Connect</Button>
    </section>
  );
}
