package com.myapp.siren

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Handles a reminder alarm and the Stop, Snooze, and Open actions. */
class OrderAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    val id = intent.getStringExtra("id")
    when (action) {
      OrderAlarmScheduler.ACTION_FIRE -> OrderAlarmScheduler.onFire(context, id)
      OrderAlarmScheduler.ACTION_STOP -> OrderAlarmScheduler.onStop(context, id)
      OrderAlarmScheduler.ACTION_SNOOZE -> OrderAlarmScheduler.onSnooze(context, id)
      OrderAlarmScheduler.ACTION_OPEN -> OrderAlarmScheduler.onOpen(context, id)
    }
  }
}
