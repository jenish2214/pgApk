package com.myapp.siren

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import kotlin.math.PI
import kotlin.math.sin

/**
 * Generated siren on the alarm stream. Uses the current alarm volume and does not
 * change it, mute the phone, or bypass Do Not Disturb.
 */
object OrderSirenPlayer {
  private val gate = Any()
  private var generation = 0
  private var worker: Thread? = null
  private var track: AudioTrack? = null
  private var focusRequest: AudioFocusRequest? = null
  private var wake: PowerManager.WakeLock? = null

  fun play(context: Context, durationMs: Long, tone: String = "siren") {
    val token = begin()
    val length = durationMs.coerceIn(1_000L, 60_000L)
    val app = context.applicationContext
    val power = app.getSystemService(Context.POWER_SERVICE) as PowerManager
    val lock =
        power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pragati:order-siren").apply {
          setReferenceCounted(false)
          acquire(length + 2_000L)
        }
    synchronized(gate) {
      if (generation != token) {
        releaseWake(lock)
        return
      }
      wake = lock
    }
    val selected = if (tone == "alarm") "alarm" else "siren"
    worker = Thread({ runSiren(app, length, token, selected) }, "order-siren").also { it.start() }
  }

  fun stop() {
    begin()
  }

  fun alarmVolume(context: Context): Int {
    val manager = context.applicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val max = manager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
    val current = manager.getStreamVolume(AudioManager.STREAM_ALARM)
    return if (max == 0) 0 else (current * 100) / max
  }

  private fun begin(): Int {
    val previousTrack: AudioTrack?
    val previousWake: PowerManager.WakeLock?
    val token: Int
    synchronized(gate) {
      generation += 1
      token = generation
      previousTrack = track
      track = null
      previousWake = wake
      wake = null
    }
    previousTrack?.let { releaseTrack(it) }
    releaseWake(previousWake)
    return token
  }

  private fun runSiren(context: Context, durationMs: Long, token: Int, tone: String) {
    val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val attributes =
        AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
    requestFocus(manager, attributes, token)
    val sampleRate = 44_100
    val minBuffer =
        AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
            )
            .coerceAtLeast(sampleRate / 5)
    val audioTrack =
        AudioTrack.Builder()
            .setAudioAttributes(attributes)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(minBuffer * 2)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
    synchronized(gate) {
      if (generation != token) {
        audioTrack.release()
        abandonFocus(manager, token)
        return
      }
      track = audioTrack
    }
    audioTrack.play()
    val buffer = ShortArray(1024)
    val step = 1.0 / sampleRate
    var time = 0.0
    var phase = 0.0
    val started = SystemClock.elapsedRealtime()
    try {
      while (generation == token && SystemClock.elapsedRealtime() - started < durationMs) {
        for (index in buffer.indices) {
          val frequency =
              if (tone == "alarm") {
                if (time % 0.8 < 0.4) 880.0 else 660.0
              } else {
                val cycle = time % 1.2
                val rising = cycle < 0.6
                val sweep = if (rising) cycle / 0.6 else (cycle - 0.6) / 0.6
                if (rising) 620.0 + sweep * 980.0 else 1600.0 - sweep * 980.0
              }
          phase += 2.0 * PI * frequency * step
          if (phase > 2.0 * PI) {
            phase -= 2.0 * PI
          }
          val tone = sin(phase) + 0.35 * sin(phase * 2.0)
          buffer[index] =
              (tone * 0.72 * Short.MAX_VALUE)
                  .toInt()
                  .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                  .toShort()
          time += step
        }
        if (audioTrack.write(buffer, 0, buffer.size) < 0) {
          break
        }
      }
    } catch (_: Exception) {
    } finally {
      releaseTrack(audioTrack)
      abandonFocus(manager, token)
      synchronized(gate) {
        if (generation == token) {
          releaseWake(wake)
          wake = null
        }
      }
    }
  }

  private fun releaseTrack(audioTrack: AudioTrack) {
    synchronized(gate) {
      if (track === audioTrack) {
        track = null
      }
    }
    try {
      audioTrack.pause()
      audioTrack.flush()
      audioTrack.release()
    } catch (_: Exception) {
    }
  }

  private fun requestFocus(manager: AudioManager, attributes: AudioAttributes, token: Int) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      manager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      return
    }
    val request =
        AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(attributes)
            .build()
    synchronized(gate) {
      if (generation != token) {
        return
      }
      focusRequest = request
    }
    manager.requestAudioFocus(request)
  }

  private fun abandonFocus(manager: AudioManager, token: Int) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      if (generation != token) {
        return
      }
      @Suppress("DEPRECATION")
      manager.abandonAudioFocus(null)
      return
    }
    val request =
        synchronized(gate) {
          if (generation != token) {
            return
          }
          focusRequest.also { focusRequest = null }
        } ?: return
    manager.abandonAudioFocusRequest(request)
  }

  private fun releaseWake(lock: PowerManager.WakeLock?) {
    if (lock == null) {
      return
    }
    try {
      if (lock.isHeld) {
        lock.release()
      }
    } catch (_: Exception) {
    }
  }
}
