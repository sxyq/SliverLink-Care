package com.silverlink.smsrelay.service

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build

class MediaKeepAliveController(context: Context) {

    private val appContext = context.applicationContext
    private val audioManager = appContext.getSystemService(AudioManager::class.java)
    private var audioTrack: AudioTrack? = null
    private var mediaSession: MediaSession? = null
    private var focusRequest: AudioFocusRequest? = null
    private var enabled = false

    fun start() {
        if (enabled) return
        enabled = true
        requestAudioFocus()
        ensureMediaSession()
        ensureAudioTrack()
    }

    fun stop() {
        enabled = false
        releaseAudioTrack()
        releaseMediaSession()
        abandonAudioFocus()
    }

    fun isRunning(): Boolean {
        return enabled && audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING
    }

    private fun ensureMediaSession() {
        if (mediaSession != null) {
            updatePlaybackState(active = true)
            return
        }
        mediaSession = MediaSession(appContext, "silverlink-media-keepalive").apply {
            isActive = true
        }
        updatePlaybackState(active = true)
    }

    private fun updatePlaybackState(active: Boolean) {
        mediaSession?.setPlaybackState(
            PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY_PAUSE)
                .setState(
                    if (active) PlaybackState.STATE_PLAYING else PlaybackState.STATE_STOPPED,
                    PlaybackState.PLAYBACK_POSITION_UNKNOWN,
                    if (active) 1f else 0f,
                )
                .build(),
        )
    }

    private fun ensureAudioTrack() {
        if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) return
        releaseAudioTrack()

        val sampleRate = 8_000
        val channelMask = AudioFormat.CHANNEL_OUT_MONO
        val encoding = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioTrack.getMinBufferSize(sampleRate, channelMask, encoding)
        val bufferSize = maxOf(minBufferSize, sampleRate * 2)
        val silentBuffer = ByteArray(bufferSize)

        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build(),
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setChannelMask(channelMask)
                    .setEncoding(encoding)
                    .build(),
            )
            .setTransferMode(AudioTrack.MODE_STATIC)
            .setBufferSizeInBytes(bufferSize)
            .build()

        val written = track.write(silentBuffer, 0, silentBuffer.size)
        if (written > 0) {
            val frames = written / 2
            track.setVolume(0f)
            if (frames > 1) {
                track.setLoopPoints(0, frames, -1)
            }
            track.play()
            audioTrack = track
            return
        }

        track.release()
        enabled = false
    }

    private fun releaseAudioTrack() {
        audioTrack?.runCatching {
            stop()
            flush()
            release()
        }
        audioTrack = null
    }

    private fun releaseMediaSession() {
        updatePlaybackState(active = false)
        mediaSession?.release()
        mediaSession = null
    }

    private fun requestAudioFocus() {
        val manager = audioManager ?: return
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attributes)
                .setAcceptsDelayedFocusGain(false)
                .setWillPauseWhenDucked(false)
                .build()
            focusRequest = request
            manager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            manager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
        }
    }

    private fun abandonAudioFocus() {
        val manager = audioManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let(manager::abandonAudioFocusRequest)
            focusRequest = null
        } else {
            @Suppress("DEPRECATION")
            manager.abandonAudioFocus(null)
        }
    }
}
