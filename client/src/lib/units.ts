export type UnitSystem = "imperial" | "metric";

// Temperature conversions
export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function formatTemperature(value: number, units: UnitSystem): string {
  if (units === "metric") {
    return `${Math.round(fahrenheitToCelsius(value))}°C`;
  }
  return `${Math.round(value)}°F`;
}

// Glucose conversions (mg/dL to mmol/L)
export function mgdlToMmol(mgdl: number): number {
  return mgdl / 18.0;
}

export function mmolToMgdl(mmol: number): number {
  return mmol * 18.0;
}

export function formatGlucose(value: number, units: UnitSystem): string {
  if (units === "metric") {
    return `${mgdlToMmol(value).toFixed(1)} mmol/L`;
  }
  return `${value} mg/dL`;
}

// Weight conversions
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

export function kgToLbs(kg: number): number {
  return kg / 0.453592;
}

export function formatWeight(value: number, units: UnitSystem): string {
  if (units === "metric") {
    return `${lbsToKg(value).toFixed(1)} kg`;
  }
  return `${value.toFixed(1)} lbs`;
}

// Height conversions
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function formatHeight(inches: number, units: UnitSystem): string {
  if (units === "metric") {
    return `${Math.round(inchesToCm(inches))} cm`;
  }
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

// Generic temperature display (for environment)
export function getTemperatureValue(fahrenheit: number, units: UnitSystem): number {
  if (units === "metric") {
    return Math.round(fahrenheitToCelsius(fahrenheit));
  }
  return Math.round(fahrenheit);
}

export function getTemperatureUnit(units: UnitSystem): string {
  return units === "metric" ? "°C" : "°F";
}

// Generic glucose display
export function getGlucoseValue(mgdl: number, units: UnitSystem): string {
  if (units === "metric") {
    return mgdlToMmol(mgdl).toFixed(1);
  }
  return mgdl.toString();
}

export function getGlucoseUnit(units: UnitSystem): string {
  return units === "metric" ? "mmol/L" : "mg/dL";
}
