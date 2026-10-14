const REPAIR_USERNAME = 'admin';
const REPAIR_PASSWORD = 'admin@123';

let unlocked = false;
let lockTimer: ReturnType<typeof setTimeout> | undefined;

export function isRepairUnlocked(): boolean {
  return unlocked;
}

export function tryUnlockRepair(username: string, password: string): boolean {
  if (username.trim() === REPAIR_USERNAME && password === REPAIR_PASSWORD) {
    unlocked = true;
    return true;
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
