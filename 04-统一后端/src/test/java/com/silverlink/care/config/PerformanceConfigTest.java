package com.silverlink.care.config;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PerformanceConfigTest {

    @Test
    void auditLogExecutorUsesExpectedPoolAndThreadFactory() throws Exception {
        PerformanceConfig config = new PerformanceConfig();

        Executor executor = config.auditLogExecutor();
        ThreadPoolExecutor pool = (ThreadPoolExecutor) executor;

        assertEquals(4, pool.getCorePoolSize());
        assertEquals(8, pool.getMaximumPoolSize());
        assertEquals(8192, pool.getQueue().remainingCapacity() + pool.getQueue().size());

        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> threadName = new AtomicReference<>();
        AtomicBoolean daemon = new AtomicBoolean(false);

        pool.execute(() -> {
            threadName.set(Thread.currentThread().getName());
            daemon.set(Thread.currentThread().isDaemon());
            latch.countDown();
        });

        assertTrue(latch.await(3, TimeUnit.SECONDS));
        assertTrue(threadName.get().startsWith("silverlink-audit-"));
        assertTrue(daemon.get());

        pool.shutdownNow();
    }
}
