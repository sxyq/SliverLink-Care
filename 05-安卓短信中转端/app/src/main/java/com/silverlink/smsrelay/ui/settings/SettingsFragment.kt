package com.silverlink.smsrelay.ui.settings

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
import com.silverlink.smsrelay.data.network.RelayEnrollmentStatus
import com.silverlink.smsrelay.data.network.isRelayDeviceRevoked
import com.silverlink.smsrelay.databinding.FragmentSettingsBinding
import com.silverlink.smsrelay.service.RelayServiceLauncher
import com.silverlink.smsrelay.util.BatteryOptimizationHelper
import com.silverlink.smsrelay.util.EnhancedProtectionHelper
import com.silverlink.smsrelay.util.NonRootKeepAliveHelper
import com.silverlink.smsrelay.util.RelayConfigSyncResolver
import com.silverlink.smsrelay.util.RootProtectionHelper
import com.silverlink.smsrelay.util.SmsPermissionHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.security.SecureRandom
import java.util.UUID

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!
    private lateinit var relayPreferences: RelayPreferences
    private val runtimeStatusHandler = Handler(Looper.getMainLooper())
    private val runtimeStatusRefresh = object : Runnable {
        override fun run() {
            if (!isResumed || isHidden) return
            refreshRuntimeStatus()
            runtimeStatusHandler.postDelayed(this, RUNTIME_STATUS_REFRESH_INTERVAL_MS)
        }
    }
    private val relayApiService by lazy { apiServiceFactory?.invoke() ?: RelayApiService(ApiClientFactory.create()) }
    private val smsPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        val granted = result.values.all { it }
        Toast.makeText(
            requireContext(),
            if (granted) getString(R.string.sms_permission_granted) else getString(R.string.sms_permission_denied),
            Toast.LENGTH_SHORT,
        ).show()
        view?.let { loadRuntimeStatus(it) }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        relayPreferences = preferencesFactory?.invoke(requireContext()) ?: RelayPreferences(requireContext())
        loadCurrentConfig()
        setupEnrollmentButtons()
        setupResetEnrollmentButton()
        setupPermissionButton()
        setupUnifiedKeepAliveButton()
        setupRootProtectionButton()
        setupSyncButton()
        loadRuntimeStatus(view)
    }

    override fun onResume() {
        super.onResume()
        if (::relayPreferences.isInitialized) {
            refreshRuntimeStatus()
            startRuntimeStatusRefresh()
        }
    }

    override fun onPause() {
        runtimeStatusHandler.removeCallbacks(runtimeStatusRefresh)
        super.onPause()
    }

    override fun onHiddenChanged(hidden: Boolean) {
        super.onHiddenChanged(hidden)
        if (hidden) {
            runtimeStatusHandler.removeCallbacks(runtimeStatusRefresh)
        } else if (isResumed && ::relayPreferences.isInitialized) {
            refreshRuntimeStatus()
            startRuntimeStatusRefresh()
        }
    }

    private fun startRuntimeStatusRefresh() {
        runtimeStatusHandler.removeCallbacks(runtimeStatusRefresh)
        if (!isHidden) {
            runtimeStatusHandler.postDelayed(runtimeStatusRefresh, RUNTIME_STATUS_REFRESH_INTERVAL_MS)
        }
    }

    private fun refreshRuntimeStatus() {
        val previousConfig = relayPreferences.readConfig()
        val previousEnrollment = relayPreferences.readEnrollmentState()
        // The foreground service and workers use separate encrypted preference readers.
        relayPreferences = preferencesFactory?.invoke(requireContext()) ?: RelayPreferences(requireContext())
        val currentConfig = relayPreferences.readConfig()
        val currentEnrollment = relayPreferences.readEnrollmentState()
        if (previousConfig.deviceId != currentConfig.deviceId ||
            previousEnrollment.status != currentEnrollment.status
        ) {
            loadCurrentConfig()
        }
        view?.let { loadRuntimeStatus(it) }
    }

    private fun loadCurrentConfig() {
        val config = relayPreferences.readConfig()
        val enrollment = relayPreferences.readEnrollmentState()
        binding.inputDeviceName.setText(enrollment.deviceName)
        binding.inputReceiverPhone.setText(config.receiverPhone)
        binding.inputServerUrl.setText(config.serverBaseUrl)
        binding.inputDeviceId.setText(config.deviceId)
        binding.inputDeviceSecret.setText(maskDeviceSecret(config.deviceSecret))
        binding.inputPrefixRule.setText(config.messagePrefix)
        updateEnrollmentUi()
    }

    private fun setupEnrollmentButtons() {
        binding.btnApplyEnrollment.setOnClickListener { submitEnrollmentRequest() }
        binding.btnRefreshEnrollment.setOnClickListener { refreshEnrollmentStatus() }
    }

    private fun setupResetEnrollmentButton() {
        binding.btnResetEnrollment.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle(R.string.enrollment_reset_title)
                .setMessage(R.string.enrollment_reset_message)
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton(R.string.enrollment_reset_confirm) { _, _ ->
                    serviceStopper?.invoke(requireContext()) ?: RelayServiceLauncher.stop(requireContext())
                    relayPreferences.clearDeviceEnrollment()
                    loadCurrentConfig()
                    Toast.makeText(requireContext(), R.string.enrollment_reset_done, Toast.LENGTH_SHORT).show()
                }
                .show()
        }
    }

    private fun submitEnrollmentRequest() {
        val serverUrl = com.silverlink.smsrelay.util.RelayServerUrlNormalizer.normalize(
            binding.inputServerUrl.text?.toString().orEmpty(),
        )
        val deviceName = binding.inputDeviceName.text?.toString().orEmpty().trim()
        val receiverPhone = binding.inputReceiverPhone.text?.toString().orEmpty().filter(Char::isDigit)
        val messagePrefix = binding.inputPrefixRule.text?.toString().orEmpty().trim().ifBlank { "SL" }
        if (deviceName.isBlank()) {
            Toast.makeText(requireContext(), getString(R.string.enrollment_name_required), Toast.LENGTH_SHORT).show()
            return
        }
        if (deviceName.length > 100) {
            Toast.makeText(requireContext(), getString(R.string.enrollment_name_too_long), Toast.LENGTH_SHORT).show()
            return
        }
        if (!receiverPhone.matches(Regex("1\\d{10}"))) {
            Toast.makeText(requireContext(), getString(R.string.enrollment_phone_required), Toast.LENGTH_SHORT).show()
            return
        }
        val validServerUrl = runCatching { java.net.URI(serverUrl) }.getOrNull()?.let { uri ->
            serverUrl.length <= 255
                    && uri.scheme.equals("https", ignoreCase = true)
                    && !uri.host.isNullOrBlank()
                    && uri.rawUserInfo == null
                    && uri.rawQuery == null
                    && uri.rawFragment == null
        } == true
        if (!validServerUrl) {
            Toast.makeText(requireContext(), getString(R.string.enrollment_server_https_required), Toast.LENGTH_SHORT).show()
            return
        }
        if (messagePrefix.length !in 1..32) {
            Toast.makeText(requireContext(), getString(R.string.enrollment_prefix_invalid), Toast.LENGTH_SHORT).show()
            return
        }

        val previous = relayPreferences.readEnrollmentState()
        val reuseDraft = previous.status == "SUBMISSION_FAILED"
                && previous.requestId.isNotBlank()
                && previous.requestToken.isNotBlank()
                && previous.deviceSecret.isNotBlank()
        val requestId = if (reuseDraft) previous.requestId else UUID.randomUUID().toString()
        val requestToken = if (reuseDraft) previous.requestToken else newEnrollmentSecret()
        val deviceSecret = if (reuseDraft) previous.deviceSecret else newEnrollmentSecret()
        if (!reuseDraft && !relayPreferences.supportsSecureEnrollmentCredentials()) {
            Toast.makeText(requireContext(), getString(R.string.enrollment_secure_storage_unavailable), Toast.LENGTH_SHORT).show()
            return
        }
        relayPreferences.saveConfig(serverUrl, "", "", receiverPhone, messagePrefix)
        runCatching { relayPreferences.saveEnrollmentDraft(requestId, requestToken, deviceSecret, deviceName) }
            .onFailure {
                Toast.makeText(requireContext(), getString(R.string.enrollment_secure_storage_unavailable), Toast.LENGTH_SHORT).show()
                return
            }
        updateEnrollmentUi()
        binding.btnApplyEnrollment.isEnabled = false
        binding.textEnrollmentStatus.setText(R.string.enrollment_submitting)

        viewLifecycleOwner.lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                relayApiService.submitEnrollmentRequest(
                    baseUrl = serverUrl,
                    requestId = requestId,
                    requestToken = requestToken,
                    deviceSecret = deviceSecret,
                    deviceName = deviceName,
                    receiverPhone = receiverPhone,
                    messagePrefix = messagePrefix,
                )
            }
            binding.btnApplyEnrollment.isEnabled = true
            result.onSuccess { handleEnrollmentStatus(it) }
                .onFailure {
                    relayPreferences.updateEnrollmentStatus("SUBMISSION_FAILED")
                    updateEnrollmentUi()
                    Toast.makeText(requireContext(), getString(R.string.enrollment_request_failed), Toast.LENGTH_SHORT).show()
                }
        }
    }

    private fun refreshEnrollmentStatus() {
        val enrollment = relayPreferences.readEnrollmentState()
        val config = relayPreferences.readConfig()
        if (enrollment.requestId.isBlank() || enrollment.requestToken.isBlank()) {
            updateEnrollmentUi()
            return
        }
        binding.btnRefreshEnrollment.isEnabled = false
        viewLifecycleOwner.lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                relayApiService.fetchEnrollmentStatus(config.serverBaseUrl, enrollment.requestId, enrollment.requestToken)
            }
            binding.btnRefreshEnrollment.isEnabled = true
            result.onSuccess { handleEnrollmentStatus(it) }
                .onFailure {
                    Toast.makeText(requireContext(), getString(R.string.enrollment_status_failed), Toast.LENGTH_SHORT).show()
                }
        }
    }

    private fun handleEnrollmentStatus(status: RelayEnrollmentStatus) {
        when (status.status.uppercase()) {
            "PENDING" -> relayPreferences.updateEnrollmentStatus("PENDING")
            "APPROVED" -> {
                val enrollment = relayPreferences.readEnrollmentState()
                if (status.deviceId.isBlank() || enrollment.deviceSecret.isBlank()) {
                    relayPreferences.updateEnrollmentStatus("SUBMISSION_FAILED")
                    Toast.makeText(requireContext(), getString(R.string.enrollment_status_failed), Toast.LENGTH_SHORT).show()
                } else {
                    val config = relayPreferences.readConfig()
                    relayPreferences.saveConfig(
                        serverBaseUrl = config.serverBaseUrl,
                        deviceId = status.deviceId,
                        deviceSecret = enrollment.deviceSecret,
                        receiverPhone = config.receiverPhone,
                        messagePrefix = config.messagePrefix,
                    )
                    relayPreferences.updateEnrollmentStatus("ACTIVE")
                    serviceStarter?.invoke(requireContext(), true)
                        ?: RelayServiceLauncher.start(requireContext(), immediateHeartbeat = true)
                    Toast.makeText(requireContext(), getString(R.string.enrollment_approved), Toast.LENGTH_SHORT).show()
                }
            }
            "REJECTED", "EXPIRED" -> relayPreferences.updateEnrollmentStatus(status.status.uppercase(), status.reviewReason)
            else -> relayPreferences.updateEnrollmentStatus("SUBMISSION_FAILED")
        }
        loadCurrentConfig()
        view?.let { loadRuntimeStatus(it) }
    }

    private fun updateEnrollmentUi() {
        val config = relayPreferences.readConfig()
        val enrollment = relayPreferences.readEnrollmentState()
        val registered = config.deviceId.isNotBlank() && config.deviceSecret.isNotBlank()
        val waitingForReview = enrollment.status == "PENDING" || enrollment.status == "SUBMITTING"
        val canRetrySubmission = enrollment.status == "SUBMISSION_FAILED"
        val revoked = enrollment.status == "REVOKED"
        val isNewDevice = !registered
        val showApplicationFields = isNewDevice && !waitingForReview
        val showApprovedCredentials = registered && !revoked

        binding.inputLayoutDeviceName.visibility = if (showApplicationFields) View.VISIBLE else View.GONE
        binding.inputLayoutReceiverPhone.visibility = if (showApplicationFields) View.VISIBLE else View.GONE
        binding.inputLayoutServerUrl.visibility = if (showApplicationFields) View.VISIBLE else View.GONE
        binding.inputLayoutPrefixRule.visibility = if (showApplicationFields) View.VISIBLE else View.GONE
        binding.inputLayoutDeviceId.visibility = if (showApprovedCredentials) View.VISIBLE else View.GONE
        binding.inputLayoutDeviceSecret.visibility = if (showApprovedCredentials) View.VISIBLE else View.GONE
        binding.btnSyncConfig.visibility = if (registered && !revoked) View.VISIBLE else View.GONE
        binding.btnResetEnrollment.visibility = if (registered) View.VISIBLE else View.GONE
        binding.btnApplyEnrollment.visibility = if (isNewDevice && (enrollment.status.isBlank() || enrollment.status == "REJECTED" || enrollment.status == "EXPIRED" || canRetrySubmission)) View.VISIBLE else View.GONE
        binding.btnRefreshEnrollment.visibility = if (isNewDevice && (waitingForReview || canRetrySubmission)) View.VISIBLE else View.GONE
        binding.inputDeviceName.isEnabled = !waitingForReview && !canRetrySubmission
        binding.inputReceiverPhone.isEnabled = isNewDevice && !waitingForReview && !canRetrySubmission
        binding.inputServerUrl.isEnabled = isNewDevice && !waitingForReview && !canRetrySubmission
        binding.inputPrefixRule.isEnabled = isNewDevice && !waitingForReview && !canRetrySubmission
        binding.inputDeviceId.isEnabled = false
        binding.inputDeviceSecret.isEnabled = false

        binding.btnApplyEnrollment.setText(
            if (canRetrySubmission) R.string.enrollment_retry else R.string.enrollment_apply,
        )
        binding.textEnrollmentStatus.text = when {
            revoked -> getString(R.string.enrollment_revoked)
            registered && enrollment.status == "ACTIVE" -> getString(R.string.enrollment_active, config.deviceId)
            registered -> getString(R.string.enrollment_existing_device, config.deviceId)
            enrollment.status == "PENDING" -> getString(R.string.enrollment_pending)
            enrollment.status == "SUBMITTING" -> getString(R.string.enrollment_submitting)
            enrollment.status == "SUBMISSION_FAILED" -> getString(R.string.enrollment_submission_failed)
            enrollment.status == "REJECTED" -> getString(R.string.enrollment_rejected, enrollment.reviewReason.ifBlank { "未填写原因" })
            enrollment.status == "EXPIRED" -> getString(R.string.enrollment_expired)
            else -> getString(R.string.enrollment_not_applied)
        }
    }

    private fun newEnrollmentSecret(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun maskDeviceSecret(secret: String): String = if (secret.isBlank()) "" else "••••••••••••"

    private fun setupPermissionButton() {
        binding.btnRequestPermissions.setOnClickListener {
            smsPermissionLauncher.launch(SmsPermissionHelper.smsPermissions)
        }
    }

    private fun setupUnifiedKeepAliveButton() {
        binding.btnUnifiedKeepAlive.setOnClickListener {
            binding.btnUnifiedKeepAlive.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                val context = requireContext()
                val opened = EnhancedProtectionHelper.openNonRootEnhancedProtection(context)
                RelayServiceLauncher.setMediaKeepAlive(context, true)
                serviceStarter?.invoke(context, true) ?: RelayServiceLauncher.start(context, immediateHeartbeat = true)
                binding.btnUnifiedKeepAlive.isEnabled = true
                val message = if (opened) {
                    getString(R.string.unified_keepalive_enabled)
                } else {
                    getString(R.string.unified_keepalive_partial)
                }
                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
                view?.postDelayed({ view?.let { loadRuntimeStatus(it) } }, 800)
            }
        }
    }

    private fun setupRootProtectionButton() {
        binding.btnRootForceProtection.setOnClickListener {
            binding.btnRootForceProtection.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                val result = withContext(Dispatchers.IO) {
                    RootProtectionHelper.enableForceProtection(requireContext())
                }
                binding.btnRootForceProtection.isEnabled = true
                Toast.makeText(
                    requireContext(),
                    if (result.success) getString(R.string.root_protection_enabled) else "${getString(R.string.root_protection_failed)}：${result.message}",
                    Toast.LENGTH_LONG,
                ).show()
                view?.let { loadRuntimeStatus(it) }
            }
        }
    }

    private fun setupSyncButton() {
        binding.btnSyncConfig.setOnClickListener {
            val config = relayPreferences.readConfig()
            if (config.serverBaseUrl.isBlank() || config.deviceId.isBlank() || config.deviceSecret.isBlank()) {
                Toast.makeText(requireContext(), getString(R.string.config_sync_failed), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            binding.btnSyncConfig.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                val result = withContext(Dispatchers.IO) {
                    relayApiService.fetchDeviceConfig(config.serverBaseUrl, config.deviceId, config.deviceSecret)
                }
                binding.btnSyncConfig.isEnabled = true
                result.onSuccess { remote ->
                    val merged = RelayConfigSyncResolver.merge(config, RelayConfigSyncResolver.fromJson(remote))
                    relayPreferences.saveConfig(
                        serverBaseUrl = merged.serverBaseUrl,
                        deviceId = merged.deviceId,
                        deviceSecret = merged.deviceSecret,
                        receiverPhone = merged.receiverPhone,
                        messagePrefix = merged.messagePrefix,
                    )
                    serviceStarter?.invoke(requireContext(), true) ?: RelayServiceLauncher.start(requireContext(), immediateHeartbeat = true)
                    loadCurrentConfig()
                    view?.let { loadRuntimeStatus(it) }
                    Toast.makeText(requireContext(), getString(R.string.config_synced), Toast.LENGTH_SHORT).show()
                }.onFailure {
                    if (it.isRelayDeviceRevoked()) {
                        relayPreferences.markDeviceRevoked()
                        serviceStopper?.invoke(requireContext()) ?: RelayServiceLauncher.markDeviceRevoked(requireContext())
                        loadCurrentConfig()
                        view?.let { currentView -> loadRuntimeStatus(currentView) }
                        Toast.makeText(requireContext(), getString(R.string.enrollment_revoked), Toast.LENGTH_LONG).show()
                        return@onFailure
                    }
                    Toast.makeText(requireContext(), getString(R.string.config_sync_failed), Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun loadRuntimeStatus(view: View) {
        val config = relayPreferences.readConfig()
        val serviceState = relayPreferences.readServiceState()
        val isOnline = config.deviceId.isNotBlank()
                && config.deviceSecret.isNotBlank()
                && serviceState.statusText == getString(R.string.relay_service_online)
        val hasSmsPermissions = SmsPermissionHelper.hasSmsPermissions(requireContext())
        val batteryOptimizationReady = BatteryOptimizationHelper.isIgnoringBatteryOptimizations(requireContext())
        val exactAlarmReady = NonRootKeepAliveHelper.canScheduleExactAlarms(requireContext())
        val protectionSummary = EnhancedProtectionHelper.protectionSummary(requireContext())
        val nonRootProtectionReady = NonRootKeepAliveHelper.isAggressiveProtectionReady(requireContext())
        val mediaKeepAliveReady = relayPreferences.isMediaKeepAliveEnabled()
        val rootProtectionReady = RootProtectionHelper.isForceProtectionEnabled(requireContext())

        setConfigRow(view, R.id.rowDeviceStatus, getString(R.string.device_status_label),
            if (isOnline) getString(R.string.device_online) else getString(R.string.device_offline))
        setConfigRow(view, R.id.rowServiceStatus, getString(R.string.service_status_label), serviceState.statusText)
        setConfigRow(view, R.id.rowPermissionStatus, getString(R.string.permission_status_label),
            if (hasSmsPermissions) getString(R.string.sms_permission_ready) else getString(R.string.sms_permission_missing))
        setConfigRow(view, R.id.rowBatteryOptimization, getString(R.string.battery_optimization_label),
            if (batteryOptimizationReady) getString(R.string.battery_optimization_ready) else getString(R.string.battery_optimization_missing))
        setConfigRow(view, R.id.rowExactAlarm, getString(R.string.exact_alarm_label),
            if (exactAlarmReady) getString(R.string.exact_alarm_ready) else getString(R.string.exact_alarm_missing))
        setConfigRow(view, R.id.rowProtectionSummary, getString(R.string.protection_summary_label), protectionSummary)
        setConfigRow(view, R.id.rowNonRootProtection, getString(R.string.non_root_protection_label),
            if (nonRootProtectionReady) getString(R.string.non_root_protection_ready) else getString(R.string.non_root_protection_missing))
        setConfigRow(view, R.id.rowMediaKeepAlive, getString(R.string.media_keepalive_label),
            if (mediaKeepAliveReady) getString(R.string.media_keepalive_ready) else getString(R.string.media_keepalive_missing))
        setConfigRow(view, R.id.rowRootProtection, getString(R.string.root_protection_label),
            if (rootProtectionReady) getString(R.string.root_protection_ready) else getString(R.string.root_protection_missing))
        setConfigRow(view, R.id.rowLastHeartbeat, getString(R.string.last_heartbeat),
            relayPreferences.getLastHeartbeat())
        setConfigRow(view, R.id.rowLastSync, getString(R.string.last_sync_time),
            relayPreferences.getLastSyncTime())
        setConfigRow(view, R.id.rowVersion, getString(R.string.version_info),
            "v0.1.0")
    }

    private fun setConfigRow(parent: View, rowId: Int, label: String, value: String) {
        val row = parent.findViewById<View>(rowId) ?: return
        row.findViewById<TextView>(R.id.configRowLabel)?.text = label
        row.findViewById<TextView>(R.id.configRowValue)?.text = value
    }

    override fun onDestroyView() {
        runtimeStatusHandler.removeCallbacks(runtimeStatusRefresh)
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val RUNTIME_STATUS_REFRESH_INTERVAL_MS = 2_000L
        internal var preferencesFactory: ((android.content.Context) -> RelayPreferences)? = null
        internal var apiServiceFactory: (() -> RelayApiService)? = null
        internal var serviceStarter: ((android.content.Context, Boolean) -> Unit)? = null
        internal var serviceStopper: ((android.content.Context) -> Unit)? = null

        internal fun resetTestHooks() {
            preferencesFactory = null
            apiServiceFactory = null
            serviceStarter = null
            serviceStopper = null
        }
    }
}
