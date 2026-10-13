const TAG_SERIES = /^([A-Z]*)(\d+)$/;

/** Letters and digits only, stored in uppercase. */
export function formatTagNumber(value: string): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Next shop tag, starting at 1001. Keeps a letter prefix such as A1001. */
export function nextTagNumber(used: string[]): string {
  let prefix = '';
  let number = 1000;
  let width = 0;

  for (const raw of used) {
    const match = formatTagNumber(raw).match(TAG_SERIES);
    if (!match?.[2]) {
      continue;
    }
    const value = Number.parseInt(match[2], 10);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (value > number || (value === number && match[1] >= prefix)) {
      number = value;
      prefix = match[1];
      width = match[2].length;
    }
  }

  const next = String(number + 1);
  const digits = width > next.length ? next.padStart(width, '0') : next;
  return `${prefix}${digits}`;
}
