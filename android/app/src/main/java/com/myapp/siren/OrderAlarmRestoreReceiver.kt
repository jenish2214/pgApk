package com.myapp.siren

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restores reminders after reboot, clock changes, app update, or exact-alarm access. */
class OrderAlarmRestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    when (intent?.action) {
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> OrderAlarmScheduler.onClockChanged(context)
      Intent.ACTION_BOOT_COMPLETED,
      "android.intent.action.QUICKBOOT_POWERON",
      "com.htc.intent.action.QUICKBOOT_POWERON",
      Intent.ACTION_MY_PACKAGE_REPLACED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" ->
          OrderAlarmScheduler.onRestore(context)
    }
  }
}
