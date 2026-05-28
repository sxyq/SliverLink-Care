package com.silverlink.care.infrastructure.cache;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SimpleTtlCacheTest {

    @Test
    void putGetExpireInvalidateAndClearWork() throws Exception {
        SimpleTtlCache<String, String> cache = new SimpleTtlCache<>();

        cache.put("key", "value", 20L);
        assertEquals("value", cache.get("key"));

        Thread.sleep(30L);
        assertNull(cache.get("key"));

        cache.put("another", "item", 1000L);
        cache.invalidate("another");
        assertNull(cache.get("another"));

        cache.put("a", "1", 1000L);
        cache.put("b", "2", 1000L);
        cache.clear();
        assertNull(cache.get("a"));
        assertNull(cache.get("b"));
    }

    @Test
    void putWithInvalidArgumentsRemovesEntry() {
        SimpleTtlCache<String, String> cache = new SimpleTtlCache<>();
        cache.put("key", "value", 1000L);

        cache.put("key", null, 1000L);
        assertNull(cache.get("key"));

        cache.put("key", "value", 0L);
        assertNull(cache.get("key"));

        cache.put(null, "value", 1000L);
        assertNull(cache.get(null));
    }

    @Test
    void getOrLoadCachesValueAndHandlesNullInputs() {
        SimpleTtlCache<String, String> cache = new SimpleTtlCache<>();
        AtomicInteger loads = new AtomicInteger();

        String first = cache.getOrLoad("key", 1000L, () -> {
            loads.incrementAndGet();
            return "loaded";
        });
        String second = cache.getOrLoad("key", 1000L, () -> {
            loads.incrementAndGet();
            return "other";
        });

        assertEquals("loaded", first);
        assertEquals("loaded", second);
        assertEquals(1, loads.get());

        assertEquals("fallback", cache.getOrLoad(null, 1000L, () -> "fallback"));
        assertNull(cache.getOrLoad("key2", 1000L, null));
    }

    @Test
    void getOrLoadEntryUsesLoadedValueTtlAndNullFallbacks() {
        SimpleTtlCache<String, String> cache = new SimpleTtlCache<>();
        AtomicInteger loads = new AtomicInteger();

        String first = cache.getOrLoadEntry("entry", () -> {
            loads.incrementAndGet();
            return new SimpleTtlCache.LoadedValue<>("value", 1000L);
        });
        String second = cache.getOrLoadEntry("entry", () -> {
            loads.incrementAndGet();
            return new SimpleTtlCache.LoadedValue<>("other", 1000L);
        });

        assertEquals("value", first);
        assertEquals("value", second);
        assertEquals(1, loads.get());

        assertEquals("direct", cache.getOrLoadEntry(null, () -> new SimpleTtlCache.LoadedValue<>("direct", 1000L)));
        assertNull(cache.getOrLoadEntry("missing", () -> null));
        assertNull(cache.getOrLoadEntry("missing", null));
    }
}
