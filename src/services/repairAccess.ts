const REPAIR_USERNAME = 'admin';
const REPAIR_PASSWORD = 'admin@123';
const MAX_TRIES = 5;
const WAIT_MS = 30_000;

let unlocked = false;
let lockTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let blockedUntil = 0;

export function isRepairUnlocked(): boolean {
  return unlocked;
}

/** Seconds left before sign-in can be tried again after too many wrong tries. */
export function repairWaitSeconds(now = Date.now()): number {
  return Math.max(0, Math.ceil((blockedUntil - now) / 1000));
}

export function repairTriesLeft(): number {
  return MAX_TRIES - failures;
}

export function tryUnlockRepair(username: string, password: string): boolean {
  if (repairWaitSeconds() > 0) {
    return false;
  }
  if (username.trim().toLowerCase() === REPAIR_USERNAME && password === REPAIR_PASSWORD) {
    unlocked = true;
    failures = 0;
    return true;
  }
  failures += 1;
  if (failures >= MAX_TRIES) {
    failures = 0;
    blockedUntil = Date.now() + WAIT_MS;
  }
  return false;
}

/** Keeps the repair sign-in while the list or the repair form is open. */
export function noteRepairEntered(): void {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = undefined;
  }
}

/** Locks repairs again after the shop leaves both repair screens. */
export function noteRepairLeft(): void {
  if (lockTimer) {
    clearTimeout(lockTimer);
  }
  lockTimer = setTimeout(() => {
    unlocked = false;
    lockTimer = undefined;
  }, 400);
}
