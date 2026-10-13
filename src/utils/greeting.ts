export function timeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5 || hour >= 21) {
    return 'Good night';
  }
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/** A short shop line that matches the time of day. */
export function greetingNote(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) {
    return 'The counter can rest until morning.';
  }
  if (hour < 12) {
    return 'Check what is due before noon.';
  }
  if (hour < 17) {
    return 'Keep orders moving toward collection.';
  }
  if (hour < 21) {
    return 'See who can collect before you close.';
  }
  return 'Note anything still waiting for tomorrow.';
}

export function homeKicker(name: string, date = new Date()): string {
  const person = String(name || 'there').trim();
  return `${timeGreeting(date)}, ${person}`.toUpperCase();
}
