package com.silverlink.smsrelay.util

import android.content.Context
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

object RootProtectionHelper {

    private const val PREFS_NAME = "sms-relay"
    private const val KEY_ROOT_FORCE_PROTECTION_ENABLED = "root_force_protection_enabled"

    data class ProtectionResult(
        val success: Boolean,
        val message: String,
    )

    fun isRootAvailable(): Boolean {
        return runCommand("id", 2_000L).success
    }

    fun enableForceProtection(context: Context, disableDeviceIdle: Boolean = true): ProtectionResult {
        if (!isRootAvailable()) {
            return ProtectionResult(false, "未检测到 root 权限")
        }

        val packageName = context.packageName
        val uid = resolvePackageUid(packageName)
        val commands = buildList {
            add("cmd deviceidle whitelist +$packageName || dumpsys deviceidle whitelist +$packageName || true")
            add("cmd appops set $packageName RUN_ANY_IN_BACKGROUND allow || true")
            add("cmd appops set $packageName RUN_IN_BACKGROUND allow || true")
            if (uid != null) {
                add("cmd netpolicy add restrict-background-whitelist $uid || true")
            }
            if (disableDeviceIdle) {
                add("dumpsys deviceidle disable || true")
            }
        }

        val failures = mutableListOf<String>()
        commands.forEach { command ->
            val result = runCommand(command, 5_000L)
            if (!result.success) {
                failures += "${command.substringBefore(" ||")}: ${result.output.ifBlank { "执行失败" }}"
            }
        }

        return if (failures.isEmpty()) {
            markProtectionEnabled(context, true)
            ProtectionResult(true, if (disableDeviceIdle) "Root 强保护已开启，并已停用系统 Device Idle" else "Root 强保护已开启")
        } else {
            markProtectionEnabled(context, false)
            ProtectionResult(false, failures.joinToString(separator = "\n"))
        }
    }

    fun isForceProtectionEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_ROOT_FORCE_PROTECTION_ENABLED, false)
    }

    private fun markProtectionEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ROOT_FORCE_PROTECTION_ENABLED, enabled)
            .apply()
    }

    private fun resolvePackageUid(packageName: String): String? {
        val result = runCommand("cmd package list packages -U $packageName", 3_000L)
        if (!result.success) return null
        return Regex("""uid:(\d+)""").find(result.output)?.groupValues?.getOrNull(1)
    }

    private fun runCommand(command: String, timeoutMs: Long): CommandResult {
        return try {
            val process = ProcessBuilder("su", "-c", command)
                .redirectErrorStream(true)
                .start()
            val completed = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS)
            if (!completed) {
                process.destroy()
                return CommandResult(false, "timeout")
            }
            val output = BufferedReader(InputStreamReader(process.inputStream)).use { reader ->
                reader.readLines().joinToString("\n").trim()
            }
            CommandResult(process.exitValue() == 0, output)
        } catch (exception: Exception) {
            CommandResult(false, exception.message ?: exception.javaClass.simpleName)
        }
    }

    private data class CommandResult(
        val success: Boolean,
        val output: String,
    )
}
