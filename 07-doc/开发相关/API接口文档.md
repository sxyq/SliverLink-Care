# SilverLink Care（智联名牌）API 接口文档

## 目录

1. [概述与认证机制](#1-概述与认证机制)
2. [统一响应格式](#2-统一响应格式)
3. [扫码用户端接口](#3-扫码用户端接口-api-scan)
4. [志愿者填写端接口](#4-志愿者填写端接口-api-volunteer--api-elder)
5. [家属入口端接口](#5-家属入口端接口-api-family)
6. [管理后台端接口](#6-管理后台端接口-api-admin)
7. [短信中继端接口](#7-短信中继端接口-api-sms-relay)
8. [通用服务接口](#8-通用服务接口)
9. [数据模型与枚举值](#9-数据模型与枚举值)
10. [前端页面与 API 对应关系](#10-前端页面与-api-对应关系)
11. [HTTP 状态码与错误响应](#11-http-状态码与错误响应)

---

## 1. 概述与认证机制

### 1.1 系统架构

SilverLink Care 采用五端分离架构：

| 端 | 路径前缀 | 技术栈 | 认证方式 |
|----|---------|--------|---------|
| 扫码用户端 | `/api/scan/*` | React + TypeScript | 无认证 / 短信会话验证 |
| 志愿者填写端 | `/api/volunteer/*`, `/api/elder/*` | React + TypeScript | JWT Bearer Token |
| 家属入口端 | `/api/family/*`, `/api/invitations/*` | React + TypeScript | JWT Bearer Token |
| 管理后台端 | `/api/admin/*` | React + TypeScript | JWT Bearer Token + HMAC-SHA256 请求签名 |
| 短信中继端 | `/api/sms-relay/*` | Android (Kotlin) | 设备密钥 HMAC-SHA256 签名 |

### 1.2 认证机制

#### 1.2.1 JWT 认证（志愿者 / 家属 / 管理后台）

登录成功后，服务器返回 `token`，前端存储于 `localStorage`：

- 志愿者端：`sl_token`
- 家属端：`family_token`
- 管理后台：`sl_admin_token` + `sl_admin_role`

请求头格式：
```
Authorization: Bearer {token}
```

Token 过期或无效时，服务器返回 `401 Unauthorized`，前端自动清除本地 Token 并跳转登录页。

#### 1.2.2 管理后台请求签名

管理后台除 JWT 外，还需对每个请求进行 HMAC-SHA256 签名，防止重放攻击。

签名头：
| 头字段 | 说明 |
|--------|------|
| `X-Timestamp` | 当前 Unix 时间戳（秒） |
| `X-Nonce` | 随机 UUID |
| `X-Signature` | HMAC-SHA256 签名值 |

签名原文格式：
```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{NONCE}
```
示例：
```
GET\n/api/admin/dashboard\n1716643200\n550e8400-e29b-41d4-a716-446655440000
```

签名密钥：`VITE_ADMIN_SIGNATURE_SECRET`（前端环境变量，默认 `demo-admin-signature-secret`）

#### 1.2.3 短信中继设备签名

安卓短信中继端使用设备密钥对请求进行签名：

签名原文格式：
```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{NONCE}\n{BODY}
```

密钥由管理后台在创建设备时分配。

#### 1.2.4 短信验证会话（扫码用户端）

扫码用户端查看敏感信息前，需完成短信验证：

1. 调用 `/api/scan/verification/start` 创建验证会话
2. 用户向指定手机号发送包含验证码的短信
3. 安卓短信中继端将短信上报到 `/api/sms-relay/inbound`
4. 后端匹配验证码后，会话状态变为 `VERIFIED`
5. 前端携带 `sessionId` 查询验证状态，通过后访问敏感接口

---

## 2. 统一响应格式

### 2.1 标准响应信封

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码，`200` 表示成功，`>=400` 表示错误 |
| message | string | 业务提示信息 |
| data | object / array | 实际响应数据 |

### 2.2 错误响应格式

```json
{
  "code": 400,
  "message": "请求参数错误：手机号格式不正确",
  "data": null
}
```

或纯文本错误（部分旧接口）：
```
HTTP 401 Unauthorized
```

---

## 3. 扫码用户端接口 (`/api/scan/*`)

### 3.1 解析二维码 Token

**前端页面**: `01-扫码用户端/src/pages/ScanPage.tsx`

**请求**:
```
POST /api/scan/resolve
Content-Type: application/json
```

**请求体**:
```json
{
  "token": "string (必填, QR Token)"
}
```

**成功响应** (200):
```json
{
  "elderId": "string",
  "archiveNo": "string",
  "name": "string",
  "gender": "string",
  "age": 75,
  "residence": "string",
  "emergencyContactName": "string",
  "emergencyPhoneMasked": "138****8888",
  "emergencyPhoneDial": "13800188888",
  "relationship": "string",
  "aboType": "A",
  "rhType": "阳性",
  "allergySummary": "string"
}
```

**错误响应**:
- `400 Bad Request`: Token 格式错误或已过期
- `404 Not Found`: 该二维码对应的老人档案不存在

**权限要求**: 无（公开接口）

---

### 3.2 微信授权码换取 OpenID

**前端页面**: `01-扫码用户端/src/pages/WechatAuthPage.tsx`

**请求**:
```
POST /api/scan/auth/wechat
Content-Type: application/json
```

**请求体**:
```json
{
  "code": "string (必填, 微信授权码)"
}
```

**成功响应** (200):
```json
{
  "openId": "string",
  "unionId": "string"
}
```

**权限要求**: 无

---

### 3.3 创建短信验证会话

**前端页面**: `01-扫码用户端/src/pages/VerificationPage.tsx`

**请求**:
```
POST /api/scan/verification/start
Content-Type: application/json
```

**请求体**:
```json
{
  "elderId": "string (可选, 当前解析的老人ID)",
  "target": "string (必填, 验证目标: 'emergency' 或 'identity')"
}
```

**成功响应** (200):
```json
{
  "sessionId": "string",
  "elderId": "string",
  "receiverPhone": "13800001111",
  "receiverPhoneMasked": "138****1111",
  "messageBody": "SL AB3CD9EF2A",
  "messagePrefix": "SL",
  "status": "PENDING",
  "expiresAt": "2024-05-25T12:00:00Z"
}
```

**错误响应**:
- `400 Bad Request`: 目标类型不合法
- `429 Too Many Requests`: 验证请求过于频繁

**权限要求**: 无（但需先完成二维码解析获取 elderId）

---

### 3.4 查询验证会话状态

**前端页面**: `01-扫码用户端/src/pages/VerificationPage.tsx`

**请求**:
```
GET /api/scan/verification/status?sessionId={sessionId}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 验证会话ID |

**成功响应** (200):
```json
{
  "sessionId": "string",
  "elderId": "string",
  "status": "PENDING | VERIFIED | EXPIRED",
  "verified": false,
  "verifiedAt": "2024-05-25T12:00:00Z",
  "senderPhoneMasked": "139****2222"
}
```

**权限要求**: 无

---

### 3.5 访客身份登记验证

**前端页面**: `01-扫码用户端/src/pages/IdentityVerifyPage.tsx`

**请求**:
```
POST /api/scan/verification/identity
Content-Type: application/json
```

**请求体**:
```json
{
  "elderId": "string (可选)",
  "target": "string (必填)",
  "name": "string (访客姓名)",
  "idCard": "string (身份证号)",
  "phone": "string (手机号)",
  "smsCode": "string (短信验证码)"
}
```

**成功响应** (200):
```json
{
  "sessionId": "string",
  "elderId": "string",
  "status": "VERIFIED",
  "verified": true,
  "verifiedAt": "2024-05-25T12:00:00Z",
  "senderPhoneMasked": "139****2222"
}
```

**错误响应**:
- `400 Bad Request`: 身份信息不完整
- `401 Unauthorized`: 短信验证码错误

**权限要求**: 无

---

### 3.6 获取详细基础信息（需验证会话）

**前端页面**: `01-扫码用户端/src/pages/BasicInfoPage.tsx`

**请求**:
```
GET /api/scan/basic-info?elderId={elderId}&sessionId={sessionId}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| elderId | string | 是 | 老人ID |
| sessionId | string | 是 | 已验证的会话ID |

**成功响应** (200): 同 3.1 解析接口响应结构

**错误响应**:
- `401 Unauthorized`: 会话未验证或已过期
- `403 Forbidden`: 会话与老人不匹配

**权限要求**: 需通过短信验证的 `sessionId`

---

### 3.7 获取健康档案（需验证会话）

**前端页面**: `01-扫码用户端/src/pages/HealthRecordPage.tsx`

**请求**:
```
GET /api/scan/archive?elderId={elderId}&sessionId={sessionId}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| elderId | string | 是 | 老人ID |
| sessionId | string | 是 | 已验证的会话ID |

**成功响应** (200):
```json
{
  "date": "2024-05-20",
  "volunteer": "张志愿者",
  "heightCm": 165,
  "weightKg": 62,
  "waistCm": 82,
  "bmi": 22.8,
  "healthSelfAssessment": "良好",
  "selfCareAssessment": "完全自理",
  "cognitiveScreening": "正常",
  "emotionScreening": "正常"
}
```

**权限要求**: 需通过短信验证的 `sessionId`

---

### 3.8 获取用药记录（需验证会话）

**前端页面**: `01-扫码用户端/src/pages/MedicationPage.tsx`

**请求**:
```
GET /api/scan/medications?elderId={elderId}&sessionId={sessionId}
```

**查询参数**: 同 3.6

**成功响应** (200):
```json
[
  {
    "name": "阿司匹林",
    "dosage": "100mg",
    "usage": "口服",
    "time": "每日一次"
  }
]
```

**权限要求**: 需通过短信验证的 `sessionId`

---

### 3.9 获取量表记录（需验证会话）

**前端页面**: `01-扫码用户端/src/pages/ScalePage.tsx`

**请求**:
```
GET /api/scan/scales?elderId={elderId}&sessionId={sessionId}
```

**查询参数**: 同 3.6

**成功响应** (200):
```json
[
  {
    "scale": "PHQ-9",
    "name": "PHQ-9",
    "score": 4,
    "date": "2024-05-20",
    "updatedAt": "2024-05-20T10:00:00Z",
    "volunteer": "张志愿者",
    "answers": [
      { "question": "兴趣减退", "value": 1 },
      { "question": "情绪低落", "value": 1 }
    ]
  }
]
```

**权限要求**: 需通过短信验证的 `sessionId`

---

## 4. 志愿者填写端接口 (`/api/volunteer/*` + `/api/elder/*`)

### 4.1 志愿者登录

**前端页面**: `02-志愿者填写端/src/pages/LoginPage.tsx`

**请求**:
```
POST /api/volunteer/login
Content-Type: application/json
```

**请求体**:
```json
{
  "account": "string (必填, 账号)",
  "password": "string (必填, 密码)"
}
```

**成功响应** (200):
```json
{
  "token": "string (JWT)",
  "name": "string"
}
```

**错误响应**:
- `401 Unauthorized`: 账号或密码错误

**权限要求**: 无

---

### 4.2 邀请码预览

**前端页面**: `02-志愿者填写端/src/pages/RegisterPage.tsx`

**请求**:
```
GET /api/invitations/{code}/preview
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 邀请码 |

**成功响应** (200):
```json
{
  "code": "INVITE001",
  "elderName": "王大爷",
  "elderAge": 78,
  "elderArchiveNo": "SL20240001",
  "status": "未使用",
  "expiresAt": "2024-06-01T00:00:00Z",
  "maxUses": 1,
  "usedCount": 0
}
```

**错误响应**:
- `404 Not Found`: 邀请码不存在
- `410 Gone`: 邀请码已过期或已使用

**权限要求**: 无

---

### 4.3 志愿者注册

**前端页面**: `02-志愿者填写端/src/pages/RegisterPage.tsx`

**请求**:
```
POST /api/volunteer/register
Content-Type: application/json
```

**请求体**:
```json
{
  "invitationCode": "string (必填)",
  "account": "string (必填, 3-20字符)",
  "password": "string (必填, 至少6字符)",
  "name": "string (必填)",
  "phone": "string (必填, 手机号)"
}
```

**成功响应** (200):
```json
{
  "token": "string (JWT)",
  "name": "string"
}
```

**错误响应**:
- `409 Conflict`: 账号已存在
- `400 Bad Request`: 邀请码无效或已使用

**权限要求**: 无（需有效邀请码）

---

### 4.4 获取负责老人列表

**前端页面**: `02-志愿者填写端/src/pages/ElderListPage.tsx`

**请求**:
```
GET /api/volunteer/me/elders
Authorization: Bearer {token}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "archiveNo": "SL20240001",
    "name": "王大爷",
    "gender": "男",
    "age": 78,
    "residence": "北京市朝阳区",
    "emergencyContactName": "王小明",
    "emergencyContactPhone": "13800188888",
    "emergencyContactRelation": "儿子",
    "aboType": "A",
    "rhType": "阳性",
    "allergySummary": "青霉素过敏",
    "lastVisitDate": "2024-05-20",
    "status": "在档"
  }
]
```

**权限要求**: JWT（志愿者身份）

---

### 4.5 获取个人资料

**前端页面**: `02-志愿者填写端/src/pages/ProfilePage.tsx`

**请求**:
```
GET /api/volunteer/me/profile
Authorization: Bearer {token}
```

**成功响应** (200):
```json
{
  "account": "volunteer01",
  "name": "张志愿者",
  "phone": "13800111111"
}
```

**权限要求**: JWT（志愿者身份）

---

### 4.6 更新个人资料

**前端页面**: `02-志愿者填写端/src/pages/ProfilePage.tsx`

**请求**:
```
PUT /api/volunteer/me/profile
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "account": "string",
  "name": "string",
  "phone": "string",
  "currentPassword": "string (修改密码时必填)",
  "password": "string (新密码, 可选)"
}
```

**成功响应** (200):
```json
{
  "account": "volunteer01",
  "name": "张志愿者",
  "phone": "13800111111",
  "token": "string (新JWT)"
}
```

**错误响应**:
- `400 Bad Request`: 当前密码错误

**权限要求**: JWT（志愿者身份）

---

### 4.7 创建老人档案

**前端页面**: `02-志愿者填写端/src/pages/CreateElderPage.tsx`

**请求**:
```
POST /api/volunteer/me/elders
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "string (必填)",
  "gender": "男 | 女",
  "age": 78,
  "residence": "string",
  "emergencyContactName": "string",
  "emergencyContactPhone": "string",
  "emergencyContactRelation": "string",
  "aboType": "string (ABO血型)",
  "rhType": "string (Rh血型)",
  "allergySummary": "string"
}
```

**成功响应** (200):
```json
{
  "id": "string"
}
```

**权限要求**: JWT（志愿者身份）

---

### 4.8 查看老人二维码管理信息

**前端页面**: `02-志愿者填写端/src/pages/QrManagePage.tsx`

**请求**:
```
GET /api/volunteer/me/elders/{elderId}/qr-manage
Authorization: Bearer {token}
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| elderId | string | 老人ID |

**成功响应** (200):
```json
{
  "id": "string",
  "qrId": "string",
  "elderId": "string",
  "archiveNo": "SL20240001",
  "elderName": "王大爷",
  "elderAge": 78,
  "elderPhone": "13800188888",
  "status": "ENABLED",
  "createdAt": "2024-05-01T00:00:00Z",
  "token": "string",
  "url": "string",
  "securityNote": "string",
  "disableReviewStatus": "string",
  "disableReviewId": "string",
  "reviewMessage": "string"
}
```

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.9 重新生成二维码

**前端页面**: `02-志愿者填写端/src/pages/QrManagePage.tsx`

**请求**:
```
POST /api/volunteer/me/elders/{elderId}/qr-regenerate
Authorization: Bearer {token}
```

**路径参数**: 同 4.8

**成功响应** (200): 同 4.8 响应结构

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.10 申请禁用二维码

**前端页面**: `02-志愿者填写端/src/pages/QrManagePage.tsx`

**请求**:
```
PUT /api/volunteer/me/elders/{elderId}/qr-disable
Authorization: Bearer {token}
```

**路径参数**: 同 4.8

**成功响应** (200): 同 4.8 响应结构（状态变为 DISABLED 或进入审核流程）

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.11 保存老人基础信息

**前端页面**: `02-志愿者填写端/src/pages/BasicInfoFormPage.tsx`

**请求**:
```
PUT /api/elder/{elderId}/basic
Authorization: Bearer {token}
Content-Type: application/json
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| elderId | string | 老人ID |

**请求体**:
```json
{
  "name": "string",
  "gender": "男 | 女",
  "age": 78,
  "residence": "string",
  "emergencyContactName": "string",
  "emergencyPhone": "string",
  "relationship": "string",
  "aboType": "string",
  "rhType": "string",
  "allergySummary": "string"
}
```

**成功响应** (200):
```json
{
  "recordId": "string"
}
```

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.12 保存健康档案记录

**前端页面**: `02-志愿者填写端/src/pages/HealthFormPage.tsx`

**请求**:
```
POST /api/elder/{elderId}/health-records
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "date": "2024-05-25",
  "heightCm": 165,
  "weightKg": 62,
  "waistCm": 82,
  "bmi": 22.8,
  "healthSelfAssessment": "string",
  "selfCareAssessment": "string",
  "cognitiveScreening": "string",
  "emotionScreening": "string"
}
```

**成功响应** (200):
```json
{
  "recordId": "string"
}
```

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.13 保存用药记录

**前端页面**: `02-志愿者填写端/src/pages/MedicationFormPage.tsx`

**请求**:
```
POST /api/elder/{elderId}/medications
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
[
  {
    "id": "string (可选, 更新时填写)",
    "name": "string",
    "dosage": "string",
    "usage": "string",
    "timing": "string",
    "time": "string"
  }
]
```

**成功响应** (200):
```json
{
  "recordId": "string"
}
```

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.14 保存量表评估记录

**前端页面**: `02-志愿者填写端/src/pages/ScaleFormPage.tsx`

**请求**:
```
POST /api/elder/{elderId}/scale-records
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
[
  {
    "name": "PHQ-9",
    "scale": "PHQ-9",
    "score": 4,
    "date": "2024-05-25",
    "answers": [
      { "question": "兴趣减退", "value": 1 },
      { "question": "情绪低落", "value": 1 }
    ]
  }
]
```

**成功响应** (200):
```json
{
  "recordId": "string"
}
```

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

### 4.15 查询量表记录

**前端页面**: `02-志愿者填写端/src/pages/ScaleHistoryPage.tsx`

**请求**:
```
GET /api/elder/{elderId}/scale-records
Authorization: Bearer {token}
```

**成功响应** (200):
```json
[
  {
    "scale": "PHQ-9",
    "name": "PHQ-9",
    "score": 4,
    "date": "2024-05-25",
    "volunteer": "张志愿者",
    "answers": [
      { "question": "兴趣减退", "value": 1 }
    ]
  }
]
```

**权限要求**: JWT（志愿者身份，且需负责该老人）

---

## 5. 家属入口端接口 (`/api/family/*`)

### 5.1 家属登录

**前端页面**: `02-志愿者填写端/src/family-entry/pages/LoginPage.tsx`

**请求**:
```
POST /api/family/login
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "string (必填, 手机号)",
  "password": "string (必填, 密码)"
}
```

**成功响应** (200):
```json
{
  "token": "string (JWT)",
  "name": "string",
  "phone": "string",
  "relationship": "string"
}
```

**错误响应**:
- `401 Unauthorized`: 手机号或密码错误

**权限要求**: 无

---

### 5.2 获取绑定老人列表

**前端页面**: `02-志愿者填写端/src/family-entry/pages/ElderListPage.tsx`

**请求**:
```
GET /api/family/me/elders
Authorization: Bearer {token}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "archiveNo": "SL20240001",
    "name": "王大爷",
    "age": 78,
    "gender": "男",
    "bloodType": "A型",
    "allergyHistory": "青霉素过敏",
    "emergencyContactName": "王小明",
    "emergencyContactPhone": "13800188888",
    "emergencyContactRelation": "儿子",
    "backupContactName": "王小华",
    "backupContactPhone": "13900199999",
    "backupContactRelation": "女儿"
  }
]
```

**权限要求**: JWT（家属身份）

---

### 5.3 获取老人详情

**前端页面**: `02-志愿者填写端/src/family-entry/pages/ElderDetailPage.tsx`

**请求**:
```
GET /api/family/elders/{elderId}
Authorization: Bearer {token}
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| elderId | string | 老人ID |

**成功响应** (200): 同 5.2 单条结构

**错误响应**:
- `403 Forbidden`: 该家属未绑定此老人

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.4 更新紧急联系人

**前端页面**: `02-志愿者填写端/src/family-entry/pages/ContactsPage.tsx`

**请求**:
```
PUT /api/family/elders/{elderId}/contacts
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "emergencyContactName": "string",
  "emergencyContactPhone": "string",
  "emergencyContactRelation": "string",
  "backupContactName": "string",
  "backupContactPhone": "string",
  "backupContactRelation": "string"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "联系人信息已更新"
}
```

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.5 获取用药记录

**前端页面**: `02-志愿者填写端/src/family-entry/pages/MedicationPage.tsx`

**请求**:
```
GET /api/family/elders/{elderId}/medications
Authorization: Bearer {token}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "name": "阿司匹林",
    "dosage": "100mg",
    "usage": "口服",
    "timing": "每日一次",
    "updatedAt": "2024-05-20T10:00:00Z"
  }
]
```

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.6 新增用药记录

**前端页面**: `02-志愿者填写端/src/family-entry/pages/MedicationPage.tsx`

**请求**:
```
POST /api/family/elders/{elderId}/medications
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "string",
  "dosage": "string",
  "usage": "string",
  "timing": "string"
}
```

**成功响应** (200): 同 5.5 单条结构

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.7 修改用药记录

**前端页面**: `02-志愿者填写端/src/family-entry/pages/MedicationPage.tsx`

**请求**:
```
PUT /api/family/elders/{elderId}/medications/{medicationId}
Authorization: Bearer {token}
Content-Type: application/json
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| elderId | string | 老人ID |
| medicationId | string | 用药记录ID |

**请求体**: 同 5.6

**成功响应** (200): 同 5.5 单条结构

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.8 删除用药记录

**前端页面**: `02-志愿者填写端/src/family-entry/pages/MedicationPage.tsx`

**请求**:
```
DELETE /api/family/elders/{elderId}/medications/{medicationId}
Authorization: Bearer {token}
```

**成功响应** (200):
```json
{
  "success": true
}
```

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.9 查看二维码

**前端页面**: `02-志愿者填写端/src/family-entry/pages/QrCodePage.tsx`

**请求**:
```
GET /api/family/elders/{elderId}/qrcode
Authorization: Bearer {token}
```

**成功响应** (200):
```json
{
  "elderId": "string",
  "token": "string",
  "status": "启用",
  "createdAt": "2024-05-01T00:00:00Z",
  "pdfUrl": "string",
  "disableReviewStatus": "string",
  "disableReviewId": "string",
  "reviewMessage": "string"
}
```

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.10 申请禁用二维码

**前端页面**: `02-志愿者填写端/src/family-entry/pages/QrCodePage.tsx`

**请求**:
```
POST /api/family/elders/{elderId}/qrcode/disable-request
Authorization: Bearer {token}
```

**成功响应** (200): 同 5.9 响应结构

**权限要求**: JWT（家属身份，且需绑定该老人）

---

### 5.11 邀请码注册家属账号

**前端页面**: `02-志愿者填写端/src/family-entry/pages/InviteRegisterPage.tsx`

**请求**:
```
POST /api/invitations/{code}/register
Content-Type: application/json
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 邀请码 |

**请求体**:
```json
{
  "code": "string",
  "name": "string",
  "phone": "string",
  "relationship": "string",
  "password": "string",
  "smsCode": "string"
}
```

**成功响应** (200):
```json
{
  "token": "string",
  "success": true,
  "message": "注册成功"
}
```

**权限要求**: 无（需有效邀请码和短信验证码）

---

### 5.12 发送注册短信验证码

**前端页面**: `02-志愿者填写端/src/family-entry/pages/InviteRegisterPage.tsx`

**请求**:
```
POST /api/invitations/{code}/send-sms
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "string"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

**权限要求**: 无

---

### 5.13 通用短信发送

**前端页面**: `02-志愿者填写端/src/family-entry/pages/VerificationPage.tsx`

**请求**:
```
POST /api/sms/send
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "string",
  "scene": "FAMILY_VERIFY"
}
```

**成功响应** (200):
```json
{
  "phone": "string",
  "maskedPhone": "138****1111"
}
```

**权限要求**: 无

---

### 5.14 通用短信验证码校验

**前端页面**: `02-志愿者填写端/src/family-entry/pages/VerificationPage.tsx`

**请求**:
```
POST /api/sms/verify
Content-Type: application/json
```

**请求体**:
```json
{
  "phone": "string",
  "code": "string",
  "scene": "FAMILY_VERIFY"
}
```

**成功响应** (200):
```json
{
  "verified": true,
  "ok": true
}
```

**错误响应**:
- `400 Bad Request`: 验证码错误或已过期

**权限要求**: 无

---

## 6. 管理后台端接口 (`/api/admin/*`)

### 6.1 管理员登录

**前端页面**: `03-管理后台端/src/pages/LoginPage.tsx`

**请求**:
```
POST /api/admin/login
Content-Type: application/json
```

**请求体**:
```json
{
  "account": "string (必填)",
  "password": "string (必填)"
}
```

**成功响应** (200):
```json
{
  "token": "string (JWT)",
  "role": "系统管理员"
}
```

**错误响应**:
- `401 Unauthorized`: 账号或密码错误

**权限要求**: 无

---

### 6.2 管理员退出登录

**前端页面**: `03-管理后台端/src/layouts/AdminLayout.tsx`

**请求**:
```
POST /api/admin/logout
Authorization: Bearer {token}
```

**成功响应** (200): 无内容或 `{ "ok": true }`

**权限要求**: JWT（管理员身份）+ HMAC 签名

---

### 6.3 数据仪表盘

**前端页面**: `03-管理后台端/src/pages/DashboardPage.tsx`

**请求**:
```
GET /api/admin/dashboard
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
{
  "elderCount": 120,
  "volunteerCount": 45,
  "qrCodeCount": 120,
  "auditCount": 3560
}
```

**权限要求**: JWT（管理员身份）+ HMAC 签名

---

### 6.4 老人档案列表

**前端页面**: `03-管理后台端/src/pages/ElderManagePage.tsx`

**请求**:
```
GET /api/admin/elders
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "archiveNo": "SL20240001",
    "name": "王大爷",
    "gender": "男",
    "age": 78,
    "residence": "北京市朝阳区",
    "phoneMasked": "138****8888",
    "aboType": "A",
    "rhType": "阳性",
    "volunteer": "张志愿者",
    "status": "ACTIVE"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.5 创建老人档案

**前端页面**: `03-管理后台端/src/pages/ElderCreatePage.tsx`

**请求**:
```
POST /api/admin/elders
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**: 同 4.7 志愿者创建老人档案

**成功响应** (200):
```json
{
  "id": "string"
}
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.6 更新老人档案

**前端页面**: `03-管理后台端/src/pages/ElderEditPage.tsx`

**请求**:
```
PUT /api/admin/elders/{id}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 老人ID |

**请求体**: 同 6.5

**成功响应** (200): 无内容或更新后的老人对象

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.7 删除老人档案

**前端页面**: `03-管理后台端/src/pages/ElderManagePage.tsx`

**请求**:
```
DELETE /api/admin/elders/{id}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (204): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.8 更新老人状态

**前端页面**: `03-管理后台端/src/pages/ElderManagePage.tsx`

**请求**:
```
PUT /api/admin/elders/{id}/status
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "status": "ACTIVE | DISABLED"
}
```

**成功响应** (200): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.9 志愿者列表

**前端页面**: `03-管理后台端/src/pages/VolunteerManagePage.tsx`

**请求**:
```
GET /api/admin/volunteers
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "name": "张志愿者",
    "account": "volunteer01",
    "phone": "13800111111",
    "elderCount": 5,
    "status": "ACTIVE",
    "lastSubmit": "2024-05-20",
    "createdAt": "2024-01-01",
    "createMethod": "邀请码注册",
    "invitationCode": "INVITE001"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.10 创建志愿者

**前端页面**: `03-管理后台端/src/pages/VolunteerCreatePage.tsx`

**请求**:
```
POST /api/admin/volunteers
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "account": "string",
  "password": "string",
  "name": "string",
  "phone": "string"
}
```

**成功响应** (200):
```json
{
  "id": "string"
}
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.11 更新志愿者

**前端页面**: `03-管理后台端/src/pages/VolunteerEditPage.tsx`

**请求**:
```
PUT /api/admin/volunteers/{id}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "string",
  "phone": "string",
  "status": "ACTIVE | DISABLED"
}
```

**成功响应** (200): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.12 设置志愿者数据范围

**前端页面**: `03-管理后台端/src/pages/VolunteerScopePage.tsx`

**请求**:
```
PUT /api/admin/volunteers/{id}/scope
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "elderIds": ["elder-id-1", "elder-id-2"]
}
```

**成功响应** (200): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.13 删除志愿者

**前端页面**: `03-管理后台端/src/pages/VolunteerManagePage.tsx`

**请求**:
```
DELETE /api/admin/volunteers/{id}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (204): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.14 二维码列表

**前端页面**: `03-管理后台端/src/pages/QrCodeManagePage.tsx`

**请求**:
```
GET /api/admin/qrcodes
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "qrId": "string",
    "archiveNo": "SL20240001",
    "elderName": "王大爷",
    "elderAge": 78,
    "elderPhone": "13800188888",
    "relayDeviceId": "device-001",
    "relayReceiverPhone": "13800001111",
    "url": "string",
    "status": "ENABLED",
    "createdAt": "2024-05-01T00:00:00Z"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.15 生成二维码

**前端页面**: `03-管理后台端/src/pages/QrCodeManagePage.tsx`

**请求**:
```
POST /api/admin/qrcodes
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "elderId": "string",
  "archiveNo": "string"
}
```

**成功响应** (200):
```json
{
  "id": "string",
  "qrId": "string",
  "url": "string"
}
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.16 禁用二维码

**前端页面**: `03-管理后台端/src/pages/QrCodeManagePage.tsx`

**请求**:
```
PUT /api/admin/qrcodes/{id}/disable
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.17 重新生成二维码

**前端页面**: `03-管理后台端/src/pages/QrCodeManagePage.tsx`

**请求**:
```
POST /api/admin/qrcodes/{id}/regenerate
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
{
  "id": "string",
  "qrId": "string",
  "url": "string"
}
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.18 绑定短信中转设备

**前端页面**: `03-管理后台端/src/pages/QrCodeManagePage.tsx`

**请求**:
```
PUT /api/admin/qrcodes/{id}/relay-device
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "relayDeviceId": "string"
}
```

**成功响应** (200):
```json
{
  "id": "string",
  "relayDeviceId": "device-001",
  "relayReceiverPhone": "13800001111"
}
```

**权限要求**: JWT（管理员身份，仅系统管理员可操作）+ HMAC 签名

---

### 6.19 邀请码列表

**前端页面**: `03-管理后台端/src/pages/InvitationManagePage.tsx`

**请求**:
```
GET /api/admin/invitations
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "code": "INVITE001",
    "elderId": "string",
    "elderName": "王大爷",
    "archiveNo": "SL20240001",
    "expiresAt": "2024-06-01T00:00:00Z",
    "maxUses": 1,
    "usedCount": 0,
    "status": "ACTIVE",
    "createdAt": "2024-05-01T00:00:00Z"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.20 创建邀请码

**前端页面**: `03-管理后台端/src/pages/InvitationCreatePage.tsx`

**请求**:
```
POST /api/admin/invitations
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "elderId": "string",
  "expiresInDays": 30,
  "maxUses": 1
}
```

**成功响应** (200): 同 6.19 单条结构

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.21 禁用邀请码

**前端页面**: `03-管理后台端/src/pages/InvitationManagePage.tsx`

**请求**:
```
PUT /api/admin/invitations/{id}/disable
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.22 删除邀请码

**前端页面**: `03-管理后台端/src/pages/InvitationManagePage.tsx`

**请求**:
```
DELETE /api/admin/invitations/{id}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (204): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.23 家属绑定列表

**前端页面**: `03-管理后台端/src/pages/FamilyBindingPage.tsx`

**请求**:
```
GET /api/admin/family-bindings
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "familyName": "王小明",
    "familyPhoneMasked": "138****8888",
    "relationship": "儿子",
    "elderName": "王大爷",
    "elderArchiveNo": "SL20240001",
    "invitationCode": "INVITE001",
    "boundAt": "2024-05-01T00:00:00Z",
    "status": "ACTIVE",
    "createMethod": "邀请码注册"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.24 解除家属绑定

**前端页面**: `03-管理后台端/src/pages/FamilyBindingPage.tsx`

**请求**:
```
PUT /api/admin/family-bindings/{id}/disable
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200): 无内容

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.25 审核请求列表

**前端页面**: `03-管理后台端/src/pages/ReviewRequestPage.tsx`

**请求**:
```
GET /api/admin/review-requests?status={status}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选: `PENDING`, `APPROVED`, `REJECTED`，默认 `PENDING` |

**成功响应** (200):
```json
[
  {
    "id": "string",
    "type": "QR_DISABLE",
    "title": "禁用二维码申请",
    "summary": "志愿者申请禁用王大爷的二维码",
    "targetId": "string",
    "targetLabel": "二维码 #001",
    "elderId": "string",
    "elderName": "王大爷",
    "archiveNo": "SL20240001",
    "qrCodeId": "string",
    "qrStatus": "ENABLED",
    "requesterAccount": "volunteer01",
    "requesterRole": "VOLUNTEER",
    "requesterRoleLabel": "志愿者",
    "requesterNote": "老人已搬迁",
    "status": "PENDING",
    "createdAt": "2024-05-01T00:00:00Z",
    "handledAt": "",
    "handledBy": "",
    "resultNote": ""
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.26 通过审核请求

**前端页面**: `03-管理后台端/src/pages/ReviewRequestPage.tsx`

**请求**:
```
POST /api/admin/review-requests/{id}/approve
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200): 同 6.25 单条结构（status 变为 `APPROVED`）

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.27 拒绝审核请求

**前端页面**: `03-管理后台端/src/pages/ReviewRequestPage.tsx`

**请求**:
```
POST /api/admin/review-requests/{id}/reject
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "note": "string (拒绝原因)"
}
```

**成功响应** (200): 同 6.25 单条结构（status 变为 `REJECTED`）

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.28 审计日志列表

**前端页面**: `03-管理后台端/src/pages/AuditLogPage.tsx`

**请求**:
```
GET /api/admin/audit-logs
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "time": "2024-05-25T10:00:00Z",
    "operator": "admin01",
    "role": "系统管理员",
    "action": "创建老人档案",
    "verificationMethod": "密码登录",
    "visitorName": "",
    "visitorPhone": "",
    "visitorPhoneMasked": "",
    "visitorIdCard": "",
    "visitorIdCardMasked": "",
    "target": "王大爷(SL20240001)",
    "ip": "192.168.1.1",
    "result": "成功"
  }
]
```

**权限要求**: JWT（管理员或审计员身份）+ HMAC 签名

---

### 6.29 用药记录查询

**前端页面**: `03-管理后台端/src/pages/MedicationManagePage.tsx`

**请求**:
```
GET /api/admin/medications?elderId={elderId}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| elderId | string | 否 | 按老人ID筛选 |

**成功响应** (200):
```json
[
  {
    "id": "string",
    "elderId": "string",
    "archiveNo": "SL20240001",
    "elderName": "王大爷",
    "drugName": "阿司匹林",
    "dosage": "100mg",
    "usage": "口服",
    "timing": "每日一次",
    "updatedAt": "2024-05-20T10:00:00Z",
    "status": "使用中"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.30 量表记录查询

**前端页面**: `03-管理后台端/src/pages/ScaleManagePage.tsx`

**请求**:
```
GET /api/admin/scales?elderId={elderId}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| elderId | string | 否 | 按老人ID筛选 |

**成功响应** (200):
```json
[
  {
    "id": "string",
    "elderId": "string",
    "archiveNo": "SL20240001",
    "elderName": "王大爷",
    "scaleName": "PHQ-9",
    "score": 4,
    "date": "2024-05-20",
    "volunteer": "张志愿者"
  }
]
```

**权限要求**: JWT（管理员或项目管理员身份）+ HMAC 签名

---

### 6.31 角色列表

**前端页面**: `03-管理后台端/src/pages/RoleManagePage.tsx`

**请求**:
```
GET /api/admin/roles
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "role": "系统管理员",
    "dataScope": "全部",
    "menuPermissions": ["dashboard", "elder", "volunteer", "qrcode", "invitation", "family", "review", "audit", "sms-relay", "role"],
    "apiPermissions": ["GET/POST /api/admin/elders", "GET/POST /api/admin/qrcodes", "GET/POST /api/admin/volunteers", "GET /api/sms-relay/admin/*"],
    "exportPermissions": ["elder", "volunteer", "audit"]
  }
]
```

**权限要求**: JWT（系统管理员身份）+ HMAC 签名

---

### 6.32 权限列表

**前端页面**: `03-管理后台端/src/pages/RoleManagePage.tsx`

**请求**:
```
GET /api/admin/permissions
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200): 权限配置对象

**权限要求**: JWT（系统管理员身份）+ HMAC 签名

---

## 7. 短信中继端接口 (`/api/sms-relay/*`)

### 7.1 短信上报（安卓端 → 后端）

**调用端**: `05-安卓短信中转端`

**请求**:
```
POST /api/sms-relay/inbound
X-Device-Id: {deviceId}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "deviceId": "string (必填)",
  "receiverPhone": "string (必填, 接收方手机号)",
  "senderPhone": "string (必填, 发送方手机号)",
  "messageBody": "string (必填, 短信内容)",
  "receivedAt": "string (ISO8601时间)"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "recordId": "string"
}
```

**错误响应**:
- `401 Unauthorized`: 设备签名验证失败
- `403 Forbidden`: 设备未注册或已禁用

**权限要求**: 设备密钥 HMAC-SHA256 签名

---

### 7.2 心跳上报

**调用端**: `05-安卓短信中转端`

**请求**:
```
POST /api/sms-relay/heartbeat
X-Device-Id: {deviceId}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "deviceId": "string (必填)",
  "status": "string (设备状态)",
  "batteryLevel": 85,
  "networkType": "4G"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "serverTime": "2024-05-25T10:00:00Z"
}
```

**权限要求**: 设备密钥 HMAC-SHA256 签名

---

### 7.3 获取设备配置

**调用端**: `05-安卓短信中转端`

**请求**:
```
GET /api/sms-relay/devices/{deviceId}/config
X-Device-Id: {deviceId}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| deviceId | string | 设备ID |

**成功响应** (200):
```json
{
  "deviceId": "device-001",
  "receiverPhone": "13800001111",
  "serverUrl": "https://api.silverlink.care",
  "messagePrefix": "SL",
  "heartbeatInterval": 60
}
```

**权限要求**: 设备密钥 HMAC-SHA256 签名

---

### 7.4 查看中转记录（管理后台）

**前端页面**: `03-管理后台端/src/pages/SmsRelayPage.tsx`

**请求**:
```
GET /api/sms-relay/admin/records
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "id": "string",
    "deviceId": "device-001",
    "receiverPhone": "13800001111",
    "senderPhone": "139****2222",
    "messageBody": "SL AB3CD9EF2A",
    "receivedAt": "2024-05-25 10:00:00",
    "uploadedAt": "2024-05-25 10:00:05",
    "status": "已验证"
  }
]
```

**权限要求**: JWT（管理员身份）+ HMAC 签名

---

### 7.5 查看设备列表（管理后台）

**前端页面**: `03-管理后台端/src/pages/SmsRelayPage.tsx`

**请求**:
```
GET /api/sms-relay/admin/devices
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "deviceId": "device-001",
    "receiverPhone": "13800001111",
    "serverUrl": "https://api.silverlink.care",
    "messagePrefix": "SL",
    "status": "在线",
    "serviceStatus": "正常",
    "lastHeartbeat": "2024-05-25 10:00:00"
  }
]
```

**权限要求**: JWT（管理员身份）+ HMAC 签名

---

### 7.6 修改设备配置（管理后台）

**前端页面**: `03-管理后台端/src/pages/SmsRelayPage.tsx`

**请求**:
```
PUT /api/sms-relay/admin/devices/{deviceId}
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
Content-Type: application/json
```

**请求体**:
```json
{
  "receiverPhone": "string",
  "serverUrl": "string",
  "messagePrefix": "string"
}
```

**成功响应** (200): 同 7.5 单条结构

**权限要求**: JWT（管理员身份）+ HMAC 签名

---

### 7.7 查看验证会话（管理后台）

**前端页面**: `03-管理后台端/src/pages/SmsRelayPage.tsx`

**请求**:
```
GET /api/sms-relay/admin/sessions
Authorization: Bearer {token}
X-Timestamp: {timestamp}
X-Nonce: {nonce}
X-Signature: {signature}
```

**成功响应** (200):
```json
[
  {
    "sessionId": "string",
    "elderId": "string",
    "target": "emergency",
    "relayDeviceId": "device-001",
    "receiverPhone": "13800001111",
    "messageBody": "SL AB3CD9EF2A",
    "status": "已验证",
    "expiresAt": "2024-05-25 12:00:00",
    "verifiedAt": "2024-05-25 10:05:00",
    "senderPhoneMasked": "139****2222",
    "createdAt": "2024-05-25 10:00:00"
  }
]
```

**权限要求**: JWT（管理员身份）+ HMAC 签名

---

## 8. 通用服务接口

### 8.1 客户端审计事件上报

**前端页面**: 所有端通用

**请求**:
```
POST /api/audit-logs/report
Content-Type: application/json
```

**请求体**:
```json
{
  "action": "string (必填, 操作类型)",
  "target": "string (可选, 操作对象)",
  "detail": "string (可选, 详情)",
  "ts": 1716643200000,
  "ua": "Mozilla/5.0..."
}
```

**成功响应** (200):
```json
{
  "ok": true
}
```

**权限要求**: 无（公开接口，用于安全审计）

---

### 8.2 查询审计日志（通用）

**前端页面**: `03-管理后台端/src/pages/AuditLogPage.tsx`

**请求**:
```
GET /api/audit-logs
Authorization: Bearer {token}
```

**成功响应** (200): 审计日志数组

**权限要求**: JWT（管理员或审计员身份）

---

## 9. 数据模型与枚举值

### 9.1 老人档案 (Elder)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| archiveNo | string | 档案编号，如 `SL20240001` |
| name | string | 姓名 |
| gender | string | 性别: `男`, `女` |
| age | int | 年龄 |
| residence | string | 居住地址 |
| emergencyContactName | string | 紧急联系人姓名 |
| emergencyContactPhone | string | 紧急联系人电话 |
| emergencyContactRelation | string | 与老人关系 |
| aboType | string | ABO 血型: `A`, `B`, `AB`, `O` |
| rhType | string | Rh 血型: `阳性`, `阴性`, `未知` |
| allergySummary | string | 过敏史摘要 |
| status | string | 档案状态 |

### 9.2 健康档案 (HealthRecord)

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 记录日期 `YYYY-MM-DD` |
| volunteer | string | 记录志愿者姓名 |
| heightCm | number | 身高(cm) |
| weightKg | number | 体重(kg) |
| waistCm | number | 腰围(cm) |
| bmi | number | BMI 指数 |
| healthSelfAssessment | string | 健康自评 |
| selfCareAssessment | string | 自理能力评估 |
| cognitiveScreening | string | 认知筛查结果 |
| emotionScreening | string | 情绪筛查结果 |

### 9.3 用药记录 (Medication)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| name | string | 药品名称 |
| dosage | string | 剂量 |
| usage | string | 用法 |
| timing | string | 用药时间 |
| updatedAt | string (ISO8601) | 更新时间 |

### 9.4 量表记录 (ScaleRecord)

| 字段 | 类型 | 说明 |
|------|------|------|
| scale | string | 量表类型 |
| name | string | 量表名称 |
| score | int | 总分 |
| date | string | 评估日期 |
| volunteer | string | 评估志愿者 |
| answers | ScaleAnswer[] | 答题详情 |

**量表类型枚举 (ScaleType)**:
| 值 | 说明 | 评分范围 |
|----|------|---------|
| PHQ-9 | 患者健康问卷-抑郁 | 0-27 |
| GAD-7 | 广泛性焦虑量表 | 0-21 |
| UCLA | UCLA 孤独量表 | 20-80 |

**PHQ-9 评分标准**:
| 分值 | 程度 | 建议 |
|------|------|------|
| 0-4 | 无抑郁 | 无需特殊处理 |
| 5-9 | 轻度抑郁 | 建议关注，必要时咨询医生 |
| 10-14 | 中度抑郁 | 建议寻求专业帮助 |
| 15-19 | 中重度抑郁 | 建议积极治疗 |
| 20-27 | 重度抑郁 | 建议立即就医 |

### 9.5 二维码 (QrCode)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| qrId | string | QR 编码 |
| elderId | string | 关联老人ID |
| archiveNo | string | 档案编号 |
| elderName | string | 老人姓名 |
| elderAge | int | 老人年龄 |
| elderPhone | string | 老人电话 |
| relayDeviceId | string | 关联短信中继设备ID |
| relayReceiverPhone | string | 中继接收手机号 |
| url | string | 二维码URL |
| status | string | 状态 |
| createdAt | string (ISO8601) | 创建时间 |

**二维码状态枚举 (QrCodeStatus)**:
| 值 | 说明 |
|----|------|
| ENABLED / ACTIVE | 启用 |
| DISABLED | 已停用 |
| REGENERATED | 已重新生成 |

### 9.6 邀请码 (Invitation)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| code | string | 邀请码 |
| elderId | string | 关联老人ID |
| elderName | string | 老人姓名 |
| archiveNo | string | 档案编号 |
| expiresAt | string (ISO8601) | 过期时间 |
| maxUses | int | 最大使用次数 |
| usedCount | int | 已使用次数 |
| status | string | 状态 |
| createdAt | string (ISO8601) | 创建时间 |

**邀请码状态枚举 (InvitationStatus)**:
| 值 | 说明 |
|----|------|
| ACTIVE | 未使用 |
| USED | 已使用 |
| EXPIRED | 已过期 |
| DISABLED | 已作废 |

### 9.7 志愿者 (Volunteer)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| account | string | 登录账号 |
| name | string | 姓名 |
| phone | string | 手机号 |
| elderCount | int | 负责老人数量 |
| status | string | 状态 |
| lastSubmit | string | 最近提交时间 |
| createdAt | string | 创建时间 |
| createMethod | string | 创建方式 |
| invitationCode | string | 注册所用邀请码 |

**志愿者状态枚举 (VolunteerStatus)**:
| 值 | 说明 |
|----|------|
| ACTIVE | 启用 |
| DISABLED | 停用 |

### 9.8 家属绑定 (FamilyBinding)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| familyName | string | 家属姓名 |
| familyPhoneMasked | string | 脱敏手机号 |
| relationship | string | 与老人关系 |
| elderName | string | 老人姓名 |
| elderArchiveNo | string | 档案编号 |
| invitationCode | string | 注册邀请码 |
| boundAt | string | 绑定时间 |
| status | string | 状态 |
| createMethod | string | 创建方式 |

**家属绑定状态枚举 (FamilyBindingStatus)**:
| 值 | 说明 |
|----|------|
| ACTIVE | 已绑定 |
| DISABLED | 已解绑 |

### 9.9 审核请求 (ReviewRequest)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| type | string | 请求类型 |
| title | string | 标题 |
| summary | string | 摘要 |
| targetId | string | 目标ID |
| elderId | string | 关联老人ID |
| requesterAccount | string | 申请人账号 |
| requesterRole | string | 申请人角色 |
| status | string | 状态 |
| createdAt | string | 创建时间 |
| handledAt | string | 处理时间 |
| handledBy | string | 处理人 |
| resultNote | string | 处理备注 |

**审核状态枚举 (ReviewRequestStatus)**:
| 值 | 说明 |
|----|------|
| PENDING | 待审核 |
| APPROVED | 已通过 |
| REJECTED | 已拒绝 |

### 9.10 短信中继设备 (SmsRelayDevice)

| 字段 | 类型 | 说明 |
|------|------|------|
| deviceId | string | 设备唯一标识 |
| receiverPhone | string | 接收手机号 |
| serverUrl | string | 服务器地址 |
| messagePrefix | string | 短信前缀 |
| status | string | 设备状态 |
| serviceStatus | string | 服务状态 |
| lastHeartbeat | string | 最近心跳时间 |

### 9.11 短信中转记录 (SmsRelayRecord)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 记录ID |
| deviceId | string | 设备ID |
| receiverPhone | string | 接收方手机号 |
| senderPhone | string | 发送方手机号 |
| messageBody | string | 短信内容 |
| receivedAt | string | 接收时间 |
| uploadedAt | string | 上报时间 |
| status | string | 处理状态 |

### 9.12 短信验证会话 (SmsVerificationSession)

| 字段 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 会话ID |
| elderId | string | 关联老人ID |
| target | string | 验证目标 |
| relayDeviceId | string | 中继设备ID |
| receiverPhone | string | 接收手机号 |
| messageBody | string | 验证短信内容 |
| status | string | 会话状态 |
| expiresAt | string | 过期时间 |
| verifiedAt | string | 验证通过时间 |
| senderPhoneMasked | string | 发送方脱敏手机号 |
| createdAt | string | 创建时间 |

**会话状态枚举 (VerificationStatus)**:
| 值 | 说明 |
|----|------|
| PENDING | 等待验证 |
| VERIFIED | 已验证 |
| EXPIRED | 已过期 |

---

## 10. 前端页面与 API 对应关系

### 10.1 扫码用户端 (`01-扫码用户端`)

| 前端页面 | 调用的 API |
|----------|-----------|
| `ScanPage.tsx` | `POST /api/scan/resolve` |
| `WechatAuthPage.tsx` | `POST /api/scan/auth/wechat` |
| `VerificationPage.tsx` | `POST /api/scan/verification/start`, `GET /api/scan/verification/status` |
| `IdentityVerifyPage.tsx` | `POST /api/scan/verification/identity` |
| `BasicInfoPage.tsx` | `GET /api/scan/basic-info` |
| `HealthRecordPage.tsx` | `GET /api/scan/archive` |
| `MedicationPage.tsx` | `GET /api/scan/medications` |
| `ScalePage.tsx` | `GET /api/scan/scales` |

### 10.2 志愿者填写端 (`02-志愿者填写端`)

| 前端页面 | 调用的 API |
|----------|-----------|
| `LoginPage.tsx` | `POST /api/volunteer/login` |
| `RegisterPage.tsx` | `GET /api/invitations/{code}/preview`, `POST /api/volunteer/register` |
| `ElderListPage.tsx` | `GET /api/volunteer/me/elders` |
| `CreateElderPage.tsx` | `POST /api/volunteer/me/elders` |
| `BasicInfoFormPage.tsx` | `PUT /api/elder/{elderId}/basic` |
| `HealthFormPage.tsx` | `POST /api/elder/{elderId}/health-records` |
| `MedicationFormPage.tsx` | `POST /api/elder/{elderId}/medications` |
| `ScaleFormPage.tsx` | `POST /api/elder/{elderId}/scale-records` |
| `ScaleHistoryPage.tsx` | `GET /api/elder/{elderId}/scale-records` |
| `QrManagePage.tsx` | `GET /api/volunteer/me/elders/{elderId}/qr-manage`, `POST /api/volunteer/me/elders/{elderId}/qr-regenerate`, `PUT /api/volunteer/me/elders/{elderId}/qr-disable` |
| `ProfilePage.tsx` | `GET /api/volunteer/me/profile`, `PUT /api/volunteer/me/profile` |

### 10.3 家属入口端 (`02-志愿者填写端/src/family-entry`)

| 前端页面 | 调用的 API |
|----------|-----------|
| `LoginPage.tsx` | `POST /api/family/login` |
| `InviteRegisterPage.tsx` | `GET /api/invitations/{code}/preview`, `POST /api/invitations/{code}/send-sms`, `POST /api/invitations/{code}/register` |
| `ElderListPage.tsx` | `GET /api/family/me/elders` |
| `ElderDetailPage.tsx` | `GET /api/family/elders/{elderId}` |
| `ContactsPage.tsx` | `PUT /api/family/elders/{elderId}/contacts` |
| `MedicationPage.tsx` | `GET /api/family/elders/{elderId}/medications`, `POST /api/family/elders/{elderId}/medications`, `PUT /api/family/elders/{elderId}/medications/{medicationId}`, `DELETE /api/family/elders/{elderId}/medications/{medicationId}` |
| `QrCodePage.tsx` | `GET /api/family/elders/{elderId}/qrcode`, `POST /api/family/elders/{elderId}/qrcode/disable-request` |

### 10.4 管理后台端 (`03-管理后台端`)

| 前端页面 | 调用的 API |
|----------|-----------|
| `LoginPage.tsx` | `POST /api/admin/login` |
| `DashboardPage.tsx` | `GET /api/admin/dashboard` |
| `ElderManagePage.tsx` | `GET /api/admin/elders`, `DELETE /api/admin/elders/{id}`, `PUT /api/admin/elders/{id}/status` |
| `ElderCreatePage.tsx` | `POST /api/admin/elders` |
| `ElderEditPage.tsx` | `PUT /api/admin/elders/{id}` |
| `VolunteerManagePage.tsx` | `GET /api/admin/volunteers`, `DELETE /api/admin/volunteers/{id}` |
| `VolunteerCreatePage.tsx` | `POST /api/admin/volunteers` |
| `VolunteerEditPage.tsx` | `PUT /api/admin/volunteers/{id}` |
| `VolunteerScopePage.tsx` | `PUT /api/admin/volunteers/{id}/scope` |
| `QrCodeManagePage.tsx` | `GET /api/admin/qrcodes`, `POST /api/admin/qrcodes`, `PUT /api/admin/qrcodes/{id}/disable`, `POST /api/admin/qrcodes/{id}/regenerate`, `PUT /api/admin/qrcodes/{id}/relay-device` |
| `InvitationManagePage.tsx` | `GET /api/admin/invitations`, `POST /api/admin/invitations`, `PUT /api/admin/invitations/{id}/disable`, `DELETE /api/admin/invitations/{id}` |
| `FamilyBindingPage.tsx` | `GET /api/admin/family-bindings`, `PUT /api/admin/family-bindings/{id}/disable` |
| `ReviewRequestPage.tsx` | `GET /api/admin/review-requests`, `POST /api/admin/review-requests/{id}/approve`, `POST /api/admin/review-requests/{id}/reject` |
| `AuditLogPage.tsx` | `GET /api/admin/audit-logs` |
| `MedicationManagePage.tsx` | `GET /api/admin/medications` |
| `ScaleManagePage.tsx` | `GET /api/admin/scales` |
| `RoleManagePage.tsx` | `GET /api/admin/roles`, `GET /api/admin/permissions` |
| `SmsRelayPage.tsx` | `GET /api/sms-relay/admin/records`, `GET /api/sms-relay/admin/devices`, `PUT /api/sms-relay/admin/devices/{deviceId}`, `GET /api/sms-relay/admin/sessions` |

### 10.5 安卓短信中转端 (`05-安卓短信中转端`)

| 模块 | 调用的 API |
|------|-----------|
| 短信接收服务 | `POST /api/sms-relay/inbound` |
| 心跳服务 | `POST /api/sms-relay/heartbeat` |
| 配置同步 | `GET /api/sms-relay/devices/{deviceId}/config` |

---

## 11. HTTP 状态码与错误响应

### 11.1 HTTP 状态码说明

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| 200 | 成功 | 通用成功响应 |
| 201 | 创建成功 | 资源创建成功（部分旧接口仍用 200） |
| 204 | 无内容 | 删除成功 |
| 400 | 请求参数错误 | 参数缺失、格式错误、验证失败 |
| 401 | 未授权 | Token 缺失、过期或无效 |
| 403 | 禁止访问 | 无权限访问该资源（角色/数据范围不足） |
| 404 | 资源不存在 | 请求的资源 ID 不存在 |
| 409 | 资源冲突 | 账号已存在、重复操作 |
| 410 | 资源已过期 | 邀请码已过期或已使用 |
| 422 | 请求体验证失败 | 业务规则验证失败 |
| 429 | 请求过于频繁 | 短信发送、验证请求限流 |
| 500 | 服务器内部错误 | 服务器异常 |

### 11.2 统一错误响应格式

**JSON 格式（标准信封）**:
```json
{
  "code": 400,
  "message": "请求参数错误：手机号格式不正确",
  "data": null
}
```

**纯文本格式（部分旧接口兼容）**:
```
HTTP 401 Unauthorized
```

### 11.3 常见错误场景

| 错误场景 | HTTP 状态码 | 错误消息 |
|----------|------------|---------|
| 二维码 Token 已过期 | 400 | Token 格式错误或已过期 |
| 短信验证码错误 | 401 | 短信验证码错误 |
| 验证会话已过期 | 401 | 会话已过期，请重新验证 |
| 志愿者无权访问该老人 | 403 | 无权访问此老人档案 |
| 家属未绑定该老人 | 403 | 未绑定此老人 |
| 管理后台签名验证失败 | 403 | 请求签名验证失败 |
| 邀请码不存在 | 404 | 邀请码不存在 |
| 账号已存在 | 409 | 账号已被注册 |
| 邀请码已使用 | 410 | 邀请码已过期或已使用 |
| 短信发送过于频繁 | 429 | 请求过于频繁，请稍后再试 |

---

*文档版本: 1.0.0*
*最后更新: 2026-05-25*
*适用项目: SilverLink Care（智联名牌）*
