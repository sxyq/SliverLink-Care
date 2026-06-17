import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(projectRoot, '..');
const backendRoot = path.join(repoRoot, '04-统一后端/src/main/java');

const contracts = [
  ['POST', '/api/scan/resolve', 'src/services/scan/scanAuthService.ts', ['/api/scan/resolve']],
  ['POST', '/api/scan/verification/start', 'src/services/scan/scanAuthService.ts', ['/api/scan/verification/start']],
  ['GET', '/api/scan/verification/status', 'src/services/scan/scanAuthService.ts', ['/api/scan/verification/status']],
  ['POST', '/api/scan/verification/identity', 'src/services/scan/scanAuthService.ts', ['/api/scan/verification/identity']],
  ['GET', '/api/scan/basic-info', 'src/services/scan/scanArchiveService.ts', ['/api/scan/basic-info']],
  ['GET', '/api/scan/archive', 'src/services/scan/scanArchiveService.ts', ['/api/scan/archive']],
  ['GET', '/api/scan/medications', 'src/services/scan/scanArchiveService.ts', ['/api/scan/medications']],
  ['GET', '/api/scan/scales', 'src/services/scan/scanArchiveService.ts', ['/api/scan/scales']],

  ['POST', '/api/volunteer/login', 'src/services/workbench/authService.ts', ['/api/volunteer/login']],
  ['POST', '/api/family/login', 'src/services/workbench/authService.ts', ['/api/family/login']],
  ['GET', '/api/invitations/{code}/preview', 'src/services/workbench/authService.ts', ['/api/invitations/', '/preview']],
  ['POST', '/api/volunteer/register', 'src/services/workbench/authService.ts', ['/api/volunteer/register']],
  ['POST', '/api/volunteer/logout', 'src/services/workbench/authService.ts', ['/api/volunteer/logout']],
  ['POST', '/api/family/logout', 'src/services/workbench/authService.ts', ['/api/family/logout']],
  ['GET', '/api/volunteer/me/profile', 'src/services/workbench/authService.ts', ['/api/volunteer/me/profile']],
  ['PUT', '/api/volunteer/me/profile', 'src/services/workbench/authService.ts', ['/api/volunteer/me/profile']],

  ['GET', '/api/volunteer/me/elders', 'src/services/workbench/elderService.ts', ['/api/volunteer/me/elders']],
  ['GET', '/api/family/me/elders', 'src/services/workbench/elderService.ts', ['/api/family/me/elders']],
  ['GET', '/api/family/elders/{elderId}', 'src/services/workbench/elderService.ts', ['/api/family/elders/']],
  ['PUT', '/api/elder/{id}/basic', 'src/services/workbench/elderService.ts', ['/api/elder/', '/basic']],
  ['PUT', '/api/family/elders/{elderId}/contacts', 'src/services/workbench/elderService.ts', ['/api/family/elders/', '/contacts']],
  ['POST', '/api/volunteer/me/elders', 'src/services/workbench/elderService.ts', ['/api/volunteer/me/elders']],

  ['GET', '/api/elder/{id}/scale-records', 'src/services/workbench/scaleService.ts', ['/api/elder/', '/scale-records']],
  ['POST', '/api/elder/{id}/scale-records', 'src/services/workbench/scaleService.ts', ['/api/elder/', '/scale-records']],

  ['GET', '/api/volunteer/me/elders/{elderId}/medications', 'src/services/workbench/medicationService.ts', ['/api/volunteer/me/elders/', '/medications']],
  ['GET', '/api/family/elders/{elderId}/medications', 'src/services/workbench/medicationService.ts', ['/api/family/elders/', '/medications']],
  ['GET', '/api/elder/{id}/medications', 'src/services/workbench/medicationService.ts', ['/api/elder/', '/medications']],
  ['POST', '/api/elder/{id}/medications', 'src/services/workbench/medicationService.ts', ['/api/elder/', '/medications']],
  ['POST', '/api/family/elders/{elderId}/medications', 'src/services/workbench/medicationService.ts', ['/api/family/elders/', '/medications']],
  ['PUT', '/api/family/elders/{elderId}/medications/{medicationId}', 'src/services/workbench/medicationService.ts', ['/api/family/elders/', '/medications/']],
  ['DELETE', '/api/family/elders/{elderId}/medications/{medicationId}', 'src/services/workbench/medicationService.ts', ['/api/family/elders/', '/medications/']],

  ['GET', '/api/volunteer/me/elders/{elderId}/qr-manage', 'src/services/workbench/qrcodeService.ts', ['/api/volunteer/me/elders/', '/qr-manage']],
  ['GET', '/api/family/elders/{elderId}/qrcode', 'src/services/workbench/qrcodeService.ts', ['/api/family/elders/', '/qrcode']],
  ['POST', '/api/volunteer/me/elders/{elderId}/qr-regenerate', 'src/services/workbench/qrcodeService.ts', ['/api/volunteer/me/elders/', '/qr-regenerate']],
  ['PUT', '/api/volunteer/me/elders/{elderId}/qr-disable', 'src/services/workbench/qrcodeService.ts', ['/api/volunteer/me/elders/', '/qr-disable']],
  ['POST', '/api/family/elders/{elderId}/qrcode/disable-request', 'src/services/workbench/qrcodeService.ts', ['/api/family/elders/', '/qrcode/disable-request']],
  ['GET', '/api/nameplates/{elderId}/preview', 'src/services/workbench/qrcodeService.ts', ['/api/nameplates/', '/preview']],
  ['GET', '/api/nameplates/{elderId}/pdf', 'src/services/workbench/qrcodeService.ts', ['/api/nameplates/', '/pdf']],
];

const responseShapeContracts = [
  {
    label: 'volunteer login returns token/account/name and miniapp normalizes them',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerController.java',
    backendSnippets: [
      'public ApiResponse<Map<String, String>> login',
      'map.put("token", token)',
      'map.put("account", account)',
      'map.put("name", data.dec(user.get().get("name_enc")))',
    ],
    serviceFile: 'src/services/workbench/authService.ts',
    serviceSnippets: [
      'interface VolunteerLoginResponse',
      'token?: string',
      'account?: string',
      'name?: string',
      "await httpClient.post<VolunteerLoginResponse>('/api/volunteer/login'",
      'token: String(result.token || \'\')',
      'accountId: String(result.account || account)',
      'displayName: String(result.name || result.account || account)',
    ],
  },
  {
    label: 'family login returns ok/token/message and miniapp enforces success shape',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
    backendSnippets: [
      'public ApiResponse<FamilyLoginResultDto> login',
      'FamilyLoginResultDto result = familyService.login(req)',
      'return ApiResponse.ok(result)',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyLoginResultDto.java',
        snippets: [
          'private Boolean ok',
          'private String token',
          'private String message',
          'public Boolean getOk()',
          'public String getToken()',
          'public String getMessage()',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/authService.ts',
    serviceSnippets: [
      'interface FamilyLoginResponse',
      'ok?: boolean',
      'token?: string',
      'message?: string',
      "await httpClient.post<FamilyLoginResponse>('/api/family/login'",
      'if (!result.ok || !result.token)',
      'token: result.token',
    ],
  },
  {
    label: 'volunteer register returns token/account/name and miniapp ignores backend-only metadata',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerController.java',
    backendSnippets: [
      'public ApiResponse<Map<String, String>> register',
      'Map<String, String> result = volunteerService.registerWithInvitation(req)',
      'return ApiResponse.ok(result)',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerService.java',
        snippets: [
          'result.put("token", jwtTokenProvider.generateToken(account, "VOLUNTEER", 86400000L))',
          'result.put("name", name)',
          'result.put("account", account)',
          'result.put("volunteerId", volunteerId)',
          'result.put("invitationCode", invitationCode)',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/authService.ts',
    serviceSnippets: [
      'interface VolunteerRegisterResponse',
      'token?: string',
      'account?: string',
      'name?: string',
      "await httpClient.post<VolunteerRegisterResponse>('/api/volunteer/register'",
      'if (!result.token)',
      'accountId: String(result.account || account)',
      'displayName: String(result.name || name)',
    ],
  },
  {
    label: 'invitation preview DTO fields match miniapp preview model',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/invitation/InvitationController.java',
    backendSnippets: [
      '@GetMapping("/invitations/{code}/preview")',
      'public ApiResponse<InvitationPreviewDto> preview',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/invitation/InvitationPreviewDto.java',
        snippets: [
          'private String elderName',
          'private Integer elderAge',
          'private String elderArchiveNo',
          'private String expiresAt',
          'public String getElderName()',
          'public Integer getElderAge()',
          'public String getElderArchiveNo()',
          'public String getExpiresAt()',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/authService.ts',
    serviceSnippets: [
      'export interface VolunteerInvitationPreview',
      'elderName: string',
      'elderAge: number',
      'elderArchiveNo: string',
      'expiresAt: string',
      "httpClient.get<VolunteerInvitationPreview>(`/api/invitations/${encodeURIComponent(normalizedCode)}/preview`)",
    ],
  },
  {
    label: 'volunteer profile get/update fields match miniapp profile model',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerController.java',
    backendSnippets: [
      'public ApiResponse<Map<String, Object>> myProfile',
      'public ApiResponse<Map<String, String>> updateMyProfile',
      '"token", token',
      '"account", nextAccount',
      '"name", nextName',
      '"phone", String.valueOf(profile.getOrDefault("phone", ""))',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/infrastructure/persistence/SilverLinkDataService.java',
        snippets: [
          'public Map<String, Object> volunteerProfile(String account)',
          'map.put("account", str(row.get("account")))',
          'map.put("name", dec(row.get("name_enc")))',
          'map.put("phone", dec(row.get("phone_enc")))',
          'return volunteerProfile(nextAccount)',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/authService.ts',
    serviceSnippets: [
      'interface VolunteerProfileResponse',
      'interface VolunteerProfileUpdateResponse extends VolunteerProfileResponse',
      "httpClient.get<VolunteerProfileResponse>('/api/volunteer/me/profile')",
      "httpClient.put<VolunteerProfileUpdateResponse>('/api/volunteer/me/profile'",
      'account: String(result.account || account)',
      'name: String(result.name || name)',
      'phone: String(result.phone || phone)',
    ],
  },
  {
    label: 'volunteer elder list map fields match workbench elder mapper',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerController.java',
    backendSnippets: [
      'public ApiResponse<List<Map<String, Object>>> myElders',
      'volunteerService.getMyElders(authentication.getName())',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/infrastructure/persistence/SilverLinkDataService.java',
        snippets: [
          'public List<Map<String, Object>> assignedElders(String account)',
          'Map<String, Object> map = elderRow(row, false)',
          'map.put("lastVisitDate", latestHealthDate(str(row.get("id"))))',
          'map.put("elderId", str(row.get("id")))',
          'map.put("archiveNo", str(row.get("archive_no")))',
          'map.put("emergencyContactPhone", masked ? maskPhone(phone) : phone)',
          'map.put("emergencyPhoneDial", phone)',
          'map.put("relationship", str(row.get("relationship")))',
          'map.put("aboType", str(row.get("abo_type")))',
          'map.put("rhType", str(row.get("rh_type")))',
          'map.put("allergySummary", dec(row.get("allergy_enc")))',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/elderService.ts',
    serviceSnippets: [
      'interface VolunteerElderRow',
      'function mapVolunteerElder',
      'id: String(row.id || row.elderId || \'\')',
      'emergencyContactPhone: String(row.emergencyContactPhone || row.emergencyPhoneDial || \'\')',
      'emergencyContactRelation: String(row.emergencyContactRelation || row.relationship || \'\')',
      'bloodType: buildBloodType(row.aboType, row.rhType)',
      'allergyHistory: String(row.allergySummary || row.allergyHistory || \'\')',
      "httpClient.get<VolunteerElderRow[]>('/api/volunteer/me/elders')",
    ],
  },
  {
    label: 'family elder list/detail DTO fields match workbench detail mapper',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
    backendSnippets: [
      'public ApiResponse<List<FamilyElderDto>> myElders',
      'public ApiResponse<FamilyElderDetailDto> elderDetail',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyElderDto.java',
        snippets: [
          'private String id',
          'private String name',
          'private Integer age',
          'private String archiveNo',
          'private String lastUpdate',
        ],
      },
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyElderDetailDto.java',
        snippets: [
          'private String gender',
          'private String bloodType',
          'private String allergyHistory',
          'private String emergencyContactName',
          'private String emergencyContactPhone',
          'private String emergencyContactRelation',
          'private String backupContactName',
          'private String backupContactPhone',
          'private String backupContactRelation',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/elderService.ts',
    serviceSnippets: [
      'interface FamilyElderRow',
      'interface FamilyElderDetailResponse',
      'function mapFamilyElder',
      'function mergeWithCurrentSummary',
      "httpClient.get<FamilyElderRow[]>('/api/family/me/elders')",
      'httpClient.get<FamilyElderDetailResponse>(`/api/family/elders/${encodeURIComponent(elderId)}`)',
      'backupContactName: String(detail.backupContactName || \'\')',
      'detailMode: \'FULL\'',
    ],
  },
  {
    label: 'basic info save returns recordId and miniapp sends backend field aliases',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/elder/ElderController.java',
    backendSnippets: [
      '@PutMapping("/{id}/basic")',
      'public ApiResponse<Map<String, String>> updateBasic',
      'return ApiResponse.ok(Map.of("recordId", "basic-" + System.currentTimeMillis()))',
    ],
    serviceFile: 'src/services/workbench/elderService.ts',
    serviceSnippets: [
      'httpClient.put<{ recordId: string }>(`/api/elder/${encodeURIComponent(elderId)}/basic`',
      'emergencyPhone: formValue.emergencyContactPhone.trim()',
      'relationship: formValue.emergencyContactRelation.trim()',
      'backupPhone: formValue.backupContactPhone.trim()',
      'allergySummary: formValue.allergyHistory.trim()',
    ],
  },
  {
    label: 'family contacts update is void-backed and miniapp awaits success only',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
    backendSnippets: [
      '@PutMapping("/family/elders/{elderId}/contacts")',
      'public ApiResponse<Void> updateContacts',
      'return ApiResponse.ok(null)',
    ],
    serviceFile: 'src/services/workbench/elderService.ts',
    serviceSnippets: [
      'export async function updateFamilyContacts',
      'await httpClient.put<void>(`/api/family/elders/${encodeURIComponent(elderId)}/contacts`',
      'emergencyContactName: formValue.emergencyContactName.trim()',
      'backupContactRelation: formValue.backupContactRelation.trim()',
    ],
  },
  {
    label: 'scale records get/save preserve name/score/date/volunteer/answers and recordId',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/elder/ElderController.java',
    backendSnippets: [
      'public ApiResponse<Map<String, String>> saveScales',
      'return ApiResponse.ok(Map.of("recordId", "scale-" + System.currentTimeMillis()))',
      'public ApiResponse<java.util.List<Map<String, Object>>> getScales',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/infrastructure/persistence/SilverLinkDataService.java',
        snippets: [
          'map.put("name", str(row.get("scale_name")))',
          'map.put("scale", str(row.get("scale_name")))',
          'map.put("score", intValue(row.get("score")))',
          'map.put("updatedAt", str(row.get("record_date")))',
          'map.put("date", str(row.get("record_date")))',
          'map.put("volunteer", str(row.get("volunteer")))',
          'map.put("answers", parseScaleAnswersCached(str(row.get("id")), dec(payloadEnc)))',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/scaleService.ts',
    serviceSnippets: [
      'httpClient.get<Array<Record<string, unknown>>>(`/api/elder/${encodeURIComponent(elderId)}/scale-records`)',
      'name: String(row.name || row.scale || \'PHQ-9\') as WorkbenchScaleType',
      'score: Number(row.score || 0)',
      'date: String(row.date || row.recordDate || row.updatedAt || \'\')',
      'volunteer: String(row.volunteer || \'\')',
      'answers: Array.isArray(row.answers)',
      'httpClient.post<{ recordId: string }>(`/api/elder/${encodeURIComponent(elderId)}/scale-records`',
    ],
  },
  {
    label: 'medication list/create/save fields match backend encrypted medication aliases',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/elder/ElderController.java',
    backendSnippets: [
      'public ApiResponse<Map<String, String>> saveMedications',
      'return ApiResponse.ok(Map.of("recordId", "med-" + System.currentTimeMillis()))',
      'public ApiResponse<java.util.List<Map<String, String>>> getMedications',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/infrastructure/persistence/SilverLinkDataService.java',
        snippets: [
          'map.put("id", str(row.get("id")))',
          'map.put("name", dec(row.get("name_enc")))',
          'map.put("dosage", dec(row.get("dosage_enc")))',
          'map.put("usage", dec(row.get("usage_text_enc")))',
          'map.put("time", dec(row.get("timing_enc")))',
          'map.put("timing", dec(row.get("timing_enc")))',
          'map.put("updatedAt", str(row.get("updated_at")))',
          'return Map.of("id", id)',
        ],
      },
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
        snippets: [
          'public ApiResponse<FamilyMedicationDto> addMedication',
          'public ApiResponse<List<FamilyMedicationDto>> medications',
        ],
      },
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyMedicationDto.java',
        snippets: [
          'private String id',
          'private String name',
          'private String dosage',
          'private String usage',
          'private String timing',
          'private String updatedAt',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/medicationService.ts',
    serviceSnippets: [
      'interface FamilyMedicationResponse',
      'function mapMedication',
      'normalizeMedicationList(rows)',
      'httpClient.post<{ recordId: string }>',
      'time: item.timing.trim()',
      'httpClient.post<FamilyMedicationResponse>(`/api/family/elders/${encodeURIComponent(elderId)}/medications`',
      'return mapMedication(result)',
    ],
  },
  {
    label: 'family medication update is void-backed and locally normalized',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
    backendSnippets: [
      '@PutMapping("/family/elders/{elderId}/medications/{medicationId}")',
      'ApiResponse<Void> updateMedication',
    ],
    serviceFile: 'src/services/workbench/medicationService.ts',
    serviceSnippets: [
      'await httpClient.put<void>',
      'return mapMedication({',
      'id: medicationId',
    ],
  },
  {
    label: 'family medication delete is void-backed',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
    backendSnippets: [
      '@DeleteMapping("/family/elders/{elderId}/medications/{medicationId}")',
      'ApiResponse<Void> deleteMedication',
    ],
    serviceFile: 'src/services/workbench/medicationService.ts',
    serviceSnippets: [
      'httpClient.delete<void>',
    ],
  },
  {
    label: 'workbench qrcode DTO/map fields match miniapp qrcode mapper',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerController.java',
    backendSnippets: [
      'public ApiResponse<Map<String, Object>> myElderQrCode',
      'public ApiResponse<Map<String, Object>> regenerateMyElderQrCode',
      'public ApiResponse<Map<String, Object>> disableMyElderQrCode',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/volunteer/VolunteerService.java',
        snippets: [
          'map.put("token", entity.getQrToken())',
          'map.put("status", switch (String.valueOf(entity.getStatus()))',
          'map.put("createdAt", entity.getCreatedAt())',
          'map.put("url", publicUrl)',
          'map.put("publicUrl", publicUrl)',
          'map.put("qrImageBase64", entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.renderPublicQrImageBase64(entity.getQrToken()))',
          'map.put("qrImageUrl", entity.getQrToken() == null || entity.getQrToken().isBlank() ? "" : qrCodeService.buildPublicQrImageUrl(entity.getQrToken()))',
          'map.put("securityNote", "二维码不包含明文身份与健康信息，仅保存加密访问令牌。")',
          'result.put("disableReviewStatus", review.get("status"))',
          'result.put("disableReviewId", review.get("id"))',
          'result.put("reviewMessage", "停用申请已提交，等待管理员审核。审核通过前二维码仍保持启用。")',
          'map.put("disableReviewStatus", pendingReview.get("status"))',
          'map.put("disableReviewId", pendingReview.get("id"))',
        ],
      },
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyController.java',
        snippets: [
          'public ApiResponse<FamilyQrCodeDto> qrcode',
          'public ApiResponse<FamilyQrCodeDto> requestDisableQrcode',
        ],
      },
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/family/FamilyQrCodeDto.java',
        snippets: [
          'private String token',
          'private String status',
          'private String createdAt',
          'private String pdfUrl',
          'private String disableReviewStatus',
          'private String disableReviewId',
          'private String reviewMessage',
          'private String url',
          'private String publicUrl',
          'private String qrImageBase64',
          'private String qrImageUrl',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/qrcodeService.ts',
    serviceSnippets: [
      'function mapQrCodeInfo',
      'token: String(payload.token || \'\')',
      'status: String(payload.status || \'\')',
      'createdAt: String(payload.createdAt || \'\')',
      'pdfUrl: String(payload.pdfUrl || \'\')',
      'disableReviewStatus: String(payload.disableReviewStatus || \'\')',
      'disableReviewId: String(payload.disableReviewId || \'\')',
      'reviewMessage: String(payload.reviewMessage || \'\')',
      'url: String(payload.url || \'\')',
      'publicUrl: String(payload.publicUrl || payload.url || \'\')',
      'qrImageBase64: String(payload.qrImageBase64 || \'\')',
      'qrImageUrl: String(payload.qrImageUrl || \'\')',
      'securityNote: String(payload.securityNote || \'\')',
      'return mapQrCodeInfo(result)',
    ],
  },
  {
    label: 'nameplate preview and pdf shape matches miniapp preview/pdf consumer',
    backendFile: '04-统一后端/src/main/java/com/silverlink/care/module/nameplate/NameplateController.java',
    backendSnippets: [
      'public ApiResponse<NameplatePreviewResponse> preview',
      'public ResponseEntity<byte[]> pdf',
      'MediaType.APPLICATION_PDF',
    ],
    extraBackendFiles: [
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/nameplate/dto/NameplatePreviewResponse.java',
        snippets: [
          'private String elderId',
          'private String archiveNo',
          'private String frontName',
          'private String frontAge',
          'private String frontPhone',
          'private String backQrToken',
          'private String backQrUrl',
          'private String backQrPayload',
          'private String backQrImageBase64',
          'private String backArchiveNo',
          'private String backHint',
          'private String pdfPreviewImageBase64',
          'private boolean blankTemplate',
        ],
      },
      {
        file: '04-统一后端/src/main/java/com/silverlink/care/module/nameplate/NameplateService.java',
        snippets: [
          'resp.setBackQrToken(qrUrl)',
          'resp.setBackQrUrl(qrUrl)',
          'resp.setBackQrPayload(qrUrl)',
          'resp.setBackQrImageBase64(qrCodeService.renderQrImageBase64(qrUrl, 300))',
          'copy.setBackQrUrl(source.getBackQrUrl())',
          'copy.setBackQrPayload(source.getBackQrPayload())',
          'copy.setBackQrImageBase64(source.getBackQrImageBase64())',
        ],
      },
    ],
    serviceFile: 'src/services/workbench/qrcodeService.ts',
    serviceSnippets: [
      'export interface NameplatePreviewInfo',
      'backQrUrl: string',
      'backQrPayload: string',
      'backQrImageBase64: string',
      'pdfPreviewImageBase64: string',
      'backQrToken: String(result.backQrToken || result.backQrUrl || result.backQrPayload || \'\')',
      'backQrUrl: String(result.backQrUrl || result.backQrToken || \'\')',
      'backQrPayload: String(result.backQrPayload || result.backQrUrl || result.backQrToken || \'\')',
      'backQrImageBase64: String(result.backQrImageBase64 || \'\')',
      'const file = await httpClient.download(`/api/nameplates/${encodeURIComponent(elderId)}/pdf`)',
      "fileType: 'pdf'",
    ],
  },
];

const methodByAnnotation = {
  GetMapping: 'GET',
  PostMapping: 'POST',
  PutMapping: 'PUT',
  PatchMapping: 'PATCH',
  DeleteMapping: 'DELETE',
};

async function collectFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }
    return [fullPath];
  }));
  return nested.flat();
}

function extractFirstString(annotationArgs = '') {
  const match = annotationArgs.match(/"([^"]*)"/);
  return match ? match[1] : '';
}

function joinPath(left, right) {
  const combined = `${left || ''}/${right || ''}`;
  return combined.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function normalizeRoute(route) {
  return route
    .split('?')[0]
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/\{[^}]+\}/g, '{}');
}

function routeKey(method, route) {
  return `${method.toUpperCase()} ${normalizeRoute(route)}`;
}

async function extractBackendRoutes() {
  const controllerFiles = (await collectFiles(backendRoot)).filter((filePath) => filePath.endsWith('Controller.java'));
  const routes = [];

  for (const filePath of controllerFiles) {
    const source = await fsp.readFile(filePath, 'utf8');
    const base = extractFirstString(source.match(/@RequestMapping\(([^)]*)\)/)?.[1] || '');
    const annotationPattern = /@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping)(?:\(([^)]*)\))?/g;
    for (const match of source.matchAll(annotationPattern)) {
      const method = methodByAnnotation[match[1]];
      const route = joinPath(base, extractFirstString(match[2] || ''));
      routes.push({
        method,
        route,
        key: routeKey(method, route),
        source: path.relative(repoRoot, filePath).replaceAll(path.sep, '/'),
      });
    }
  }

  return routes;
}

for (const [, , serviceFile, needles] of contracts) {
  const servicePath = path.join(projectRoot, serviceFile);
  assert.ok(fs.existsSync(servicePath), `service file missing: ${serviceFile}`);
  const serviceSource = await fsp.readFile(servicePath, 'utf8');
  for (const needle of needles) {
    assert.ok(serviceSource.includes(needle), `${serviceFile} missing service endpoint fragment: ${needle}`);
  }
}

const contractsByServiceFile = new Map();
for (const [, , serviceFile, needles] of contracts) {
  const existing = contractsByServiceFile.get(serviceFile) || [];
  existing.push(needles);
  contractsByServiceFile.set(serviceFile, existing);
}

for (const [serviceFile, contractNeedleSets] of contractsByServiceFile.entries()) {
  const servicePath = path.join(projectRoot, serviceFile);
  const serviceSource = await fsp.readFile(servicePath, 'utf8');
  const apiLiterals = [...serviceSource.matchAll(/[`'"]([^`'"]*\/api\/[^`'"]*)[`'"]/g)]
    .map((match) => match[1])
    .filter((literal) => literal.startsWith('/api/'))
    .filter((literal) => !literal.includes('/api_cache__'));

  for (const literal of apiLiterals) {
    const tracked = contractNeedleSets.some((needles) => needles.every((needle) => literal.includes(needle)));
    assert.ok(tracked, `${serviceFile} has untracked backend API literal: ${literal}`);
  }
}

const backendRoutes = await extractBackendRoutes();
const backendRouteMap = new Map(backendRoutes.map((route) => [route.key, route]));

const missingContracts = [];
for (const [method, route] of contracts) {
  const key = routeKey(method, route);
  if (!backendRouteMap.has(key)) {
    missingContracts.push(`${method} ${route}`);
  }
}

assert.deepEqual(missingContracts, [], `backend route contract missing: ${missingContracts.join(', ')}`);

for (const responseContract of responseShapeContracts) {
  const backendSource = await fsp.readFile(path.join(repoRoot, responseContract.backendFile), 'utf8');
  for (const snippet of responseContract.backendSnippets) {
    assert.ok(backendSource.includes(snippet), `${responseContract.label} missing backend snippet: ${snippet}`);
  }

  for (const extraBackendFile of responseContract.extraBackendFiles || []) {
    const extraBackendSource = await fsp.readFile(path.join(repoRoot, extraBackendFile.file), 'utf8');
    for (const snippet of extraBackendFile.snippets) {
      assert.ok(extraBackendSource.includes(snippet), `${responseContract.label} missing backend snippet in ${extraBackendFile.file}: ${snippet}`);
    }
  }

  const serviceSource = await fsp.readFile(path.join(projectRoot, responseContract.serviceFile), 'utf8');
  for (const snippet of responseContract.serviceSnippets) {
    assert.ok(serviceSource.includes(snippet), `${responseContract.label} missing service snippet: ${snippet}`);
  }
}

const coveredControllers = [...new Set(contracts.map(([method, route]) => backendRouteMap.get(routeKey(method, route))?.source).filter(Boolean))].sort();

console.log('backend contract checks passed');
console.log(`contracts: ${contracts.length}`);
console.log(`backendRoutesScanned: ${backendRoutes.length}`);
console.log(`responseShapeContracts: ${responseShapeContracts.length}`);
console.log('coveredControllers:');
for (const controller of coveredControllers) {
  console.log(`- ${controller}`);
}
