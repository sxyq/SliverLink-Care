package com.silverlink.smsrelay.ui.settings

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.network.ApiClientFactory
import com.silverlink.smsrelay.data.network.RelayApiService
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

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!
    private lateinit var relayPreferences: RelayPreferences
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
        setupSaveButton()
        setupPermissionButton()
        setupUnifiedKeepAliveButton()
        setupRootProtectionButton()
        setupSyncButton()
        loadRuntimeStatus(view)
    }

    override fun onResume() {
        super.onResume()
        view?.let { loadRuntimeStatus(it) }
    }

    private fun loadCurrentConfig() {
        val config = relayPreferences.readConfig()
        binding.inputReceiverPhone.setText(config.receiverPhone)
        binding.inputServerUrl.setText(config.serverBaseUrl)
        binding.inputDeviceId.setText(config.deviceId)
        binding.inputDeviceSecret.setText(config.deviceSecret)
        binding.inputPrefixRule.setText(config.messagePrefix)
    }

    private fun setupSaveButton() {
        binding.btnSaveConfig.setOnClickListener {
            relayPreferences.saveConfig(
                serverBaseUrl = binding.inputServerUrl.text?.toString().orEmpty().trim(),
                deviceId = binding.inputDeviceId.text?.toString().orEmpty().trim(),
                deviceSecret = binding.inputDeviceSecret.text?.toString().orEmpty().trim(),
                receiverPhone = binding.inputReceiverPhone.text?.toString().orEmpty().trim(),
                messagePrefix = binding.inputPrefixRule.text?.toString().orEmpty().trim(),
            )
            serviceStarter?.invoke(requireContext(), true) ?: RelayServiceLauncher.start(requireContext(), immediateHeartbeat = true)
            Toast.makeText(requireContext(), getString(R.string.config_saved), Toast.LENGTH_SHORT).show()
            view?.let { loadRuntimeStatus(it) }
        }
    }

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
                    Toast.makeText(requireContext(), getString(R.string.config_sync_failed), Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun loadRuntimeStatus(view: View) {
        val config = relayPreferences.readConfig()
        val isOnline = config.serverBaseUrl.isNotBlank()
        val hasSmsPermissions = SmsPermissionHelper.hasSmsPermissions(requireContext())
        val batteryOptimizationReady = BatteryOptimizationHelper.isIgnoringBatteryOptimizations(requireContext())
        val exactAlarmReady = NonRootKeepAliveHelper.canScheduleExactAlarms(requireContext())
        val serviceState = relayPreferences.readServiceState()
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
        super.onDestroyView()
        _binding = null
    }

    companion object {
        internal var preferencesFactory: ((android.content.Context) -> RelayPreferences)? = null
        internal var apiServiceFactory: (() -> RelayApiService)? = null
        internal var serviceStarter: ((android.content.Context, Boolean) -> Unit)? = null

        internal fun resetTestHooks() {
            preferencesFactory = null
            apiServiceFactory = null
            serviceStarter = null
        }
    }
}
