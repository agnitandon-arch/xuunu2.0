import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface AccountScreenProps {
  onLogout?: () => void;
}

export default function AccountScreen({ onLogout }: AccountScreenProps) {
  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-10 space-y-6 text-center">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-white/60">
          Account features now live in the Share My Progress tab.
        </p>
        <Button
          variant="destructive"
          onClick={onLogout}
          className="w-full h-13 rounded-full"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
        <p className="text-xs opacity-40">Xuunu v1.0.0</p>
      </div>
    </div>
  );
}
