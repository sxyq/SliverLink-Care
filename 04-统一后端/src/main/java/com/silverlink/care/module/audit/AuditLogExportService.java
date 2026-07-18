package com.silverlink.care.module.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silverlink.care.common.BizException;
import com.silverlink.care.common.CursorPage;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Instant;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executor;

@Service
public class AuditLogExportService {
    private static final Set<PosixFilePermission> OWNER_ONLY = EnumSet.of(
            PosixFilePermission.OWNER_READ,
            PosixFilePermission.OWNER_WRITE,
            PosixFilePermission.OWNER_EXECUTE
    );

    private final JdbcTemplate jdbc;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final Executor exportExecutor;

    @Value("${silverlink.audit.export-dir:/tmp/silverlink-care/audit-exports}")
    private String exportDirectory;

    private Path exportRoot;

    public AuditLogExportService(
            JdbcTemplate jdbc,
            AuditLogService auditLogService,
            ObjectMapper objectMapper,
            @Qualifier("auditExportExecutor") Executor exportExecutor
    ) {
        this.jdbc = jdbc;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.exportExecutor = exportExecutor;
    }

    @PostConstruct
    void createExportDirectory() {
        try {
            exportRoot = Path.of(exportDirectory).toAbsolutePath().normalize();
            Files.createDirectories(exportRoot);
            try {
                Files.setPosixFilePermissions(exportRoot, OWNER_ONLY);
            } catch (UnsupportedOperationException ignored) {
                // The production host is Linux; non-POSIX test hosts still work safely by path validation.
            }
        } catch (IOException exception) {
            throw new IllegalStateException("无法创建审计导出目录", exception);
        }
    }

    public Map<String, Object> create(AuditLogQuery query, String creator) {
        String id = "audit-export-" + UUID.randomUUID();
        String now = Instant.now().toString();
        String expiresAt = Instant.now().plusSeconds(24 * 60 * 60L).toString();
        jdbc.update("""
                insert into audit_log_export_task
                (id, created_by, query_json, status, row_count, created_at, expires_at)
                values (?,?,?,?,?,?,?)
                """, id, creator, serialize(query), "PENDING", 0, now, expiresAt);
        exportExecutor.execute(() -> runExport(id, query));
        return task(id, creator);
    }

    public Map<String, Object> task(String id, String creator) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "select id, created_by, status, row_count, file_name, error_message, created_at, completed_at, expires_at "
                        + "from audit_log_export_task where id=? and created_by=?", id, creator);
        if (rows.isEmpty()) throw new BizException(404, "导出任务不存在");
        Map<String, Object> row = rows.get(0);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", String.valueOf(row.get("id")));
        result.put("status", String.valueOf(row.get("status")));
        result.put("rowCount", ((Number) row.get("row_count")).longValue());
        result.put("createdAt", String.valueOf(row.get("created_at")));
        result.put("completedAt", row.get("completed_at") == null ? "" : String.valueOf(row.get("completed_at")));
        result.put("expiresAt", String.valueOf(row.get("expires_at")));
        result.put("error", row.get("error_message") == null ? "" : String.valueOf(row.get("error_message")));
        result.put("downloadReady", "COMPLETED".equals(row.get("status")));
        return result;
    }

    public Resource download(String id, String creator) {
        Map<String, Object> row = jdbc.queryForList(
                "select status, file_name, expires_at from audit_log_export_task where id=? and created_by=?", id, creator)
                .stream().findFirst().orElseThrow(() -> new BizException(404, "导出任务不存在"));
        if (!"COMPLETED".equals(row.get("status"))) throw new BizException(409, "导出文件尚未生成");
        if (Instant.parse(String.valueOf(row.get("expires_at"))).isBefore(Instant.now())) throw new BizException(410, "导出文件已过期");
        Path file = safeFile(String.valueOf(row.get("file_name")));
        if (!Files.isRegularFile(file)) throw new BizException(404, "导出文件不存在");
        return new FileSystemResource(file);
    }

    @Scheduled(fixedDelayString = "${silverlink.audit.export-cleanup-interval-ms:3600000}")
    public void purgeExpired() {
        if (exportRoot == null) return;
        List<Map<String, Object>> expired = jdbc.queryForList(
                "select id, file_name from audit_log_export_task where expires_at < ?", Instant.now().toString());
        for (Map<String, Object> row : expired) {
            try {
                Object fileName = row.get("file_name");
                if (fileName != null && !String.valueOf(fileName).isBlank()) Files.deleteIfExists(safeFile(String.valueOf(fileName)));
            } catch (IOException | BizException ignored) {
                // The task row is still removed; a later host-level cleanup can remove an orphaned temp file.
            }
            jdbc.update("delete from audit_log_export_task where id=?", row.get("id"));
        }
    }

    private void runExport(String id, AuditLogQuery query) {
        String fileName = id + ".csv";
        Path output = safeFile(fileName);
        jdbc.update("update audit_log_export_task set status='RUNNING' where id=?", id);
        long rowCount = 0;
        try (BufferedWriter writer = Files.newBufferedWriter(output, StandardCharsets.UTF_8)) {
            writer.write("\uFEFFid,time,operator,role,source_ip,target,action,verification_method,visitor_name,visitor_phone,visitor_id_card,result,fail_reason,request_id\n");
            String cursor = null;
            do {
                CursorPage<AuditLogEntity> page = auditLogService.page(query, cursor, 100);
                for (AuditLogEntity item : page.items()) {
                    writeCsv(writer, item);
                    rowCount++;
                }
                cursor = page.nextCursor();
                if (!page.hasMore()) break;
            } while (cursor != null);
            jdbc.update("update audit_log_export_task set status='COMPLETED', row_count=?, file_name=?, completed_at=? where id=?",
                    rowCount, fileName, Instant.now().toString(), id);
        } catch (Exception exception) {
            try {
                Files.deleteIfExists(output);
            } catch (IOException ignored) {
            }
            jdbc.update("update audit_log_export_task set status='FAILED', error_message=?, completed_at=? where id=?",
                    trimError(exception), Instant.now().toString(), id);
        }
    }

    private void writeCsv(BufferedWriter writer, AuditLogEntity item) throws IOException {
        writer.write(String.join(",",
                csv(item.getId()), csv(item.getTime()), csv(item.getOperator()), csv(item.getRole()), csv(item.getSourceIp()),
                csv(item.getTarget()), csv(item.getAction()), csv(item.getVerificationMethod()), csv(item.getVisitorName()),
                csv(item.getVisitorPhone()), csv(item.getVisitorIdCard()), csv(item.getResult()), csv(item.getFailReason()), csv(item.getRequestId())
        ));
        writer.newLine();
    }

    private String csv(String value) {
        String safe = value == null ? "" : value.replace("\"", "\"\"");
        // Spreadsheet formula injection is neutralised while preserving the source value in a CSV reader.
        if (!safe.isEmpty() && "=+-@".indexOf(safe.charAt(0)) >= 0) safe = "'" + safe;
        return "\"" + safe + "\"";
    }

    private String serialize(AuditLogQuery query) {
        try {
            return objectMapper.writeValueAsString(query);
        } catch (Exception exception) {
            throw new IllegalArgumentException("导出筛选条件无效", exception);
        }
    }

    private Path safeFile(String fileName) {
        Path candidate = exportRoot.resolve(fileName).normalize();
        if (!candidate.startsWith(exportRoot)) throw new BizException(400, "导出文件路径无效");
        return candidate;
    }

    private String trimError(Exception exception) {
        String value = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
        return value.substring(0, Math.min(value.length(), 500));
    }
}
