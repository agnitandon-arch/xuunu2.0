# Environmental API Integration Guide

This document explains how to integrate real environmental data APIs into Xuunu for all 7 environmental health categories.

## Current Status

The app currently uses **mock data** for environmental readings. Two endpoints are available:
- `/api/environmental` - Legacy air quality data
- `/api/environmental/comprehensive` - All 7 categories (Air, Noise, Water, Soil, Light, Thermal, Radioactive)

Both endpoints in `server/routes.ts` generate random but realistic values for demonstration purposes.

## 7 Environmental Health Categories

1. **Air Quality**: AQI, PM2.5, PM10, SO₂, NO₂, NOx, CO, O₃, VOCs
2. **Noise Pollution**: Current level, peak, average (dB)
3. **Water Quality**: Quality index, pH, turbidity, chlorine, lead, bacteria
4. **Soil Quality**: Moisture, pH, contaminants, heavy metals
5. **Light Pollution**: Pollution index, UV index, illuminance (lux), blue light
6. **Thermal Conditions**: Temperature, feels-like, humidity, heat index, pressure
7. **Radioactive Exposure**: Radon, gamma radiation, cosmic rays

## Recommended API Providers

### 1. OpenWeatherMap Air Pollution API (Recommended)
- **Website**: https://openweathermap.org/api/air-pollution
- **Cost**: Free tier available (1,000 calls/day)
- **Data Provided**: AQI, PM2.5, PM10, SO₂, NO₂, CO, O₃, NH₃
- **Coverage**: Global

**Setup Steps:**
1. Sign up at https://openweathermap.org/api
2. Get your API key
3. Add to environment: `OPENWEATHER_API_KEY=your_key_here`

**Example Integration:**
```typescript
const response = await fetch(
  `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}`
);
const data = await response.json();
// Map data.list[0].components to our schema
```

### 2. IQAir API
- **Website**: https://www.iqair.com/air-pollution-data-api
- **Cost**: Free tier available (limited calls)
- **Data Provided**: Comprehensive air quality data including AQI, pollutants
- **Coverage**: Global, high accuracy

**Setup Steps:**
1. Sign up at https://www.iqair.com/dashboard/api
2. Get your API key
3. Add to environment: `IQAIR_API_KEY=your_key_here`

### 3. EPA AirNow API (USA Only)
- **Website**: https://docs.airnowapi.org/
- **Cost**: Free
- **Data Provided**: AQI, PM2.5, O₃
- **Coverage**: United States only

### 4. Breezometer API
- **Website**: https://www.breezometer.com/
- **Cost**: Paid plans
- **Data Provided**: Comprehensive pollution data including pollen, UV
- **Coverage**: Global

## API Sources by Category

### 1. Air Quality APIs
**Primary Options:**
- OpenWeatherMap Air Pollution API (AQI, PM2.5, PM10, SO₂, NO₂, CO, O₃)
- IQAir API (Comprehensive air quality)
- EPA AirNow API (USA only)

### 2. Noise Pollution
**Options:**
- NoiseCapture API (community-sourced noise data)
- Urban noise monitoring networks (city-specific)
- **User Input**: Smartphone noise meter apps
- **Alternative**: Smart home sensors with noise monitoring

### 3. Water Quality
**Options:**
- EPA Water Quality Portal (USA)
- Local water utility APIs (city-specific)
- Water Quality Data Portal (global)
- **User Input**: Home water testing kits

### 4. Soil Quality
**Options:**
- USDA Soil Data (USA)
- European Soil Data Centre (Europe)
- FAO Global Soil Partnership
- **User Input**: Home soil testing kits
- Regional agricultural databases

### 5. Light Pollution & UV
**Options:**
- Light Pollution Map API (global light pollution)
- OpenWeatherMap UV Index
- National Weather Service UV Index (USA)
- Dark Site Finder API

### 6. Thermal Conditions
**Options:**
- OpenWeatherMap (temperature, humidity, pressure)
- National Weather Service API (USA)
- WeatherAPI.com
- AccuWeather API

### 7. Radioactive Exposure
**Options:**
- EPA RadNet (USA - real-time radiation monitoring)
- Safecast API (global crowdsourced radiation data)
- National radiation monitoring networks (country-specific)
- **User Input**: Personal radon detectors
- Regional average databases

## Data Not Typically Available from Standard APIs

Many environmental health metrics require specialized sensors or user input:

### Requires Personal Sensors/Manual Input:
- **Noise levels** - Use smartphone apps or smart home sensors
- **Indoor water quality** - Home water testing kits
- **Soil quality** - Soil testing kits for gardens/yards
- **Radon** - Personal radon detectors (EPA recommends all homes test)
- **Indoor air quality** - Smart monitors (Awair, Foobot, Purple Air)

### Strategy for Chronic Illness Tracking:
1. **Outdoor data**: Fetch from APIs based on geolocation
2. **Indoor data**: Allow manual input or integrate with personal sensors
3. **Regional averages**: Use for metrics without local data
4. **User devices**: Support integration with smart home environmental monitors

## Implementation Example

Here's how to replace the mock data in `server/routes.ts`:

```typescript
app.get("/api/environmental", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude required" });
  }

  try {
    // Fetch from OpenWeatherMap
    const owmResponse = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}`
    );
    const owmData = await owmResponse.json();
    const components = owmData.list[0].components;

    // Map to our schema
    const environmentalData = {
      aqi: owmData.list[0].main.aqi * 50, // Convert 1-5 scale to 0-250
      pm25: components.pm2_5,
      pm10: components.pm10,
      so2: components.so2,
      no2: components.no2,
      nox: components.no + components.no2, // Calculate NOx
      co: components.co / 1000, // Convert to ppm
      o3: components.o3,
      timestamp: new Date().toISOString(),
      location: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
      source: "OpenWeatherMap",
    };

    res.json(environmentalData);
  } catch (error) {
    console.error("Error fetching environmental data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});
```

## Multi-Source Strategy

For production use, consider combining multiple sources:

```typescript
// Primary: OpenWeatherMap for basic pollutants
// Secondary: IQAir for additional validation
// Fallback: EPA for US locations
// User Input: Radon, indoor VOCs
```

## Privacy Considerations

- Location data is only sent to environmental APIs, not stored
- Consider caching responses to reduce API calls
- Inform users which APIs are being used
- Allow users to opt-out of auto-location

## Next Steps

1. Choose your primary API provider
2. Sign up and get API key
3. Add API key to Replit Secrets (use the lock icon in sidebar)
4. Update `server/routes.ts` with real API calls
5. Test with your actual location
6. Monitor API usage to stay within free tiers
