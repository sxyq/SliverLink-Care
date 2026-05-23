package com.silverlink.smsrelay.ui.settings

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.databinding.FragmentSettingsBinding

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!
    private lateinit var relayPreferences: RelayPreferences

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        relayPreferences = RelayPreferences(requireContext())
        loadCurrentConfig()
        setupSaveButton()
        loadRuntimeStatus(view)
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
            Toast.makeText(requireContext(), getString(R.string.config_saved), Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadRuntimeStatus(view: View) {
        val config = relayPreferences.readConfig()
        val isOnline = config.serverBaseUrl.isNotBlank()

        setConfigRow(view, R.id.rowDeviceStatus, getString(R.string.device_status_label),
            if (isOnline) getString(R.string.device_online) else getString(R.string.device_offline))
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
}
