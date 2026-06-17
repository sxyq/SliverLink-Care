# 微信小程序 DevTools 逐页复测清单

前置条件：微信开发者工具当前账号 access token 对 appid wxd6f1eb971f5d4bc5 有效，且 DevTools CLI open/auto 不再出现 INVALID_LOGIN、access_token expired、需要重新登录。

截图保存建议：将每个页面截图保存到本报告目录 screenshots/，文件名使用下表给出的 screenshot 列。

| # | condition | path | query | screenshot | 验收点 |
| --- | --- | --- | --- | --- | --- |
| 1 | scan-landing | subpackages/scan/landing/index | elderId=ELDER_DEMO_001&archiveNo=A2026001&source=devtools-verify | screenshots/01-scan-landing.png | 页面能识别 elderId/archiveNo/source 参数<br>落地态不会直接提示二维码无法识别<br>进入验证或档案入口的按钮/提示可见 |
| 2 | scan-verify | subpackages/scan/verify/index | elderId=ELDER_DEMO_001&source=devtools-verify | screenshots/02-scan-verify.png | 访问验证标题可见<br>短信验证入口和一键跳转短信按钮可见<br>session/elder 防串档提示不被遮挡 |
| 3 | scan-archive | subpackages/scan/archive/index | elderId=ELDER_DEMO_001&sessionId=SESSION_DEMO_001 | screenshots/03-scan-archive.png | 携带 elderId + sessionId 后能进入受保护档案页<br>缺数据/无权限态有明确文案<br>页面无控制台红错 |
| 4 | scan-medications | subpackages/scan/medications/index | elderId=ELDER_DEMO_001&sessionId=SESSION_DEMO_001 | screenshots/04-scan-medications.png | 携带 elderId + sessionId 后能进入用药页<br>空态/列表态布局不溢出<br>页面无控制台红错 |
| 5 | scan-scales | subpackages/scan/scales/index | elderId=ELDER_DEMO_001&sessionId=SESSION_DEMO_001 | screenshots/05-scan-scales.png | 携带 elderId + sessionId 后能进入量表页<br>分数/日期/空态格式正常<br>页面无控制台红错 |
| 6 | scan-nameplate | subpackages/scan/nameplate/index | elderId=ELDER_DEMO_001 | screenshots/06-scan-nameplate.png | 名牌预览正反面内容可见<br>背面扫码提示可见<br>PDF/下载相关入口不会报错 |
| 7 | workbench-elder-list | subpackages/workbench/elder-list/index |  | screenshots/07-workbench-elder-list.png | 工作台老人列表页能加载<br>登录/空态/列表态表现明确<br>页面无控制台红错 |
| 8 | workbench-elder-detail | subpackages/workbench/elder-detail/index | elderId=ELDER_DEMO_001 | screenshots/08-workbench-elder-detail.png | 携带 elderId 后进入老人详情<br>基础信息/联系人/用药/量表入口可见<br>页面无控制台红错 |
| 9 | workbench-basic | subpackages/workbench/basic/index | elderId=ELDER_DEMO_001 | screenshots/09-workbench-basic.png | 老人基础信息页字段格式正常<br>家属/志愿者权限态不混淆<br>页面无控制台红错 |
| 10 | workbench-medication | subpackages/workbench/medication/index | elderId=ELDER_DEMO_001 | screenshots/10-workbench-medication.png | 工作台用药页 GET/缓存 fallback 页面表现正常<br>空态/列表态不溢出<br>页面无控制台红错 |
| 11 | workbench-scale | subpackages/workbench/scale/index | elderId=ELDER_DEMO_001 | screenshots/11-workbench-scale.png | 工作台量表页加载正常<br>量表结果/空态格式正常<br>页面无控制台红错 |
| 12 | workbench-qrcode | subpackages/workbench/qrcode/index | elderId=ELDER_DEMO_001 | screenshots/12-workbench-qrcode.png | 二维码访问链接/图片区域可见<br>复制链接、停用二维码、导出名牌入口可见<br>页面无控制台红错 |

真机补充：使用 CI preview 二维码扫码，至少覆盖相机权限弹窗、扫码落地、短信验证、受保护档案、二维码管理、名牌 PDF 打开。
