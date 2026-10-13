/** Next shop tag, starting at 1001. */
export function nextTagNumber(used: string[]): string {
  const numbers = used
    .map(tag => Number.parseInt(String(tag).trim(), 10))
    .filter(value => Number.isFinite(value) && value > 0);
  const highest = numbers.length ? Math.max(...numbers) : 1000;
  return String(highest + 1);
}
