package com.silverlink.care.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.concurrent.Executor;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableScheduling
public class PerformanceConfig {

    @Bean(name = "auditLogExecutor", destroyMethod = "shutdown")
    public Executor auditLogExecutor() {
        return new ThreadPoolExecutor(
                4,
                8,
                60L,
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(8192),
                runnable -> {
                    Thread thread = new Thread(runnable);
                    thread.setName("silverlink-audit-" + thread.threadId());
                    thread.setDaemon(true);
                    return thread;
                },
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    @Bean(name = "auditExportExecutor", destroyMethod = "shutdown")
    public Executor auditExportExecutor() {
        return new ThreadPoolExecutor(
                1, 2, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(16),
                runnable -> {
                    Thread thread = new Thread(runnable);
                    thread.setName("silverlink-audit-export-" + thread.threadId());
                    thread.setDaemon(true);
                    return thread;
                },
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}
