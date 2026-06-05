package com.silverlink.care.module.audit;

import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AuditLogService {

    private static final String[] IP_HEADER_CANDIDATES = {
            "X-Forwarded-For",
            "X-Real-IP",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_CLIENT_IP"
    };

    private final SilverLinkDataService data;
    private final Executor auditLogExecutor;
    private final ConcurrentLinkedQueue<SilverLinkDataService.AuditLogWrite> pendingWrites = new ConcurrentLinkedQueue<>();
    private final AtomicInteger pendingWriteCount = new AtomicInteger();
    private final AtomicBoolean flushRunning = new AtomicBoolean(false);

    @Value("${silverlink.audit.batch-size:64}")
    private int batchSize = 64;

    public AuditLogService(SilverLinkDataService data) {
        this(data, Runnable::run);
    }

    @Autowired
    public AuditLogService(SilverLinkDataService data, @Qualifier("auditLogExecutor") Executor auditLogExecutor) {
        this.data = data;
        this.auditLogExecutor = auditLogExecutor;
    }

    public List<AuditLogEntity> listAll() {
        return toEntities(data.auditLogs(null, null, null));
    }

    public List<AuditLogEntity> filter(String operator, String action, String result) {
        return toEntities(data.auditLogs(operator, action, result));
    }

    public void record(String operator, String role, String ip, String target, String action, String result, String failReason, String requestId) {
        enqueue(buildWrite(operator, role, ip, target, action, result, failReason, requestId, "", "", "", ""));
    }

    public void record(
            String operator,
            String role,
            String ip,
            String target,
            String action,
            String result,
            String failReason,
            String requestId,
            String verificationMethod,
            String visitorName,
            String visitorPhone,
            String visitorIdCard
    ) {
        enqueue(buildWrite(
                operator,
                role,
                ip,
                target,
                action,
                result,
                failReason,
                requestId,
                verificationMethod,
                visitorName,
                visitorPhone,
                visitorIdCard
        ));
    }

    public void record(String operator, String role, HttpServletRequest request, String target, String action, String result, String failReason, String requestId) {
        record(operator, role, resolveClientIp(request), target, action, result, failReason, requestId);
    }

    public void record(
            String operator,
            String role,
            HttpServletRequest request,
            String target,
            String action,
            String result,
            String failReason,
            String requestId,
            String verificationMethod,
            String visitorName,
            String visitorPhone,
            String visitorIdCard
    ) {
        record(
                operator,
                role,
                resolveClientIp(request),
                target,
                action,
                result,
                failReason,
                requestId,
                verificationMethod,
                visitorName,
                visitorPhone,
                visitorIdCard
        );
    }

    public String operatorOf(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "anonymous";
        }
        return authentication.getName();
    }

    public String roleOf(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null || authentication.getAuthorities().isEmpty()) {
            return "UNKNOWN";
        }
        GrantedAuthority authority = authentication.getAuthorities().iterator().next();
        if (authority == null || authority.getAuthority() == null) {
            return "UNKNOWN";
        }
        return authority.getAuthority().replace("ROLE_", "");
    }

    public void record(Authentication authentication, String ip, String target, String action, String result) {
        record(operatorOf(authentication), roleOf(authentication), ip, target, action, result, null, null);
    }

    public void record(Authentication authentication, HttpServletRequest request, String target, String action, String result) {
        record(authentication, resolveClientIp(request), target, action, result);
    }

    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "";
        }
        for (String header : IP_HEADER_CANDIDATES) {
            String value = request.getHeader(header);
            String resolved = firstIp(value);
            if (!resolved.isBlank()) {
                return resolved;
            }
        }
        return data.str(request.getRemoteAddr());
    }

    private String firstIp(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        for (String part : raw.split(",")) {
            String candidate = part == null ? "" : part.trim();
            if (!candidate.isBlank() && !"unknown".equalsIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return "";
    }

    private void dispatch(Runnable runnable) {
        try {
            auditLogExecutor.execute(runnable);
        } catch (RuntimeException ex) {
            runnable.run();
        }
    }

    @Scheduled(fixedDelayString = "${silverlink.audit.flush-interval-ms:150}")
    public void flushPendingScheduled() {
        if (pendingWriteCount.get() > 0) {
            flushPending();
        }
    }

    private void enqueue(SilverLinkDataService.AuditLogWrite write) {
        pendingWrites.add(write);
        int current = pendingWriteCount.incrementAndGet();
        if (current >= Math.max(1, batchSize)) {
            dispatch(this::flushPending);
        }
    }

    private void flushPending() {
        if (!flushRunning.compareAndSet(false, true)) {
            return;
        }
        try {
            int targetBatchSize = Math.max(1, batchSize);
            List<SilverLinkDataService.AuditLogWrite> batch = new ArrayList<>(targetBatchSize);
            while (drainBatch(batch, targetBatchSize) > 0) {
                try {
                    data.recordAuditBatch(batch);
                } catch (RuntimeException ex) {
                    for (SilverLinkDataService.AuditLogWrite item : batch) {
                        data.recordAudit(
                                item.operator(),
                                item.role(),
                                item.ip(),
                                item.target(),
                                item.action(),
                                item.result(),
                                item.failReason(),
                                item.requestId(),
                                item.verificationMethod(),
                                item.visitorName(),
                                item.visitorPhone(),
                                item.visitorIdCard()
                        );
                    }
                }
                batch.clear();
                if (pendingWriteCount.get() < targetBatchSize) {
                    break;
                }
            }
        } finally {
            flushRunning.set(false);
            if (pendingWriteCount.get() > 0) {
                dispatch(this::flushPending);
            }
        }
    }

    private int drainBatch(List<SilverLinkDataService.AuditLogWrite> batch, int targetBatchSize) {
        while (batch.size() < targetBatchSize) {
            SilverLinkDataService.AuditLogWrite write = pendingWrites.poll();
            if (write == null) {
                break;
            }
            pendingWriteCount.decrementAndGet();
            batch.add(write);
        }
        return batch.size();
    }

    private SilverLinkDataService.AuditLogWrite buildWrite(
            String operator,
            String role,
            String ip,
            String target,
            String action,
            String result,
            String failReason,
            String requestId,
            String verificationMethod,
            String visitorName,
            String visitorPhone,
            String visitorIdCard
    ) {
        return new SilverLinkDataService.AuditLogWrite(
                java.time.Instant.now().toString(),
                operator,
                role,
                ip,
                target,
                action,
                verificationMethod,
                visitorName,
                visitorPhone,
                visitorIdCard,
                result,
                failReason,
                requestId
        );
    }

    private List<AuditLogEntity> toEntities(List<Map<String, Object>> rows) {
        List<AuditLogEntity> list = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            AuditLogEntity log = new AuditLogEntity();
            log.setId(data.str(row.get("id")));
            log.setTime(data.str(row.get("time")));
            log.setOperator(data.str(row.get("operator")));
            log.setRole(data.str(row.get("role")));
            log.setSourceIp(data.str(row.get("sourceIp")));
            log.setTarget(data.str(row.get("target")));
            log.setAction(data.str(row.get("action")));
            log.setVerificationMethod(data.str(row.get("verificationMethod")));
            log.setVisitorName(data.str(row.get("visitorName")));
            log.setVisitorPhone(data.str(row.get("visitorPhone")));
            log.setVisitorPhoneMasked(data.str(row.get("visitorPhoneMasked")));
            log.setVisitorIdCard(data.str(row.get("visitorIdCard")));
            log.setVisitorIdCardMasked(data.str(row.get("visitorIdCardMasked")));
            log.setResult(data.str(row.get("result")));
            log.setFailReason(data.str(row.get("failReason")));
            log.setRequestId(data.str(row.get("requestId")));
            list.add(log);
        }
        return list;
    }
}
