export function formatOrderNumber(year: number, sequence: number): string {
  return `PG-${year}-${String(sequence).padStart(4, '0')}`;
}

export function nextSequence(
  lastOrderNumber: string | undefined,
  prefix: string,
): number {
  if (!lastOrderNumber || !String(lastOrderNumber).startsWith(prefix)) {
    return 1;
  }
  const value = Number(String(lastOrderNumber).slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? value + 1 : 1;
}
