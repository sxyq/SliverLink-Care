package com.silverlink.smsrelay.ui.overview

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.local.RelayPreferences
import com.silverlink.smsrelay.data.model.SmsRecord
import com.silverlink.smsrelay.data.model.UploadStatus
import com.silverlink.smsrelay.repository.SmsRelayRepository

class OverviewFragment : Fragment() {

    private lateinit var relayPreferences: RelayPreferences
    private lateinit var repository: SmsRelayRepository
    private lateinit var recentSmsAdapter: RecentSmsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_overview, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        relayPreferences = RelayPreferences(requireContext())
        repository = SmsRelayRepository(requireContext())

        setupDeviceStatus(view)
        setupConfigCards(view)
        setupMetrics(view)
        setupRecentSms(view)
    }

    override fun onResume() {
        super.onResume()
        if (::relayPreferences.isInitialized) {
            view?.let { refreshData(it) }
        }
    }

    private fun refreshData(view: View) {
        setupDeviceStatus(view)
        setupConfigCards(view)
        setupMetrics(view)
        setupRecentSms(view)
    }

    private fun setupDeviceStatus(view: View) {
        val indicator = view.findViewById<View>(R.id.onlineIndicator)
        val statusText = view.findViewById<TextView>(R.id.deviceStatusText)
        val serviceStatusText = view.findViewById<TextView>(R.id.serviceStatusText)
        val isOnline = relayPreferences.readConfig().serverBaseUrl.isNotBlank()
        val serviceState = relayPreferences.readServiceState()
        if (isOnline) {
            indicator.setBackgroundResource(R.drawable.circle_green)
            statusText.text = getString(R.string.device_online)
            statusText.setTextColor(resources.getColor(R.color.sl_success, null))
        } else {
            indicator.setBackgroundResource(R.drawable.circle_red)
            statusText.text = getString(R.string.device_offline)
            statusText.setTextColor(resources.getColor(R.color.sl_error, null))
        }
        serviceStatusText.text = serviceState.statusText
        serviceStatusText.setTextColor(
            resources.getColor(
                if (serviceState.running) R.color.sl_primary else R.color.sl_text_secondary,
                null,
            ),
        )
    }

    private fun setupConfigCards(view: View) {
        val config = relayPreferences.readConfig()

        setConfigRow(view, R.id.rowReceiverPhone, getString(R.string.receiver_phone_label),
            config.receiverPhone.ifBlank { getString(R.string.not_configured) })
        setConfigRow(view, R.id.rowServerUrl, getString(R.string.server_url_label),
            config.serverBaseUrl.ifBlank { getString(R.string.not_configured) })
        setConfigRow(view, R.id.rowDeviceId, getString(R.string.device_id_label),
            config.deviceId.ifBlank { getString(R.string.not_configured) })
        setConfigRow(view, R.id.rowDeviceSecret, getString(R.string.device_secret_label),
            if (config.deviceSecret.isNotBlank()) getString(R.string.secret_masked) else getString(R.string.not_configured))

        view.findViewById<TextView>(R.id.prefixRuleValue)?.text =
            config.messagePrefix.ifBlank { "SL" }
    }

    private fun setConfigRow(parent: View, rowId: Int, label: String, value: String) {
        val row = parent.findViewById<View>(rowId) ?: return
        row.findViewById<TextView>(R.id.configRowLabel)?.text = label
        row.findViewById<TextView>(R.id.configRowValue)?.text = value
    }

    private fun setupMetrics(view: View) {
        val stats = repository.getTodayStats()
        setMetric(view, R.id.metricReceived, getString(R.string.today_received), stats.received.toString())
        setMetric(view, R.id.metricSuccess, getString(R.string.upload_success), stats.uploaded.toString())
        setMetric(view, R.id.metricFailed, getString(R.string.upload_failed), stats.failed.toString())
        setMetric(view, R.id.metricPending, getString(R.string.pending_retry), stats.pending.toString())
        setMetric(view, R.id.metricLastSync, getString(R.string.last_sync), relayPreferences.getLastSyncTime())
        setMetric(view, R.id.metricUptime, getString(R.string.uptime), relayPreferences.getUptime())
    }

    private fun setMetric(parent: View, metricId: Int, label: String, value: String) {
        val metric = parent.findViewById<View>(metricId) ?: return
        metric.findViewById<TextView>(R.id.metricLabel)?.text = label
        metric.findViewById<TextView>(R.id.metricValue)?.text = value
    }

    private fun setupRecentSms(view: View) {
        val records = repository.getRecentRecords(5)
        val emptyView = view.findViewById<TextView>(R.id.emptyRecentSms)
        val recyclerView = view.findViewById<RecyclerView>(R.id.recentSmsList)

        if (records.isEmpty()) {
            emptyView?.visibility = View.VISIBLE
            recyclerView?.visibility = View.GONE
        } else {
            emptyView?.visibility = View.GONE
            recyclerView?.visibility = View.VISIBLE
            recentSmsAdapter = RecentSmsAdapter(records)
            recyclerView?.layoutManager = LinearLayoutManager(requireContext())
            recyclerView?.adapter = recentSmsAdapter
        }
    }

    inner class RecentSmsAdapter(private val records: List<SmsRecord>) :
        RecyclerView.Adapter<RecentSmsAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val sender: TextView = view.findViewById(R.id.recordSender)
            val body: TextView = view.findViewById(R.id.recordBody)
            val time: TextView = view.findViewById(R.id.recordTime)
            val status: TextView = view.findViewById(R.id.recordStatus)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_record, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val record = records[position]
            holder.sender.text = record.senderPhone
            holder.body.text = record.messageBody
            holder.time.text = formatTime(record.receivedAt)
            bindStatus(holder.status, record.status)
        }

        override fun getItemCount() = records.size

        private fun formatTime(timestamp: Long): String {
            return java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
                .format(java.util.Date(timestamp))
        }

        private fun bindStatus(textView: TextView, status: UploadStatus) {
            when (status) {
                UploadStatus.UPLOADED -> {
                    textView.text = getString(R.string.status_uploaded)
                    textView.setTextColor(resources.getColor(R.color.sl_success, null))
                    textView.setBackgroundResource(R.color.sl_success_bg)
                }
                UploadStatus.FAILED -> {
                    textView.text = getString(R.string.status_failed)
                    textView.setTextColor(resources.getColor(R.color.sl_error, null))
                    textView.setBackgroundResource(R.color.sl_error_bg)
                }
                UploadStatus.PENDING, UploadStatus.RETRYING -> {
                    textView.text = getString(R.string.status_pending)
                    textView.setTextColor(resources.getColor(R.color.sl_warning, null))
                    textView.setBackgroundResource(R.color.sl_warning_bg)
                }
            }
        }
    }
}
