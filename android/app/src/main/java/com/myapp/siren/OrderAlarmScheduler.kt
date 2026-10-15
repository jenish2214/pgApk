package com.myapp.siren

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.text.format.DateFormat
import com.myapp.MainActivity
import org.json.JSONObject
import java.util.Calendar
import java.util.Date

/** Local AlarmManager reminders. Does not change volume or bypass Do Not Disturb. */
object OrderAlarmScheduler {
  const val ACTION_FIRE = "com.myapp.alarm.FIRE"
  const val ACTION_STOP = "com.myapp.alarm.STOP"
  const val ACTION_SNOOZE = "com.myapp.alarm.SNOOZE"
  const val ACTION_OPEN = "com.myapp.alarm.OPEN"
  const val CHANNEL_ID = "pragati-alarm"

  private const val PREFS = "pragati_alarms"
  private const val MISSED_SOUND_MS = 15 * 60 * 1000L
  private val gate = Any()
  private val recentStops = HashMap<String, Long>()

  data class Status(
      val exactAllowed: Boolean,
      val batteryUnrestricted: Boolean,
      val notificationsEnabled: Boolean,
      val channelBlocked: Boolean,
      val channelVibration: Boolean,
      val fullScreen: String,
      val alarmVolume: Int,
      val timing: String,
      val scheduleError: String,
      val pending: Int,
  )

  fun setOptions(
      context: Context,
      durationMs: Long,
      snoozeMinutes: Int,
      stopLabel: String,
      snoozeLabel: String,
      tone: String,
      vibrate: Boolean,
  ) {
    prefs(context)
        .edit()
        .putLong("duration_ms", durationMs.coerceIn(1_000L, 60_000L))
        .putInt("snooze_minutes", snoozeMinutes.coerceIn(1, 60))
        .putString("stop_label", stopLabel.ifBlank { "Stop alarm" })
        .putString("snooze_label", snoozeLabel.ifBlank { "Snooze" })
        .putString("tone", if (tone == "alarm") "alarm" else "siren")
        .putBoolean("vibrate", vibrate)
        .apply()
    ensureChannel(context)
  }

  fun savedTone(context: Context): String {
    return if (prefs(context).getString("tone", "siren") == "alarm") "alarm" else "siren"
  }

  fun beginBatch(context: Context) {
    prefs(context).edit().putString("timing", "none").remove("schedule_error").apply()
  }

  fun schedule(
      context: Context,
      id: String,
      atMillis: Long,
      title: String,
      body: String,
      hour: Int,
      sound: Boolean,
      repeat: Boolean,
  ): String {
    synchronized(gate) {
      val whenAt =
          if (repeat && hour in 0..23 && atMillis <= System.currentTimeMillis()) {
            nextHour(hour, System.currentTimeMillis())
          } else {
            atMillis
          }
      save(
          context,
          Alarm(
              id = id,
              at = whenAt,
              title = title.ifBlank { "Order alert" },
              body = body,
              hour = hour,
              repeat = repeat,
              sound = sound,
          ),
      )
      return arm(context, id)
    }
  }

  fun cancel(context: Context, id: String) {
    synchronized(gate) {
      alarmManager(context).cancel(pending(context, ACTION_FIRE, id))
      prefs(context).edit().remove(key(id)).apply()
    }
  }

  /** Shows a reminder that was due while the phone was off, then keeps the next one. */
  fun catchUp(context: Context): Boolean {
    synchronized(gate) {
      var posted = false
      val now = System.currentTimeMillis()
      for (alarm in loadAll(context)) {
        if (alarm.at > now) {
          arm(context, alarm.id)
          continue
        }
        if (deliveredAt(context, alarm.id) != alarm.at) {
          val recent = now - alarm.at <= MISSED_SOUND_MS
          deliver(context, alarm, playSound = alarm.sound && recent)
          markDelivered(context, alarm.id, alarm.at)
          posted = true
        }
        roll(context, alarm)
      }
      return posted
    }
  }

  fun onRestore(context: Context) {
    catchUp(context)
  }

  fun onClockChanged(context: Context) {
    synchronized(gate) {
      val now = System.currentTimeMillis()
      for (alarm in loadAll(context)) {
        if (!alarm.repeat || alarm.hour !in 0..23) {
          continue
        }
        save(context, alarm.copy(at = nextHour(alarm.hour, now)))
        arm(context, alarm.id)
      }
    }
  }

  fun onFire(context: Context, id: String?) {
    if (id.isNullOrBlank()) {
      return
    }
    synchronized(gate) {
      val alarm = load(context, id) ?: return
      if (deliveredAt(context, id) == alarm.at) {
        return
      }
      markDelivered(context, id, alarm.at)
      deliver(context, alarm, playSound = alarm.sound)
      roll(context, alarm)
    }
  }

  fun onStop(context: Context, id: String?) {
    val key = id ?: ""
    val now = SystemClock.elapsedRealtime()
    val last = recentStops[key] ?: 0L
    recentStops[key] = now
    OrderSirenPlayer.stop()
    if (now - last < 1_000L || id.isNullOrBlank()) {
      return
    }
    notificationManager(context).cancel(notificationId(id))
  }

  fun onSnooze(context: Context, id: String?) {
    if (id.isNullOrBlank()) {
      return
    }
    synchronized(gate) {
      OrderSirenPlayer.stop()
      notificationManager(context).cancel(notificationId(id))
      val parent = load(context, id.removeSuffix("-snooze")) ?: load(context, id) ?: return
      val minutes = prefs(context).getInt("snooze_minutes", 10).coerceIn(1, 60)
      val snoozeId = if (id.endsWith("-snooze")) id else "$id-snooze"
      save(
          context,
          Alarm(
              id = snoozeId,
              at = System.currentTimeMillis() + minutes * 60_000L,
              title = parent.title,
              body = parent.body,
              hour = -1,
              repeat = false,
              sound = parent.sound,
          ),
      )
      arm(context, snoozeId)
    }
  }

  fun onOpen(context: Context, id: String?) {
    onStop(context, id)
    val open =
        Intent(context, MainActivity::class.java).addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP,
        )
    context.startActivity(open)
  }

  fun status(context: Context): Status {
    ensureChannel(context)
    val manager = notificationManager(context)
    val channel =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          manager.getNotificationChannel(CHANNEL_ID)
        } else {
          null
        }
    val fullScreen =
        if (Build.VERSION.SDK_INT >= 34) {
          if (manager.canUseFullScreenIntent()) "available" else "unavailable"
        } else {
          "unknown"
        }
    val stored = prefs(context)
    return Status(
        exactAllowed = canExact(context),
        batteryUnrestricted = isBatteryUnrestricted(context),
        notificationsEnabled = manager.areNotificationsEnabled(),
        channelBlocked = channel?.importance == NotificationManager.IMPORTANCE_NONE,
        channelVibration = channel?.shouldVibrate() ?: true,
        fullScreen = fullScreen,
        alarmVolume = OrderSirenPlayer.alarmVolume(context),
        timing = stored.getString("timing", "none") ?: "none",
        scheduleError = stored.getString("schedule_error", "") ?: "",
        pending = loadAll(context).size,
    )
  }

  private fun deliver(context: Context, alarm: Alarm, playSound: Boolean) {
    if (playSound) {
      val duration = prefs(context).getLong("duration_ms", 20_000L)
      OrderSirenPlayer.play(context, duration, savedTone(context))
    }
    try {
      notificationManager(context).notify(notificationId(alarm.id), buildNotification(context, alarm))
    } catch (_: SecurityException) {
      // The siren can still play. Settings explains when notifications are off.
    }
  }

  private fun roll(context: Context, alarm: Alarm) {
    if (alarm.repeat && alarm.hour in 0..23) {
      save(context, alarm.copy(at = nextHour(alarm.hour, System.currentTimeMillis())))
      arm(context, alarm.id)
    } else {
      prefs(context).edit().remove(key(alarm.id)).apply()
      alarmManager(context).cancel(pending(context, ACTION_FIRE, alarm.id))
    }
  }

  private fun arm(context: Context, id: String): String {
    val alarm = load(context, id) ?: return "unscheduled"
    val manager = alarmManager(context)
    val intent = pending(context, ACTION_FIRE, id)
    if (canExact(context)) {
      try {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, intent)
        remember(context, "exact", "")
        return "exact"
      } catch (_: SecurityException) {
      }
    }
    return try {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, intent)
      remember(context, "inexact", "")
      "inexact"
    } catch (_: Exception) {
      try {
        manager.set(AlarmManager.RTC_WAKEUP, alarm.at, intent)
        remember(context, "inexact", "")
        "inexact"
      } catch (_: Exception) {
        remember(context, "unscheduled", "The reminder could not be scheduled.")
        "unscheduled"
      }
    }
  }

  private fun buildNotification(context: Context, alarm: Alarm): Notification {
    ensureChannel(context)
    val stored = prefs(context)
    val clock = DateFormat.getTimeFormat(context).format(Date(alarm.at))
    val stop = pending(context, ACTION_STOP, alarm.id)
    val snooze = pending(context, ACTION_SNOOZE, alarm.id)
    val open = pending(context, ACTION_OPEN, alarm.id)
    val stopLabel = stored.getString("stop_label", "Stop alarm")
    val snoozeLabel = stored.getString("snooze_label", "Snooze")
    val builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          Notification.Builder(context, CHANNEL_ID)
        } else {
          @Suppress("DEPRECATION")
          Notification.Builder(context)
        }
    builder
        .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
        .setContentTitle(alarm.title)
        .setContentText(clock)
        .setStyle(Notification.BigTextStyle().bigText("$clock\n${alarm.body}"))
        .setWhen(alarm.at)
        .setShowWhen(true)
        .setCategory(Notification.CATEGORY_ALARM)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .setContentIntent(open)
        .setDeleteIntent(stop)
        .addAction(action(stopLabel, stop))
        .addAction(action(snoozeLabel, snooze))
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      builder.setPriority(Notification.PRIORITY_HIGH)
    }
    return builder.build()
  }

  private fun action(label: String?, intent: PendingIntent): Notification.Action {
    @Suppress("DEPRECATION")
    return Notification.Action.Builder(0, label, intent).build()
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val vibrate = prefs(context).getBoolean("vibrate", true)
    val channel =
        NotificationChannel(CHANNEL_ID, "Order alarm", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Shop reminders. Loudness follows the phone alarm volume."
          enableVibration(vibrate)
          if (vibrate) {
            vibrationPattern = longArrayOf(0, 700, 180, 700, 180, 700, 180, 900)
          }
          setSound(null, null)
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
    notificationManager(context).createNotificationChannel(channel)
  }

  private fun canExact(context: Context): Boolean {
    val manager = alarmManager(context)
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      manager.canScheduleExactAlarms()
    } else {
      true
    }
  }

  private fun isBatteryUnrestricted(context: Context): Boolean {
    val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return power.isIgnoringBatteryOptimizations(context.packageName)
  }

  private fun nextHour(hour: Int, now: Long): Long {
    val calendar = Calendar.getInstance()
    calendar.timeInMillis = now
    calendar.set(Calendar.HOUR_OF_DAY, hour)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    if (calendar.timeInMillis <= now) {
      calendar.add(Calendar.DATE, 1)
    }
    return calendar.timeInMillis
  }

  private fun pending(context: Context, action: String, id: String): PendingIntent {
    val intent =
        Intent(context, OrderAlarmReceiver::class.java).apply {
          this.action = action
          putExtra("id", id)
          data = Uri.parse("alarm://$action/$id")
        }
    return PendingIntent.getBroadcast(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun notificationId(id: String): Int = 7_000 + (id.hashCode() and 0x0FFF)

  private fun remember(context: Context, timing: String, error: String) {
    val current = prefs(context).getString("timing", "none")
    val nextTiming =
        when {
          current == "unscheduled" || timing == "unscheduled" -> "unscheduled"
          current == "inexact" || timing == "inexact" -> "inexact"
          else -> timing
        }
    val editor = prefs(context).edit().putString("timing", nextTiming)
    if (error.isNotBlank()) {
      editor.putString("schedule_error", error)
    }
    editor.apply()
  }

  private fun markDelivered(context: Context, id: String, at: Long) {
    prefs(context).edit().putLong("delivered_$id", at).apply()
  }

  private fun deliveredAt(context: Context, id: String): Long = prefs(context).getLong("delivered_$id", 0L)

  private data class Alarm(
      val id: String,
      val at: Long,
      val title: String,
      val body: String,
      val hour: Int,
      val repeat: Boolean,
      val sound: Boolean,
  )

  private fun save(context: Context, alarm: Alarm) {
    val json =
        JSONObject()
            .put("at", alarm.at)
            .put("title", alarm.title)
            .put("body", alarm.body)
            .put("hour", alarm.hour)
            .put("repeat", alarm.repeat)
            .put("sound", alarm.sound)
    prefs(context).edit().putString(key(alarm.id), json.toString()).apply()
  }

  private fun load(context: Context, id: String): Alarm? {
    val raw = prefs(context).getString(key(id), null) ?: return null
    return parse(id, raw)
  }

  private fun loadAll(context: Context): List<Alarm> {
    return prefs(context)
        .all
        .mapNotNull { (name, value) ->
          if (!name.startsWith("alarm_") || value !is String) {
            null
          } else {
            parse(name.removePrefix("alarm_"), value)
          }
        }
  }

  private fun parse(id: String, raw: String): Alarm? {
    return try {
      val json = JSONObject(raw)
      Alarm(
          id = id,
          at = json.getLong("at"),
          title = json.optString("title"),
          body = json.optString("body"),
          hour = json.optInt("hour", -1),
          repeat = json.optBoolean("repeat"),
          sound = json.optBoolean("sound", true),
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun key(id: String): String = "alarm_$id"

  private fun prefs(context: Context) = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun notificationManager(context: Context) =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}
