export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

type UpdateStatusSnapshot = {
  status: UpdateStatus;
  lastCheckedAt: string | null;
  message: string | null;
};

let snapshot: UpdateStatusSnapshot = {
  status: 'idle',
  lastCheckedAt: null,
  message: null,
};

const listeners = new Set<(state: UpdateStatusSnapshot) => void>();

function notify() {
  for (const listener of listeners) {
    listener({ ...snapshot });
  }
}

export function getUpdateStatus(): UpdateStatusSnapshot {
  return { ...snapshot };
}

export function setUpdateStatus(status: UpdateStatus, message: string | null = null): void {
  snapshot = {
    status,
    message,
    lastCheckedAt: new Date().toISOString(),
  };
  notify();
}

export function subscribeUpdateStatus(
  listener: (state: UpdateStatusSnapshot) => void,
): () => void {
  listeners.add(listener);
  listener({ ...snapshot });
  return () => listeners.delete(listener);
}
