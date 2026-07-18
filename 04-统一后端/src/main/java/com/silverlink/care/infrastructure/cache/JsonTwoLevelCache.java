package com.silverlink.care.infrastructure.cache;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Service
public class JsonTwoLevelCache {

    private final SimpleTtlCache<String, String> localCache = new SimpleTtlCache<>();
    private final Map<String, Object> keyLocks = new ConcurrentHashMap<>();
    private final StringRedisTemplate redisTemplate;

    @Value("${silverlink.cache.redis.enabled:false}")
    private boolean redisEnabled;

    @Value("${silverlink.cache.redis.prefix:silverlink:cache:}")
    private String redisKeyPrefix;

    public JsonTwoLevelCache(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    public String getOrLoad(String key, long ttlMillis, Supplier<String> loader) {
        return getOrLoad(key, ttlMillis, ttlMillis, loader);
    }

    public String getOrLoad(String key, long localTtlMillis, long redisTtlMillis, Supplier<String> loader) {
        if (key == null || loader == null) {
            return loader == null ? null : loader.get();
        }
        String cached = get(key);
        if (cached != null) {
            return cached;
        }
        Object lock = keyLocks.computeIfAbsent(key, ignored -> new Object());
        synchronized (lock) {
            try {
                cached = get(key);
                if (cached != null) {
                    return cached;
                }
                String loaded = loader.get();
                put(key, loaded, localTtlMillis, redisTtlMillis);
                return loaded;
            } finally {
                keyLocks.remove(key, lock);
            }
        }
    }

    public String get(String key) {
        String local = localCache.get(key);
        if (local != null) {
            return local;
        }
        if (!isRedisAvailable() || key == null) {
            return null;
        }
        try {
            String remote = redisTemplate.opsForValue().get(fullKey(key));
            if (remote != null) {
                localCache.put(key, remote, 1_000L);
            }
            return remote;
        } catch (Exception ignored) {
            return null;
        }
    }

    public void put(String key, String value, long ttlMillis) {
        put(key, value, ttlMillis, ttlMillis);
    }

    public void put(String key, String value, long localTtlMillis, long redisTtlMillis) {
        if (key == null || value == null || localTtlMillis <= 0L || redisTtlMillis <= 0L) {
            invalidate(key);
            return;
        }
        localCache.put(key, value, localTtlMillis);
        if (!isRedisAvailable()) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(fullKey(key), value, Duration.ofMillis(redisTtlMillis));
        } catch (Exception ignored) {
            // Fall back to local cache only when Redis is unavailable.
        }
    }

    public void invalidate(String key) {
        if (key == null) {
            return;
        }
        localCache.invalidate(key);
        if (!isRedisAvailable()) {
            return;
        }
        try {
            redisTemplate.delete(fullKey(key));
        } catch (Exception ignored) {
            // Local invalidation already happened.
        }
    }

    private boolean isRedisAvailable() {
        return redisEnabled && redisTemplate != null;
    }

    private String fullKey(String key) {
        return redisKeyPrefix + key;
    }
}
