package com.myapp.siren

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Bridge to the alarm-stream siren and the local reminder alarms. */
class OrderSirenModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun play(durationMs: Double) {
    OrderSirenPlayer.play(
        reactApplicationContext,
        durationMs.toLong(),
        OrderAlarmScheduler.savedTone(reactApplicationContext),
    )
  }

  @ReactMethod
  fun stop() {
    OrderSirenPlayer.stop()
  }

  @ReactMethod
  fun alarmVolume(promise: Promise) {
    promise.resolve(OrderSirenPlayer.alarmVolume(reactApplicationContext))
  }

  @ReactMethod
  fun setAlarmOptions(
      durationMs: Double,
      snoozeMinutes: Double,
      stopLabel: String,
      snoozeLabel: String,
      tone: String,
      vibrate: Boolean,
  ) {
    OrderAlarmScheduler.setOptions(
        reactApplicationContext,
        durationMs.toLong(),
        snoozeMinutes.toInt(),
        stopLabel,
        snoozeLabel,
        tone,
        vibrate,
    )
  }

  @ReactMethod
  fun beginAlarmBatch() {
    OrderAlarmScheduler.beginBatch(reactApplicationContext)
  }

  @ReactMethod
  fun scheduleAlarm(
      id: String,
      atMillis: Double,
      title: String,
      body: String,
      hour: Double,
      sound: Boolean,
      promise: Promise,
  ) {
    try {
      val timing =
          OrderAlarmScheduler.schedule(
              reactApplicationContext,
              id,
              atMillis.toLong(),
              title,
              body,
              hour.toInt(),
              sound,
              true,
          )
      val result = Arguments.createMap()
      result.putString("timing", timing)
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("schedule", error.message ?: "The reminder could not be scheduled.")
    }
  }

  @ReactMethod
  fun cancelAlarm(id: String) {
    OrderAlarmScheduler.cancel(reactApplicationContext, id)
  }

  @ReactMethod
  fun catchUpAlarms(promise: Promise) {
    try {
      promise.resolve(OrderAlarmScheduler.catchUp(reactApplicationContext))
    } catch (error: Exception) {
      promise.reject("catchup", error.message ?: "The reminder could not be scheduled.")
    }
  }

  @ReactMethod
  fun reminderStatus(promise: Promise) {
    try {
      val status = OrderAlarmScheduler.status(reactApplicationContext)
      val result = Arguments.createMap()
      result.putBoolean("exactAllowed", status.exactAllowed)
      result.putBoolean("batteryUnrestricted", status.batteryUnrestricted)
      result.putBoolean("notificationsEnabled", status.notificationsEnabled)
      result.putBoolean("channelBlocked", status.channelBlocked)
      result.putBoolean("channelVibration", status.channelVibration)
      result.putString("fullScreen", status.fullScreen)
      result.putInt("alarmVolume", status.alarmVolume)
      result.putString("timing", status.timing)
      result.putString("scheduleError", status.scheduleError)
      result.putInt("pending", status.pending)
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("status", error.message ?: "The reminder could not be scheduled.")
    }
  }

  companion object {
    const val NAME = "OrderSiren"
  }
}
