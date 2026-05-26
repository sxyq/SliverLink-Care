package com.silverlink.smsrelay.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RelayModelsTest {

    @Test
    fun smsRecordCopiesAllFields() {
        val record = SmsRecord(
            id = "sms-1",
            senderPhone = "13812345678",
            messageBody = "SL 123456",
            receivedAt = 1000L,
            status = UploadStatus.PENDING,
        )

        val uploaded = record.copy(status = UploadStatus.UPLOADED, uploadedAt = 2000L)

        assertEquals("sms-1", uploaded.id)
        assertEquals("13812345678", uploaded.senderPhone)
        assertEquals("SL 123456", uploaded.messageBody)
        assertEquals(1000L, uploaded.receivedAt)
        assertEquals(UploadStatus.UPLOADED, uploaded.status)
        assertEquals(2000L, uploaded.uploadedAt)
        assertNull(uploaded.failReason)
    }

    @Test
    fun deviceStatusStoresOnlineAndTimingFields() {
        val online = DeviceStatus(
            isOnline = true,
            lastHeartbeat = 10L,
            lastSync = 20L,
            uptimeStart = 1L,
        )
        val offline = online.copy(isOnline = false, lastHeartbeat = null)

        assertTrue(online.isOnline)
        assertEquals(10L, online.lastHeartbeat)
        assertEquals(20L, online.lastSync)
        assertEquals(1L, online.uptimeStart)
        assertFalse(offline.isOnline)
        assertNull(offline.lastHeartbeat)
    }

    @Test
    fun uploadStatusesExposeAllExpectedStates() {
        assertEquals(
            listOf("PENDING", "UPLOADED", "FAILED", "RETRYING"),
            UploadStatus.values().map { it.name },
        )
    }
}
