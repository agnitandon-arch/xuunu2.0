import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { useState } from "react";

interface AccountScreenProps {
  onLogout?: () => void;
}

export default function AccountScreen({ onLogout }: AccountScreenProps) {
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const [resetEmail, setResetEmail] = useState(user?.email || "");
  const [isResetting, setIsResetting] = useState(false);

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: "Email required",
        description: "Enter your email to reset your password.",
        variant: "destructive",
      });
      return;
    }
    setIsResetting(true);
    try {
      await resetPassword(resetEmail);
      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Unable to send reset email.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-10 space-y-6 text-center">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-white/60">
          Account features now live in the Share My Progress tab.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Reset Password
            </h2>
            <p className="text-xs text-white/50">
              Use "forgot password" to update your password.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-xs uppercase tracking-widest text-white/60">
              Email
            </Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              className="h-12 bg-black border-white/20"
              data-testid="input-reset-email"
            />
          </div>
          <Button
            onClick={handlePasswordReset}
            disabled={isResetting || !resetEmail}
            className="w-full h-12 rounded-full"
            data-testid="button-reset-password"
          >
            {isResetting ? "Sending..." : "Send reset email"}
          </Button>
        </div>
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
