package com.silverlink.care.module.review;

import com.silverlink.care.common.BizException;
import com.silverlink.care.infrastructure.persistence.SilverLinkDataService;
import com.silverlink.care.module.qrcode.QrCodeEntity;
import com.silverlink.care.module.qrcode.QrCodeService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminReviewRequestService {

    private static final String TYPE_QR_DISABLE = "QR_DISABLE";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";

    private final JdbcTemplate jdbc;
    private final SilverLinkDataService data;
    private final QrCodeService qrCodeService;

    public AdminReviewRequestService(JdbcTemplate jdbc, SilverLinkDataService data, QrCodeService qrCodeService) {
        this.jdbc = jdbc;
        this.data = data;
        this.qrCodeService = qrCodeService;
    }

    public Map<String, Object> createQrDisableRequest(String requesterAccount, String requesterRole, String elderId, QrCodeEntity qrCode) {
        if (qrCode == null) {
            throw new BizException(404, "当前老人暂无二维码");
        }
        if ("DISABLED".equalsIgnoreCase(qrCode.getStatus())) {
            throw new BizException(400, "二维码已停用，无需重复申请");
        }

        Map<String, Object> existing = findPendingByQrCode(qrCode.getId());
        if (existing != null) {
            return existing;
        }

        Map<String, Object> elder = data.one("select * from elder where id=?", elderId);
        String elderName = data.dec(elder.get("name_enc"));
        String archiveNo = data.str(elder.get("archive_no"));
        String id = UUID.randomUUID().toString();
        String createdAt = Instant.now().toString();
        String label = (elderName == null || elderName.isBlank() ? archiveNo : elderName) + " / " + archiveNo;

        jdbc.update("""
                insert into admin_review_request
                (id, type, target_id, target_label, elder_id, qr_code_id, requester_account, requester_role, requester_note, status, created_at)
                values (?,?,?,?,?,?,?,?,?,?,?)
                """,
                id,
                TYPE_QR_DISABLE,
                qrCode.getQrId(),
                label,
                elderId,
                qrCode.getId(),
                requesterAccount,
                requesterRole,
                "申请停用老人二维码",
                STATUS_PENDING,
                createdAt
        );
        return findById(id);
    }

    public Map<String, Object> findPendingByQrCode(String qrCodeId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select r.*, e.name_enc as elder_name_enc, e.archive_no, q.status as qr_status
                from admin_review_request r
                left join elder e on e.id=r.elder_id
                left join qr_code q on q.id=r.qr_code_id
                where r.qr_code_id=? and r.status=? order by r.created_at desc limit 1
                """, qrCodeId, STATUS_PENDING);
        return rows.isEmpty() ? null : toMap(rows.get(0));
    }

    public List<Map<String, Object>> list(String status) {
        String normalized = status == null || status.isBlank() ? STATUS_PENDING : status.trim().toUpperCase();
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select r.*, e.name_enc as elder_name_enc, e.archive_no, q.status as qr_status
                from admin_review_request r
                left join elder e on e.id=r.elder_id
                left join qr_code q on q.id=r.qr_code_id
                where r.status=?
                order by r.created_at desc
                """, normalized);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(toMap(row));
        }
        return result;
    }

    public Map<String, Object> approve(String id, String adminAccount) {
        Map<String, Object> request = findRawById(id);
        ensurePending(request);
        if (TYPE_QR_DISABLE.equals(data.str(request.get("type")))) {
            String qrCodeId = data.str(request.get("qr_code_id"));
            qrCodeService.disable(qrCodeId);
        }
        jdbc.update("""
                update admin_review_request
                set status=?, handled_at=?, handled_by=?, result_note=?
                where id=?
                """, STATUS_APPROVED, Instant.now().toString(), adminAccount, "管理员已通过，二维码已停用", id);
        return findById(id);
    }

    public Map<String, Object> reject(String id, String adminAccount, String note) {
        Map<String, Object> request = findRawById(id);
        ensurePending(request);
        jdbc.update("""
                update admin_review_request
                set status=?, handled_at=?, handled_by=?, result_note=?
                where id=?
                """, STATUS_REJECTED, Instant.now().toString(), adminAccount,
                note == null || note.isBlank() ? "管理员已驳回" : note.trim(), id);
        return findById(id);
    }

    private Map<String, Object> findById(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select r.*, e.name_enc as elder_name_enc, e.archive_no, q.status as qr_status
                from admin_review_request r
                left join elder e on e.id=r.elder_id
                left join qr_code q on q.id=r.qr_code_id
                where r.id=?
                """, id);
        if (rows.isEmpty()) {
            throw new BizException(404, "审核请求不存在");
        }
        return toMap(rows.get(0));
    }

    private Map<String, Object> findRawById(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("select * from admin_review_request where id=?", id);
        if (rows.isEmpty()) {
            throw new BizException(404, "审核请求不存在");
        }
        return rows.get(0);
    }

    private void ensurePending(Map<String, Object> request) {
        if (!STATUS_PENDING.equalsIgnoreCase(data.str(request.get("status")))) {
            throw new BizException(400, "该请求已处理");
        }
    }

    private Map<String, Object> toMap(Map<String, Object> row) {
        String requesterRole = data.str(row.get("requester_role"));
        String requesterLabel = switch (requesterRole.toUpperCase()) {
            case "FAMILY" -> "家属";
            case "VOLUNTEER" -> "志愿者";
            default -> requesterRole;
        };
        String elderName = data.dec(row.get("elder_name_enc"));
        String archiveNo = data.str(row.get("archive_no"));

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", data.str(row.get("id")));
        map.put("type", data.str(row.get("type")));
        map.put("title", "二维码停用申请");
        map.put("summary", requesterLabel + " " + data.str(row.get("requester_account")) + " 申请停用 " + data.str(row.get("target_label")));
        map.put("targetId", data.str(row.get("target_id")));
        map.put("targetLabel", data.str(row.get("target_label")));
        map.put("elderId", data.str(row.get("elder_id")));
        map.put("elderName", elderName);
        map.put("archiveNo", archiveNo);
        map.put("qrCodeId", data.str(row.get("qr_code_id")));
        map.put("qrStatus", data.str(row.get("qr_status")));
        map.put("requesterAccount", data.str(row.get("requester_account")));
        map.put("requesterRole", requesterRole);
        map.put("requesterRoleLabel", requesterLabel);
        map.put("requesterNote", data.str(row.get("requester_note")));
        map.put("status", data.str(row.get("status")));
        map.put("createdAt", data.str(row.get("created_at")));
        map.put("handledAt", data.str(row.get("handled_at")));
        map.put("handledBy", data.str(row.get("handled_by")));
        map.put("resultNote", data.str(row.get("result_note")));
        return map;
    }
}
