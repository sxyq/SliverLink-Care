package com.silverlink.care.module.audit;

import com.silverlink.care.common.BizException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Repository
public class AuditLogRollupRepository {

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactionTemplate;
    private final AuditIpHasher ipHasher;

    public AuditLogRollupRepository(
            JdbcTemplate jdbc,
            PlatformTransactionManager transactionManager,
            AuditIpHasher ipHasher
    ) {
        this.jdbc = jdbc;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.ipHasher = ipHasher;
    }

    public List<LocalDate> sourceDays() {
        return jdbc.queryForList("""
                        select distinct left(time, 10) stat_day
                        from audit_log force index (idx_audit_time_id)
                        where time is not null and length(time) >= 10
                        order by stat_day
                        """)
                .stream()
                .map(row -> LocalDate.parse(String.valueOf(row.get("stat_day"))))
                .toList();
    }

    public Set<LocalDate> readyDays() {
        Set<LocalDate> days = new LinkedHashSet<>();
        for (Map<String, Object> row : jdbc.queryForList("""
                select stat_day from audit_log_rollup_day_state
                where status = 'READY' and ip_hash_key_version = ?
                order by stat_day
                """, ipHasher.keyVersion())) {
            days.add(toLocalDate(row.get("stat_day")));
        }
        return days;
    }

    public void rebuildDay(LocalDate day) {
        transactionTemplate.executeWithoutResult(status -> rebuildDayInTransaction(day));
    }

    /**
     * The hot path only checks two indexed source values. Avoid rebuilding and invalidating
     * caches when no audit rows arrived since the previous refresh.
     */
    public boolean needsRebuild(LocalDate day) {
        String start = day + "T00:00:00Z";
        String end = day.plusDays(1) + "T00:00:00Z";
        Map<String, Object> source = jdbc.queryForMap("""
                select count(*) source_count, max(time) source_max_time
                from audit_log force index (idx_audit_time_id)
                where time >= ? and time < ?
                """, start, end);
        List<Map<String, Object>> states = jdbc.queryForList("""
                select source_row_count, source_max_time, status, ip_hash_key_version
                from audit_log_rollup_day_state where stat_day=?
                """, Date.valueOf(day));
        if (states.isEmpty()) return true;

        Map<String, Object> state = states.get(0);
        return !"READY".equals(String.valueOf(state.get("status")))
                || longValue(source.get("source_count")) != longValue(state.get("source_row_count"))
                || !sameNullableText(source.get("source_max_time"), state.get("source_max_time"))
                || ipHasher.keyVersion() != longValue(state.get("ip_hash_key_version"));
    }

    public void markFailure(LocalDate day, String message) {
        String safeMessage = message == null ? "未知错误" : message.substring(0, Math.min(500, message.length()));
        jdbc.update("""
                        insert into audit_log_rollup_day_state
                        (stat_day, source_row_count, rollup_event_count, rollup_row_count,
                         ip_rollup_row_count, ip_hash_key_version, source_max_time,
                         status, error_message, rebuilt_at)
                        values (?, 0, 0, 0, 0, ?, null, 'FAILED', ?, current_timestamp(6))
                        on duplicate key update status='FAILED',
                          ip_hash_key_version=values(ip_hash_key_version),
                          error_message=values(error_message), rebuilt_at=values(rebuilt_at)
                        """,
                Date.valueOf(day), ipHasher.keyVersion(), safeMessage);
    }

    public Map<String, Object> overview(AuditLogQuery query) {
        QueryParts parts = rollupWhere(query, null);
        Map<String, Object> row = jdbc.queryForMap("""
                select coalesce(sum(event_count), 0) total,
                       coalesce(sum(case when result_key='SUCCESS' then event_count else 0 end), 0) successCount,
                       coalesce(sum(case when result_key='FAIL' then event_count else 0 end), 0) failureCount,
                       coalesce(sum(case when result_key='PENDING' then event_count else 0 end), 0) pendingCount
                from audit_log_daily_rollup
                """ + parts.sql(), parts.args().toArray());

        Long sourceIpCount = jdbc.queryForObject("""
                select count(distinct ip_hmac)
                from audit_log_daily_ip_rollup
                """ + parts.sql() + " and hash_key_version=?", Long.class,
                append(parts.args(), ipHasher.keyVersion()).toArray());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", longValue(row.get("total")));
        result.put("successCount", longValue(row.get("successCount")));
        result.put("failureCount", longValue(row.get("failureCount")));
        result.put("pendingCount", longValue(row.get("pendingCount")));
        result.put("sourceIpCount", sourceIpCount == null ? 0L : sourceIpCount);
        return result;
    }

    public List<Map<String, Object>> trend(AuditLogQuery query) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        QueryParts parts = rollupWhere(query, today.minusDays(6));
        return jdbc.queryForList("""
                        select stat_day, sum(event_count) value
                        from audit_log_daily_rollup
                        """ + parts.sql() + " group by stat_day order by stat_day", parts.args().toArray())
                .stream()
                .map(row -> Map.<String, Object>of(
                        "day", toLocalDate(row.get("stat_day")).toString(),
                        "value", longValue(row.get("value"))
                ))
                .toList();
    }

    public Map<String, Object> distribution(AuditLogQuery query) {
        QueryParts parts = rollupWhere(query, null);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("actions", distribution("action_key", parts, "UNKNOWN"));
        result.put("verificationMethods", distribution("verification_key", parts, "NONE"));
        result.put("results", distribution("result_key", parts, null));
        return result;
    }

    public String latestRebuiltAt() {
        Timestamp value = jdbc.queryForObject(
                "select max(rebuilt_at) from audit_log_rollup_day_state where status='READY'",
                Timestamp.class
        );
        return value == null ? "" : value.toInstant().toString();
    }

    private void rebuildDayInTransaction(LocalDate day) {
        String start = day + "T00:00:00Z";
        String end = day.plusDays(1) + "T00:00:00Z";
        Timestamp rebuiltAt = Timestamp.from(Instant.now());

        jdbc.update("delete from audit_log_daily_rollup where stat_day=?", Date.valueOf(day));
        jdbc.update("delete from audit_log_daily_ip_rollup where stat_day=?", Date.valueOf(day));

        jdbc.update("""
                        insert into audit_log_daily_rollup
                        (stat_day, role_key, action_key, result_key, verification_key, event_count, rebuilt_at)
                        select ?,
                               coalesce(nullif(trim(role), ''), 'UNKNOWN'),
                               coalesce(nullif(trim(action), ''), 'UNKNOWN'),
                               case
                                 when result in ('SUCCESS', '成功') then 'SUCCESS'
                                 when result in ('FAIL', '失败') then 'FAIL'
                                 when result = 'PENDING' then 'PENDING'
                                 else 'OTHER'
                               end,
                               coalesce(nullif(trim(verification_method), ''), 'NONE'),
                               count(*), ?
                        from audit_log force index (idx_audit_time_id)
                        where time >= ? and time < ?
                        group by coalesce(nullif(trim(role), ''), 'UNKNOWN'),
                                 coalesce(nullif(trim(action), ''), 'UNKNOWN'),
                                 case
                                   when result in ('SUCCESS', '成功') then 'SUCCESS'
                                   when result in ('FAIL', '失败') then 'FAIL'
                                   when result = 'PENDING' then 'PENDING'
                                   else 'OTHER'
                                 end,
                                 coalesce(nullif(trim(verification_method), ''), 'NONE')
                        """,
                Date.valueOf(day), rebuiltAt, start, end);

        List<Map<String, Object>> ipRows = jdbc.queryForList("""
                select coalesce(nullif(trim(role), ''), 'UNKNOWN') role_key,
                       coalesce(nullif(trim(action), ''), 'UNKNOWN') action_key,
                       case
                         when result in ('SUCCESS', '成功') then 'SUCCESS'
                         when result in ('FAIL', '失败') then 'FAIL'
                         when result = 'PENDING' then 'PENDING'
                         else 'OTHER'
                       end result_key,
                       coalesce(nullif(trim(verification_method), ''), 'NONE') verification_key,
                       source_ip
                from audit_log force index (idx_audit_time_id)
                where time >= ? and time < ? and source_ip is not null and trim(source_ip) <> ''
                group by role_key, action_key, result_key, verification_key, source_ip
                """, start, end);

        List<Object[]> ipBatch = new ArrayList<>(ipRows.size());
        for (Map<String, Object> row : ipRows) {
            ipBatch.add(new Object[]{
                    Date.valueOf(day),
                    String.valueOf(row.get("role_key")),
                    String.valueOf(row.get("action_key")),
                    String.valueOf(row.get("result_key")),
                    String.valueOf(row.get("verification_key")),
                    ipHasher.keyVersion(),
                    ipHasher.hash(String.valueOf(row.get("source_ip"))),
                    rebuiltAt
            });
        }
        if (!ipBatch.isEmpty()) {
            jdbc.batchUpdate("""
                    insert into audit_log_daily_ip_rollup
                    (stat_day, role_key, action_key, result_key, verification_key,
                     hash_key_version, ip_hmac, rebuilt_at)
                    values (?, ?, ?, ?, ?, ?, ?, ?)
                    """, ipBatch);
        }

        Map<String, Object> source = jdbc.queryForMap("""
                select count(*) source_count, max(time) source_max_time
                from audit_log force index (idx_audit_time_id)
                where time >= ? and time < ?
                """, start, end);
        Map<String, Object> rolled = jdbc.queryForMap("""
                select coalesce(sum(event_count), 0) event_count, count(*) row_count
                from audit_log_daily_rollup where stat_day=?
                """, Date.valueOf(day));

        long sourceCount = longValue(source.get("source_count"));
        long rollupCount = longValue(rolled.get("event_count"));
        if (sourceCount != rollupCount) {
            throw new IllegalStateException("审计汇总校验失败: source=" + sourceCount + ", rollup=" + rollupCount);
        }

        jdbc.update("""
                        insert into audit_log_rollup_day_state
                        (stat_day, source_row_count, rollup_event_count, rollup_row_count,
                         ip_rollup_row_count, ip_hash_key_version, source_max_time,
                         status, error_message, rebuilt_at)
                        values (?, ?, ?, ?, ?, ?, ?, 'READY', null, ?)
                        on duplicate key update
                          source_row_count=values(source_row_count),
                          rollup_event_count=values(rollup_event_count),
                          rollup_row_count=values(rollup_row_count),
                          ip_rollup_row_count=values(ip_rollup_row_count),
                          ip_hash_key_version=values(ip_hash_key_version),
                          source_max_time=values(source_max_time),
                          status='READY', error_message=null, rebuilt_at=values(rebuilt_at)
                        """,
                Date.valueOf(day), sourceCount, rollupCount, longValue(rolled.get("row_count")),
                ipBatch.size(), ipHasher.keyVersion(), source.get("source_max_time"), rebuiltAt);
    }

    private List<Map<String, Object>> distribution(String column, QueryParts parts, String emptyValue) {
        return jdbc.queryForList("select " + column + " label, sum(event_count) value "
                        + "from audit_log_daily_rollup " + parts.sql()
                        + " group by " + column + " order by value desc limit 20", parts.args().toArray())
                .stream()
                .map(row -> {
                    String label = String.valueOf(row.get("label"));
                    if (emptyValue != null && emptyValue.equals(label)) label = "";
                    return Map.<String, Object>of("label", label, "value", longValue(row.get("value")));
                })
                .toList();
    }

    private QueryParts rollupWhere(AuditLogQuery query, LocalDate minimumDay) {
        AuditLogQuery safe = query == null
                ? new AuditLogQuery(null, null, null, null, null, null, null, null, null)
                : query;
        StringBuilder where = new StringBuilder(" where 1=1");
        List<Object> args = new ArrayList<>();

        LocalDate from = parseDate(safe.from());
        if (minimumDay != null && (from == null || from.isBefore(minimumDay))) from = minimumDay;
        LocalDate to = parseDate(safe.to());
        if (from != null) {
            where.append(" and stat_day >= ?");
            args.add(Date.valueOf(from));
        }
        if (to != null) {
            where.append(" and stat_day <= ?");
            args.add(Date.valueOf(to));
        }
        if (safe.role() != null && !safe.role().isBlank()) {
            if ("VISITOR_GROUP".equalsIgnoreCase(safe.role())) {
                where.append(" and role_key in ('VISITOR', 'SCAN', 'SCAN_USER', 'ANONYMOUS')");
            } else {
                where.append(" and role_key = ?");
                args.add(safe.role());
            }
        }
        addExact(where, args, "action_key", safe.action());
        addExact(where, args, "verification_key", safe.verificationMethod());
        if (safe.result() != null && !safe.result().isBlank()) {
            where.append(" and result_key = ?");
            args.add(normalizeResult(safe.result()));
        }
        return new QueryParts(where.toString(), args);
    }

    private void addExact(StringBuilder where, List<Object> args, String column, String value) {
        if (value == null || value.isBlank()) return;
        where.append(" and ").append(column).append(" = ?");
        args.add(value);
    }

    private String normalizeResult(String value) {
        if ("成功".equals(value) || "SUCCESS".equalsIgnoreCase(value)) return "SUCCESS";
        if ("失败".equals(value) || "FAIL".equalsIgnoreCase(value)) return "FAIL";
        if ("PENDING".equalsIgnoreCase(value)) return "PENDING";
        return "OTHER";
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.substring(0, Math.min(10, value.length())));
        } catch (RuntimeException exception) {
            throw new BizException(400, "日期格式不正确");
        }
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof Date date) return date.toLocalDate();
        if (value instanceof LocalDate date) return date;
        return LocalDate.parse(String.valueOf(value));
    }

    private long longValue(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(String.valueOf(value));
    }

    private boolean sameNullableText(Object left, Object right) {
        if (left == null || right == null) return left == right;
        return Objects.equals(String.valueOf(left), String.valueOf(right));
    }

    private List<Object> append(List<Object> values, Object value) {
        List<Object> result = new ArrayList<>(values);
        result.add(value);
        return result;
    }

    private record QueryParts(String sql, List<Object> args) {
    }
}
