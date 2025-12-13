import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Watch, Loader2, CheckCircle, AlertCircle, Activity } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserCredentials {
  id: string;
  userId: string;
  hasDevId: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  hasFitbitCredentials?: boolean;
  fitbitConnected?: boolean;
  fitbitUserId?: string | null;
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
  
  const [fitbitClientId, setFitbitClientId] = useState("");
  const [fitbitClientSecret, setFitbitClientSecret] = useState("");
  const [showFitbitForm, setShowFitbitForm] = useState(false);

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

  // Connect Apple Watch mutation
  const connectAppleWatchMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/terra/auth", { userId: user.uid });
      return await response.json();
    },
    onSuccess: (data: { url: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/connected-devices'] });
      window.open(data.url, "_blank");
      toast({
        title: "Connect Apple Watch",
        description: "Please complete the connection in the new window.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate connection URL",
        variant: "destructive",
      });
    },
  });

  // Save Fitbit credentials mutation
  const saveFitbitCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/fitbit/credentials", {
        userId: user.uid,
        clientId: fitbitClientId,
        clientSecret: fitbitClientSecret,
      });
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-credentials'] });
      toast({
        title: "Fitbit Credentials Saved",
        description: "Your Fitbit API credentials have been saved. You can now connect your Fitbit device.",
      });
      setFitbitClientId("");
      setFitbitClientSecret("");
      setShowFitbitForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Fitbit credentials",
        variant: "destructive",
      });
    },
  });

  // Connect Fitbit mutation
  const connectFitbitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const response = await fetch(`/api/fitbit/auth-url?userId=${user.uid}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get auth URL");
      }
      return await response.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      window.open(data.authUrl, "_blank");
      toast({
        title: "Connect Fitbit",
        description: "Please complete the connection in the new window.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate Fitbit connection URL",
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

  const handleSaveFitbitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fitbitClientId || !fitbitClientSecret) {
      toast({
        title: "Missing Information",
        description: "Please provide both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }

    saveFitbitCredentialsMutation.mutate();
  };

  const hasCredentials = credentials?.hasDevId && credentials?.hasApiKey;
  const hasFitbitCredentials = credentials?.hasFitbitCredentials;
  const isFitbitConnected = credentials?.fitbitConnected || devices.some(d => d.provider === "fitbit");
  const isAppleWatchConnected = devices.some(d => d.provider === "APPLE_HEALTH");

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Device Connections</h1>
          <p className="text-sm opacity-60">
            Connect your Apple Watch and other health devices
          </p>
        </div>

        {/* Terra API Credentials */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Terra API Credentials</CardTitle>
            <CardDescription>
              Add your Terra API credentials to connect health devices.{" "}
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
              Link your health devices to start tracking data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasCredentials ? (
              <div className="flex items-start gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Credentials Required</p>
                  <p className="opacity-80 mt-1">
                    Please add your Terra API credentials above before connecting devices.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Watch className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Apple Watch</h3>
                      <p className="text-xs opacity-60">
                        {isAppleWatchConnected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => connectAppleWatchMutation.mutate()}
                    disabled={connectAppleWatchMutation.isPending || isAppleWatchConnected}
                    variant={isAppleWatchConnected ? "outline" : "default"}
                    data-testid="button-connect-apple-watch"
                  >
                    {connectAppleWatchMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {isAppleWatchConnected ? "Connected" : "Connect"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fitbit Integration */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Fitbit Integration
            </CardTitle>
            <CardDescription>
              Connect your Fitbit device to sync activity, heart rate, and sleep data.{" "}
              <a 
                href="https://dev.fitbit.com/apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Register your app at dev.fitbit.com
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {credentialsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : isFitbitConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span>Fitbit connected{credentials?.fitbitUserId ? ` (User: ${credentials.fitbitUserId})` : ''}</span>
                </div>
                <p className="text-xs opacity-60">
                  Your Fitbit data will sync automatically. Activity, heart rate, sleep, and weight data are available.
                </p>
              </div>
            ) : hasFitbitCredentials ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span>Credentials configured</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Fitbit</h3>
                      <p className="text-xs opacity-60">Click to authorize</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => connectFitbitMutation.mutate()}
                    disabled={connectFitbitMutation.isPending}
                    data-testid="button-connect-fitbit"
                  >
                    {connectFitbitMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Connect
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFitbitForm(true)}
                >
                  Update Credentials
                </Button>
              </div>
            ) : showFitbitForm || !hasFitbitCredentials ? (
              <form onSubmit={handleSaveFitbitCredentials} className="space-y-4">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                  <p className="font-medium mb-2">How to get Fitbit API credentials:</p>
                  <ol className="list-decimal list-inside space-y-1 opacity-80">
                    <li>Go to <a href="https://dev.fitbit.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">dev.fitbit.com/apps</a></li>
                    <li>Click "Register a new app"</li>
                    <li>Set OAuth 2.0 Application Type to "Server"</li>
                    <li>Set Callback URL to your app's callback URL</li>
                    <li>Copy the Client ID and Client Secret</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fitbitClientId">Client ID</Label>
                  <Input
                    id="fitbitClientId"
                    type="text"
                    placeholder="Your Fitbit Client ID"
                    value={fitbitClientId}
                    onChange={(e) => setFitbitClientId(e.target.value)}
                    data-testid="input-fitbit-client-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fitbitClientSecret">Client Secret</Label>
                  <Input
                    id="fitbitClientSecret"
                    type="password"
                    placeholder="Your Fitbit Client Secret"
                    value={fitbitClientSecret}
                    onChange={(e) => setFitbitClientSecret(e.target.value)}
                    data-testid="input-fitbit-client-secret"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={saveFitbitCredentialsMutation.isPending}
                    data-testid="button-save-fitbit-credentials"
                  >
                    {saveFitbitCredentialsMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Credentials
                  </Button>
                  {showFitbitForm && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowFitbitForm(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            ) : null}
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
