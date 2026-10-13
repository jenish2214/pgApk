import {formatWhen} from './dates';

export type DialogRequest = {
  title: string;
  lines: string[];
  confirmLabel: string;
  destructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
};

type Listener = (request: DialogRequest | null) => void;

let listener: Listener | null = null;

export function subscribeDialog(next: Listener): () => void {
  listener = next;
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

function openDialog(request: DialogRequest): void {
  listener?.(request);
}

export function confirmAction({
  title,
  lines,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  title: string;
  lines: string[];
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  const details = lines.map(line => line.trim()).filter(Boolean);
  openDialog({
    title,
    lines: [...details, `Date and time: ${formatWhen(new Date().toISOString())}`],
    confirmLabel,
    destructive,
    onConfirm,
  });
}

export function showNotice({title, message}: {title: string; message: string}): void {
  openDialog({
    title,
    lines: [message],
    confirmLabel: 'OK',
    hideCancel: true,
    onConfirm: () => undefined,
  });
}
