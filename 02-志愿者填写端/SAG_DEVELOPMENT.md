# 02-志愿者填写端 SAG 开发说明

## 开发顺序

1. 统一类型：老人、用药、量表、家属绑定、志愿者权限
2. API 客户端：志愿者登录、老人列表、老人详情、健康档案、用药、量表、家属入口
3. 共享工作台：`src/shared-workbench`
4. 志愿者页面：登录、负责老人、基本信息、健康档案、量表填写
5. 家属入口：邀请码、注册登录、联系人维护、用药维护、二维码查看
6. 验收：志愿者和家属共用工作台，但权限边界不同

## 建议类/组件

- `AuthProvider`
- `AppShell`
- `SubjectListPage`
- `SubjectDetailPage`
- `MedicationEditorPage`
- `FamilyHomePage`
- `FamilyLoginPage`

## 建议函数

- `loginVolunteer`
- `loadAssignedSubjects`
- `loadSubjectDetail`
- `saveBasicInfo`
- `saveMedication`
- `submitScale`
- `bindFamilyInvitation`

## 图谱约束

志愿者只能处理本人负责老人；家属只能处理绑定老人。共享页面可以复用，但 API 权限、入口状态和可编辑字段必须分开。
