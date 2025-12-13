import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, Wind } from "lucide-react";

type DeviceType = 'awair' | 'iqair' | 'purpleair' | 'airthings' | 'netatmo';

interface DeviceFormData {
  awairApiKey?: string;
  awairDeviceId?: string;
  iqairApiKey?: string;
  purpleairApiKey?: string;
  purpleairSensorId?: string;
  airthingsClientId?: string;
  airthingsClientSecret?: string;
  netatmoClientId?: string;
  netatmoClientSecret?: string;
  netatmoRefreshToken?: string;
}

export default function IndoorAirQualityCredentials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeDevice, setActiveDevice] = useState<DeviceType>('awair');
  const [formData, setFormData] = useState<DeviceFormData>({});

  // Query to check existing credentials
  const { data: existingCreds, isLoading } = useQuery({
    queryKey: ['/api/user-credentials', user?.uid],
    queryFn: async () => {
      const response = await fetch(`/api/user-credentials?userId=${user?.uid}`);
      if (!response.ok) throw new Error('Failed to fetch credentials');
      return response.json();
    },
    enabled: !!user,
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: DeviceFormData) => {
      const response = await apiRequest("POST", "/api/user-credentials", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-credentials'] });
      toast({
        title: "Credentials Saved",
        description: "Your air quality device credentials have been securely stored.",
      });
      setFormData({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (device: DeviceType) => {
    if (!user?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save credentials",
        variant: "destructive",
      });
      return;
    }

    const deviceData: any = {
      userId: user.uid,
    };
    
    if (device === 'awair') {
      if (!formData.awairApiKey) {
        toast({
          title: "Missing Information",
          description: "Please provide your Awair API key",
          variant: "destructive",
        });
        return;
      }
      deviceData.awairApiKey = formData.awairApiKey;
      deviceData.awairDeviceId = formData.awairDeviceId;
    } else if (device === 'iqair') {
      if (!formData.iqairApiKey) {
        toast({
          title: "Missing Information",
          description: "Please provide your IQAir API key",
          variant: "destructive",
        });
        return;
      }
      deviceData.iqairApiKey = formData.iqairApiKey;
    } else if (device === 'purpleair') {
      if (!formData.purpleairApiKey) {
        toast({
          title: "Missing Information",
          description: "Please provide your PurpleAir API key",
          variant: "destructive",
        });
        return;
      }
      deviceData.purpleairApiKey = formData.purpleairApiKey;
      deviceData.purpleairSensorId = formData.purpleairSensorId;
    } else if (device === 'airthings') {
      if (!formData.airthingsClientId || !formData.airthingsClientSecret) {
        toast({
          title: "Missing Information",
          description: "Please provide both Client ID and Client Secret",
          variant: "destructive",
        });
        return;
      }
      deviceData.airthingsClientId = formData.airthingsClientId;
      deviceData.airthingsClientSecret = formData.airthingsClientSecret;
    } else if (device === 'netatmo') {
      if (!formData.netatmoClientId || !formData.netatmoClientSecret) {
        toast({
          title: "Missing Information",
          description: "Please provide Client ID and Client Secret",
          variant: "destructive",
        });
        return;
      }
      deviceData.netatmoClientId = formData.netatmoClientId;
      deviceData.netatmoClientSecret = formData.netatmoClientSecret;
      deviceData.netatmoRefreshToken = formData.netatmoRefreshToken;
    }

    updateCredentialsMutation.mutate(deviceData);
  };

  const hasCredentials = (device: DeviceType): boolean => {
    if (!existingCreds) return false;
    const creds = existingCreds as any;
    switch (device) {
      case 'awair':
        return !!creds.awairApiKey;
      case 'iqair':
        return !!creds.iqairApiKey;
      case 'purpleair':
        return !!creds.purpleairApiKey;
      case 'airthings':
        return !!creds.airthingsClientId;
      case 'netatmo':
        return !!creds.netatmoClientId;
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-black border-white/10">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Wind className="w-6 h-6 text-primary" />
          <div>
            <CardTitle className="text-white">Indoor Air Quality Monitors</CardTitle>
            <CardDescription className="text-white/60">
              Connect your home air quality monitoring devices
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeDevice} onValueChange={(v) => setActiveDevice(v as DeviceType)}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="awair" className="relative" data-testid="tab-awair">
              Awair
              {hasCredentials('awair') && (
                <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="iqair" className="relative" data-testid="tab-iqair">
              IQAir
              {hasCredentials('iqair') && (
                <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="purpleair" className="relative" data-testid="tab-purpleair">
              PurpleAir
              {hasCredentials('purpleair') && (
                <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="airthings" className="relative" data-testid="tab-airthings">
              Airthings
              {hasCredentials('airthings') && (
                <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="netatmo" className="relative" data-testid="tab-netatmo">
              Netatmo
              {hasCredentials('netatmo') && (
                <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-primary" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Awair */}
          <TabsContent value="awair" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">API Key *</Label>
                <Input
                  type="password"
                  placeholder="Your Awair API key"
                  value={formData.awairApiKey || ''}
                  onChange={(e) => setFormData({ ...formData, awairApiKey: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-awair-api-key"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Device ID (Optional)</Label>
                <Input
                  placeholder="Your Awair device ID"
                  value={formData.awairDeviceId || ''}
                  onChange={(e) => setFormData({ ...formData, awairDeviceId: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-awair-device-id"
                />
              </div>
              <p className="text-xs opacity-40">
                Get your API key from{" "}
                <a href="https://developer.getawair.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  developer.getawair.com
                </a>
              </p>
            </div>
            <Button
              onClick={() => handleSubmit('awair')}
              disabled={updateCredentialsMutation.isPending}
              className="w-full"
              data-testid="button-save-awair"
            >
              {updateCredentialsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                hasCredentials('awair') ? 'Update Credentials' : 'Save Credentials'
              )}
            </Button>
          </TabsContent>

          {/* IQAir */}
          <TabsContent value="iqair" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">API Key *</Label>
                <Input
                  type="password"
                  placeholder="Your IQAir API key"
                  value={formData.iqairApiKey || ''}
                  onChange={(e) => setFormData({ ...formData, iqairApiKey: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-iqair-api-key"
                />
              </div>
              <p className="text-xs opacity-40">
                Get your API key from{" "}
                <a href="https://www.iqair.com/dashboard/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  iqair.com/dashboard/api
                </a>
              </p>
            </div>
            <Button
              onClick={() => handleSubmit('iqair')}
              disabled={updateCredentialsMutation.isPending}
              className="w-full"
              data-testid="button-save-iqair"
            >
              {updateCredentialsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                hasCredentials('iqair') ? 'Update Credentials' : 'Save Credentials'
              )}
            </Button>
          </TabsContent>

          {/* PurpleAir */}
          <TabsContent value="purpleair" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">API Key *</Label>
                <Input
                  type="password"
                  placeholder="Your PurpleAir API key"
                  value={formData.purpleairApiKey || ''}
                  onChange={(e) => setFormData({ ...formData, purpleairApiKey: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-purpleair-api-key"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Sensor ID (Optional)</Label>
                <Input
                  placeholder="Your PurpleAir sensor ID"
                  value={formData.purpleairSensorId || ''}
                  onChange={(e) => setFormData({ ...formData, purpleairSensorId: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-purpleair-sensor-id"
                />
              </div>
              <p className="text-xs opacity-40">
                Get your API key from{" "}
                <a href="https://develop.purpleair.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  develop.purpleair.com
                </a>
              </p>
            </div>
            <Button
              onClick={() => handleSubmit('purpleair')}
              disabled={updateCredentialsMutation.isPending}
              className="w-full"
              data-testid="button-save-purpleair"
            >
              {updateCredentialsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                hasCredentials('purpleair') ? 'Update Credentials' : 'Save Credentials'
              )}
            </Button>
          </TabsContent>

          {/* Airthings */}
          <TabsContent value="airthings" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Client ID *</Label>
                <Input
                  placeholder="Your Airthings Client ID"
                  value={formData.airthingsClientId || ''}
                  onChange={(e) => setFormData({ ...formData, airthingsClientId: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-airthings-client-id"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Client Secret *</Label>
                <Input
                  type="password"
                  placeholder="Your Airthings Client Secret"
                  value={formData.airthingsClientSecret || ''}
                  onChange={(e) => setFormData({ ...formData, airthingsClientSecret: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-airthings-client-secret"
                />
              </div>
              <p className="text-xs opacity-40">
                Get your credentials from{" "}
                <a href="https://dashboard.airthings.com/integrations/api-integration" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Airthings Dashboard
                </a>
              </p>
            </div>
            <Button
              onClick={() => handleSubmit('airthings')}
              disabled={updateCredentialsMutation.isPending}
              className="w-full"
              data-testid="button-save-airthings"
            >
              {updateCredentialsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                hasCredentials('airthings') ? 'Update Credentials' : 'Save Credentials'
              )}
            </Button>
          </TabsContent>

          {/* Netatmo */}
          <TabsContent value="netatmo" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Client ID *</Label>
                <Input
                  placeholder="Your Netatmo Client ID"
                  value={formData.netatmoClientId || ''}
                  onChange={(e) => setFormData({ ...formData, netatmoClientId: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-netatmo-client-id"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Client Secret *</Label>
                <Input
                  type="password"
                  placeholder="Your Netatmo Client Secret"
                  value={formData.netatmoClientSecret || ''}
                  onChange={(e) => setFormData({ ...formData, netatmoClientSecret: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-netatmo-client-secret"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest opacity-60">Refresh Token (Optional)</Label>
                <Input
                  type="password"
                  placeholder="Your Netatmo Refresh Token"
                  value={formData.netatmoRefreshToken || ''}
                  onChange={(e) => setFormData({ ...formData, netatmoRefreshToken: e.target.value })}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  data-testid="input-netatmo-refresh-token"
                />
              </div>
              <p className="text-xs opacity-40">
                Get your credentials from{" "}
                <a href="https://dev.netatmo.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Netatmo Developer Portal
                </a>
              </p>
            </div>
            <Button
              onClick={() => handleSubmit('netatmo')}
              disabled={updateCredentialsMutation.isPending}
              className="w-full"
              data-testid="button-save-netatmo"
            >
              {updateCredentialsMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                hasCredentials('netatmo') ? 'Update Credentials' : 'Save Credentials'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
