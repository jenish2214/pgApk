export type ReminderCheck = 'ok' | 'off' | 'unknown';

export type ReminderHealth = {
  notifications: ReminderCheck;
  exact: ReminderCheck;
  channel: ReminderCheck;
  vibration: ReminderCheck;
  battery: ReminderCheck;
  fullScreen: 'available' | 'unavailable' | 'unknown';
  alarmVolume: number | null;
  timing: 'exact' | 'inexact' | 'unscheduled' | 'none';
  scheduleError: string;
};

export function sirenDurationMs(value: string): number {
  const parsed = Number(value);
  return parsed === 10000 || parsed === 30000 ? parsed : 20000;
}

export function snoozeMinutes(value: string): number {
  const parsed = Number(value);
  return parsed === 5 || parsed === 15 ? parsed : 10;
}

/** Problems the shop owner can act on. Empty when reminders can ring as scheduled. */
export function reminderProblems(health: ReminderHealth): string[] {
  const problems: string[] = [];
  if (health.notifications === 'off') {
    problems.push('Notifications are off, so this phone will not show reminders.');
  }
  if (health.channel === 'off') {
    problems.push('The order alarm is turned off in notification settings.');
  }
  if (health.vibration === 'off') {
    problems.push('Vibration is off for the order alarm.');
  }
  if (health.exact === 'off' || health.timing === 'inexact') {
    problems.push(
      'Exact alarms are off. Reminders can still ring, but the time may be less precise.',
    );
  }
  if (health.scheduleError) {
    problems.push(health.scheduleError);
  } else if (health.timing === 'unscheduled') {
    problems.push('The reminder could not be scheduled.');
  }
  if (health.battery === 'off') {
    problems.push(
      'Battery saving can delay reminders. Allow this app to run without battery restriction.',
    );
  }
  if (health.alarmVolume === 0) {
    problems.push('Turn up the phone alarm volume to hear the siren.');
  }
  return problems;
}

export function accessStatus(check: ReminderCheck, offMeans: 'disabled' | 'permission'): string {
  if (check === 'ok') {
    return 'Enabled';
  }
  if (check === 'off') {
    return offMeans === 'permission' ? 'Permission required' : 'Disabled';
  }
  return 'Unable to verify';
}

export function batteryRestrictionStatus(check: ReminderCheck): string {
  if (check === 'unknown') {
    return 'Unable to verify';
  }
  return check === 'off' ? 'Enabled' : 'Disabled';
}

export function alarmToneId(value: string): 'siren' | 'alarm' {
  return value === 'alarm' ? 'alarm' : 'siren';
}

export function reminderFullScreenNote(health: ReminderHealth): string {
  if (health.fullScreen !== 'unavailable') {
    return '';
  }
  return 'This phone does not allow a full-screen alarm. The reminder still shows as a notification.';
}
