package com.silverlink.care.common;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CursorCodecTest {

    @Test
    void roundTripsUrlSafeCursorFields() {
        String cursor = CursorCodec.encode(Map.of("time", "2026-07-18T14:00:00.000Z", "id", "id_/+safe"));

        assertEquals("2026-07-18T14:00:00.000Z", CursorCodec.decode(cursor).get("time"));
        assertEquals("id_/+safe", CursorCodec.decode(cursor).get("id"));
    }

    @Test
    void rejectsMalformedCursor() {
        assertThrows(BizException.class, () -> CursorCodec.decode("not a cursor"));
    }
}
