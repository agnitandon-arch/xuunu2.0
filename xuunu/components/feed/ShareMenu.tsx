import Button from "@/components/ui/Button";

type ShareMenuProps = {
  onShare?: (channel: string) => void;
};

const channels = ["Copy link", "Message", "Email"];

export default function ShareMenu({ onShare }: ShareMenuProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((channel) => (
        <Button
          key={channel}
          variant="secondary"
          onClick={() => onShare?.(channel)}
        >
          {channel}
        </Button>
      ))}
    </div>
  );
}
