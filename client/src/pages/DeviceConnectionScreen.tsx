import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Watch, Loader2, CheckCircle, AlertCircle, Droplets } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UserCredentials {
  id: string;
  userId: string;
  hasDevId: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
}

interface ConnectedDevice {
  id: string;
  userId: string;
  provider: string;
  status: string;
  lastSyncAt: string | null;
  connectedAt: string;
}

export default function DeviceConnectionScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [terraDevId, setTerraDevId] = useState("");
  const [terraApiKey, setTerraApiKey] = useState("");
  const [terraWebhookSecret, setTerraWebhookSecret] = useState("");
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);
  const [isAppleHealthConnecting, setIsAppleHealthConnecting] = useState(false);

  // Fetch existing credentials
  const { data: credentials, isLoading: credentialsLoading } = useQuery<UserCredentials | null>({
    queryKey: ['/api/user-credentials', { userId: user?.uid }],
    enabled: !!user?.uid,
    queryFn: async () => {
      const res = await fetch(`/api/user-credentials?userId=${user?.uid}`);
      if (!res.ok) throw new Error('Failed to fetch credentials');
      return await res.json();
    },
  });

  // Fetch connected devices
  const { data: devices = [], isLoading: devicesLoading } = useQuery<ConnectedDevice[]>({
    queryKey: ['/api/connected-devices', { userId: user?.uid }],
    enabled: !!user?.uid,
    queryFn: async () => {
      const res = await fetch(`/api/connected-devices?userId=${user?.uid}`);
      if (!res.ok) throw new Error('Failed to fetch devices');
      return await res.json();
    },
  });

  useEffect(() => {
    if (!user?.uid) {
      setAppleHealthConnected(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        const data = snapshot.data() ?? {};
        setAppleHealthConnected(!!data.appleHealthConnected);
      },
      () => setAppleHealthConnected(false)
    );
    return unsubscribe;
  }, [user?.uid]);

  const handleConnectAppleHealth = async () => {
    if (isAppleHealthConnecting) return;
    const isIos =
      typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent);
    if (!isIos) {
      toast({
        title: "Apple Health requires iPhone",
        description: "Open this page on your iOS device to connect.",
        variant: "destructive",
      });
      return;
    }
    setIsAppleHealthConnecting(true);
    try {
      if (typeof window !== "undefined") {
        window.location.href = "x-apple-health://";
      }
      if (user?.uid) {
        await setDoc(
          doc(db, "users", user.uid),
          { appleHealthConnected: true },
          { merge: true }
        );
      }
      setAppleHealthConnected(true);
      toast({
        title: "Apple Health connected",
        description: "Allow access in the Health app if prompted.",
      });
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error?.message || "Unable to connect Apple Health right now.",
        variant: "destructive",
      });
    } finally {
      setIsAppleHealthConnecting(false);
    }
  };

  // Save credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/user-credentials", {
        userId: user.uid,
        terraDevId,
        terraApiKey,
        terraWebhookSecret,
      });
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-credentials'] });
      toast({
        title: "Credentials Saved",
        description: "Your Terra API credentials have been saved securely.",
      });
      setTerraDevId("");
      setTerraApiKey("");
      setTerraWebhookSecret("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save credentials",
        variant: "destructive",
      });
    },
  });

  const connectTerraLabsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/terra/auth", { userId: user.uid, mode: "labs" });
      return await response.json();
    },
    onSuccess: (data: { url: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/connected-devices'] });
      window.open(data.url, "_blank");
      toast({
        title: "Connect Bloodwork",
        description: "Complete the lab connection in the new window.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate lab connection URL",
        variant: "destructive",
      });
    },
  });

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!terraDevId || !terraApiKey) {
      toast({
        title: "Missing Information",
        description: "Please provide at least Dev ID and API Key",
        variant: "destructive",
      });
      return;
    }

    saveCredentialsMutation.mutate();
  };

  const hasCredentials = credentials?.hasDevId && credentials?.hasApiKey;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Device Connections</h1>
          <p className="text-sm opacity-60">
            iOS always pulls Apple Health data. Use Terra for all other devices and labs.
          </p>
        </div>

        {/* Terra API Credentials */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Terra API Credentials</CardTitle>
            <CardDescription>
              Add your Terra API credentials to connect other devices and labs.{" "}
              <a 
                href="https://tryterra.co" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-terra-signup"
              >
                Sign up at tryterra.co
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {credentialsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : hasCredentials ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span>Credentials configured</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTerraDevId("");
                    setTerraApiKey("");
                    setTerraWebhookSecret("");
                  }}
                  data-testid="button-update-credentials"
                >
                  Update Credentials
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="devId">Developer ID</Label>
                  <Input
                    id="devId"
                    type="text"
                    placeholder="your-dev-id"
                    value={terraDevId}
                    onChange={(e) => setTerraDevId(e.target.value)}
                    data-testid="input-terra-dev-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="your-api-key"
                    value={terraApiKey}
                    onChange={(e) => setTerraApiKey(e.target.value)}
                    data-testid="input-terra-api-key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    placeholder="your-webhook-secret"
                    value={terraWebhookSecret}
                    onChange={(e) => setTerraWebhookSecret(e.target.value)}
                    data-testid="input-terra-webhook-secret"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={saveCredentialsMutation.isPending}
                  data-testid="button-save-credentials"
                >
                  {saveCredentialsMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Credentials
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Connect Devices */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Connect Devices</CardTitle>
            <CardDescription>
              Apple Health syncs directly from your phone on iOS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Watch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Apple Health</h3>
                  <p className="text-xs opacity-60">
                    Tap to open Apple Health and grant access.
                  </p>
                </div>
              </div>
              {appleHealthConnected ? (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectAppleHealth}
                  disabled={isAppleHealthConnecting}
                  data-testid="button-connect-apple-health"
                >
                  {isAppleHealthConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>

            {!hasCredentials ? (
              <div className="flex items-start gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Terra credentials required</p>
                  <p className="opacity-80 mt-1">
                    Add Terra API credentials above to connect other devices and labs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Bloodwork & Labs</h3>
                    <p className="text-xs opacity-60">
                      Quest, Labcorp, Everlywell, LetsGetChecked.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => connectTerraLabsMutation.mutate()}
                  disabled={connectTerraLabsMutation.isPending}
                  variant="outline"
                  data-testid="button-connect-terra-labs"
                >
                  {connectTerraLabsMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Connect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Devices List */}
        {devices.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Connected Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    data-testid={`device-${device.provider}`}
                  >
                    <div>
                      <p className="font-medium">{device.provider.replace("_", " ")}</p>
                      <p className="text-xs opacity-60">
                        Connected {new Date(device.connectedAt).toLocaleDateString()}
                      </p>
                      {device.lastSyncAt && (
                        <p className="text-xs opacity-60">
                          Last sync: {new Date(device.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      device.status === "connected" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    }`}>
                      {device.status}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
