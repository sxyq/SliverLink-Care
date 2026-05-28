package com.silverlink.care.infrastructure.cache;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JsonTwoLevelCacheTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private JsonTwoLevelCache cache;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(redisTemplate);

        cache = new JsonTwoLevelCache(provider);
        ReflectionTestUtils.setField(cache, "redisEnabled", true);
        ReflectionTestUtils.setField(cache, "redisKeyPrefix", "silverlink:test:");
    }

    @Test
    void getOrLoadUsesLocalCacheBeforeRedis() {
        AtomicInteger loads = new AtomicInteger();

        String first = cache.getOrLoad("demo", 1000L, () -> {
            loads.incrementAndGet();
            return "payload";
        });
        String second = cache.getOrLoad("demo", 1000L, () -> {
            loads.incrementAndGet();
            return "other";
        });

        assertEquals("payload", first);
        assertEquals("payload", second);
        assertEquals(1, loads.get());
        verify(valueOperations).set(eq("silverlink:test:demo"), eq("payload"), eq(Duration.ofMillis(1000L)));
    }

    @Test
    void getBackfillsFromRedisAndInvalidateDeletesRemoteKey() {
        when(valueOperations.get("silverlink:test:remote")).thenReturn("redis-value", null);

        assertEquals("redis-value", cache.get("remote"));
        assertEquals("redis-value", cache.get("remote"));
        verify(valueOperations).get("silverlink:test:remote");

        cache.invalidate("remote");
        verify(redisTemplate).delete("silverlink:test:remote");
        assertNull(cache.get("remote"));
    }

    @Test
    void invalidPutAndDisabledRedisStaySafe() {
        cache.put("drop", "value", 1000L);
        cache.put("drop", null, 1000L);
        assertNull(cache.get("drop"));

        ReflectionTestUtils.setField(cache, "redisEnabled", false);
        cache.put("local-only", "value", 1000L);
        assertEquals("value", cache.get("local-only"));
        verify(valueOperations, never()).set(eq("silverlink:test:local-only"), eq("value"), any(Duration.class));
    }

    @Test
    void redisFailuresFallBackToLocalCache() {
        doThrow(new RuntimeException("redis down"))
                .when(valueOperations)
                .set(eq("silverlink:test:unstable"), eq("value"), eq(Duration.ofMillis(1000L)));
        doThrow(new RuntimeException("redis down"))
                .when(redisTemplate)
                .delete("silverlink:test:unstable");

        cache.put("unstable", "value", 1000L);
        assertEquals("value", cache.get("unstable"));

        cache.invalidate("unstable");
        assertNull(cache.get("unstable"));
        assertTrue(Mockito.mockingDetails(redisTemplate).isMock());
    }
}
