export function formatRupees(amount: number): string {
  const value = Math.round(Number(amount) || 0);
  return `₹${value.toLocaleString('en-IN')}`;
}
