package com.silverlink.smsrelay.ui.records

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.silverlink.smsrelay.R
import com.silverlink.smsrelay.data.model.SmsRecord
import com.silverlink.smsrelay.data.model.UploadStatus
import com.silverlink.smsrelay.repository.SmsRelayRepository

class RecordsFragment : Fragment() {

    private lateinit var repository: SmsRelayRepository
    private lateinit var recordAdapter: RecordAdapter
    private var currentFilter: UploadStatus? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_records, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        repository = repositoryFactory?.invoke(requireContext()) ?: SmsRelayRepository(requireContext())

        setupFilterChips(view)
        setupRecordsList(view)
        loadRecords()
    }

    private fun setupFilterChips(view: View) {
        val chipGroup = view.findViewById<ChipGroup>(R.id.filterChipGroup)

        val filters = listOf(
            getString(R.string.filter_all) to null,
            getString(R.string.filter_uploaded) to UploadStatus.UPLOADED,
            getString(R.string.filter_failed) to UploadStatus.FAILED,
            getString(R.string.filter_pending) to UploadStatus.PENDING,
        )

        filters.forEachIndexed { index, (label, status) ->
            val chip = Chip(requireContext()).apply {
                text = label
                isCheckable = true
                isChecked = index == 0
                setOnClickListener {
                    currentFilter = status
                    loadRecords()
                }
            }
            chipGroup.addView(chip)
        }
    }

    private fun setupRecordsList(view: View) {
        recordAdapter = RecordAdapter(emptyList())
        val recyclerView = view.findViewById<RecyclerView>(R.id.recordsList)
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = recordAdapter
    }

    private fun loadRecords() {
        val records = if (currentFilter != null) {
            repository.getRecordsByStatus(currentFilter!!)
        } else {
            repository.getAllRecords()
        }
        recordAdapter.updateData(records)

        val emptyState = view?.findViewById<View>(R.id.emptyState)
        val recyclerView = view?.findViewById<RecyclerView>(R.id.recordsList)
        if (records.isEmpty()) {
            emptyState?.visibility = View.VISIBLE
            recyclerView?.visibility = View.GONE
        } else {
            emptyState?.visibility = View.GONE
            recyclerView?.visibility = View.VISIBLE
        }
    }

    inner class RecordAdapter(private var records: List<SmsRecord>) :
        RecyclerView.Adapter<RecordAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val sender: TextView = view.findViewById(R.id.recordSender)
            val body: TextView = view.findViewById(R.id.recordBody)
            val time: TextView = view.findViewById(R.id.recordTime)
            val status: TextView = view.findViewById(R.id.recordStatus)
            val advisory: TextView = view.findViewById(R.id.recordAdvisory)
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
            holder.advisory.isVisible = !record.advisoryMessage.isNullOrBlank()
            holder.advisory.text = record.advisoryMessage.orEmpty()
        }

        override fun getItemCount() = records.size

        fun updateData(newRecords: List<SmsRecord>) {
            records = newRecords
            notifyDataSetChanged()
        }

        private fun formatTime(timestamp: Long): String {
            return java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault())
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

    companion object {
        internal var repositoryFactory: ((android.content.Context) -> SmsRelayRepository)? = null

        internal fun resetTestHooks() {
            repositoryFactory = null
        }
    }
}
