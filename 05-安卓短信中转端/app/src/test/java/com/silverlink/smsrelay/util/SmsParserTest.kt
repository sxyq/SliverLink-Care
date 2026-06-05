package com.silverlink.smsrelay.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsParserTest {

    @Test
    fun `matches configured prefix and extracts code`() {
        val parsed = SmsParser.parse("SL 123456", "SL")

        assertTrue(parsed.matched)
        assertEquals("SL", parsed.prefix)
        assertEquals("123456", parsed.code)
    }

    @Test
    fun `matches alphanumeric verification token from unified backend`() {
        val parsed = SmsParser.parse("SL XG8YLNM4AH", "SL")

        assertTrue(parsed.matched)
        assertEquals("SL", parsed.prefix)
        assertEquals("XG8YLNM4AH", parsed.code)
    }

    @Test
    fun `rejects non matching message`() {
        val parsed = SmsParser.parse("hello world", "SL")

        assertFalse(parsed.matched)
        assertEquals(null, parsed.code)
    }
}
