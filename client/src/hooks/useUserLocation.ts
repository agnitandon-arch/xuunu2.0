import { useState, useEffect } from "react";

interface LocationData {
  lat: number;
  lng: number;
  cityName: string;
  isLoading: boolean;
  error: string | null;
}

export function useUserLocation(autoFetch = true): LocationData & { refetch: () => void } {
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [cityName, setCityName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);

        try {
          const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            setCityName(data.formatted || "Unknown Location");
          }
        } catch (err) {
          console.error("Error fetching city name:", err);
          setCityName("Unknown Location");
        }

        setIsLoading(false);
      },
      (err) => {
        setError(`Unable to get location: ${err.message}`);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch]);

  return {
    lat,
    lng,
    cityName,
    isLoading,
    error,
    refetch: fetchLocation,
  };
}
