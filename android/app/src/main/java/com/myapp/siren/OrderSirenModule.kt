package com.myapp.siren

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.SystemClock
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.PI
import kotlin.math.sin

/** Plays a generated siren on the phone alarm stream. Does not change the volume. */
class OrderSirenModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  private val lock = Any()
  @Volatile private var generation = 0
  private var worker: Thread? = null
  private var track: AudioTrack? = null
  private var focusRequest: AudioFocusRequest? = null

  @ReactMethod
  fun play(durationMs: Double) {
    val token = begin()
    worker?.join(300)
    val length = durationMs.toLong().coerceIn(1_000L, 15_000L)
    synchronized(lock) {
      if (generation != token) {
        return
      }
    }
    worker = Thread({ runSiren(length, token) }, "order-siren").also { it.start() }
  }

  @ReactMethod
  fun stop() {
    begin()
  }

  @ReactMethod
  fun alarmVolume(promise: Promise) {
    val manager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val max = manager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
    val current = manager.getStreamVolume(AudioManager.STREAM_ALARM)
    promise.resolve(if (max == 0) 0 else (current * 100) / max)
  }

  private fun begin(): Int {
    val current =
        synchronized(lock) {
          generation += 1
          track.also { track = null }
        }
    current?.let { releaseTrack(it) }
    return generation
  }

  private fun runSiren(durationMs: Long, token: Int) {
    val manager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val attributes =
        AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
    requestFocus(manager, attributes)

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

    synchronized(lock) {
      if (generation != token) {
        audioTrack.release()
        abandonFocus(manager)
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
          val cycle = time % 1.2
          val rising = cycle < 0.6
          val sweep = if (rising) cycle / 0.6 else (cycle - 0.6) / 0.6
          val frequency = if (rising) 620.0 + sweep * 980.0 else 1600.0 - sweep * 980.0
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
      abandonFocus(manager)
    }
  }

  private fun releaseTrack(audioTrack: AudioTrack) {
    synchronized(lock) {
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

  private fun requestFocus(manager: AudioManager, attributes: AudioAttributes) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request =
          AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
              .setAudioAttributes(attributes)
              .build()
      focusRequest = request
      manager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      manager.requestAudioFocus(
          null,
          AudioManager.STREAM_ALARM,
          AudioManager.AUDIOFOCUS_GAIN_TRANSIENT,
      )
    }
  }

  private fun abandonFocus(manager: AudioManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { manager.abandonAudioFocusRequest(it) }
      focusRequest = null
    } else {
      @Suppress("DEPRECATION")
      manager.abandonAudioFocus(null)
    }
  }

  companion object {
    const val NAME = "OrderSiren"
  }
}
