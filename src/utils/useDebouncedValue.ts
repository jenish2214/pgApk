import {useEffect, useState} from 'react';

/** Waits until typing pauses before a search reads the shop records. */
export function useDebouncedValue<T>(value: T, delay = 160): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return settled;
}
