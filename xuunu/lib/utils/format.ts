export function formatNumber(value: number, fractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
