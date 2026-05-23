export function calculateBMI(heightCm: string, weightKg: string): string {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w) return '';
  return (w / (h * h)).toFixed(1);
}
