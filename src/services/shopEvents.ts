type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeShopChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyShopChanged(): void {
  listeners.forEach(listener => listener());
}
