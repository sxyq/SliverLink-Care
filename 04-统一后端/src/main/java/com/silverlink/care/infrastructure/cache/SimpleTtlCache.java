package com.silverlink.care.infrastructure.cache;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class SimpleTtlCache<K, V> {

    private final Map<K, CacheEntry<V>> entries = new ConcurrentHashMap<>();
    private final Map<K, Object> keyLocks = new ConcurrentHashMap<>();

    public V get(K key) {
        if (key == null) {
            return null;
        }
        CacheEntry<V> entry = entries.get(key);
        if (entry == null) {
            return null;
        }
        if (entry.expiresAtMillis() <= System.currentTimeMillis()) {
            entries.remove(key, entry);
            return null;
        }
        return entry.value();
    }

    public void put(K key, V value, long ttlMillis) {
        if (key == null) {
            return;
        }
        if (ttlMillis <= 0 || value == null) {
            entries.remove(key);
            return;
        }
        entries.put(key, new CacheEntry<>(value, System.currentTimeMillis() + ttlMillis));
    }

    public V getOrLoad(K key, long ttlMillis, Supplier<V> loader) {
        if (key == null || loader == null) {
            return loader == null ? null : loader.get();
        }
        V cached = get(key);
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
                V loaded = loader.get();
                put(key, loaded, ttlMillis);
                return loaded;
            } finally {
                keyLocks.remove(key, lock);
            }
        }
    }

    public V getOrLoadEntry(K key, Supplier<LoadedValue<V>> loader) {
        if (key == null || loader == null) {
            LoadedValue<V> loaded = loader == null ? null : loader.get();
            return loaded == null ? null : loaded.value();
        }
        V cached = get(key);
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
                LoadedValue<V> loaded = loader.get();
                if (loaded != null) {
                    put(key, loaded.value(), loaded.ttlMillis());
                    return loaded.value();
                }
                return null;
            } finally {
                keyLocks.remove(key, lock);
            }
        }
    }

    public void invalidate(K key) {
        if (key != null) {
            entries.remove(key);
        }
    }

    public void clear() {
        entries.clear();
    }

    public record LoadedValue<V>(V value, long ttlMillis) {}

    private record CacheEntry<V>(V value, long expiresAtMillis) {}
}
