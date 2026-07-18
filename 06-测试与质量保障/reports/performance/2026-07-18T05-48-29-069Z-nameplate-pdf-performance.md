# 名牌 PDF 本地并发与长尾测试

- 生成时间：2026-07-18T05:48:19.975143Z
- 模式：本机 PDF 生成优化前后对比
- 目标：观察 `NameplateService.generateDemoPdf` 在资源复用和短缓存开启前后的长尾变化，而不是测宿主机跑分
- JSON 报告：2026-07-18T05-48-29-069Z-nameplate-pdf-performance.json

## 摘要

- preview: baseline P95 1060ms -> optimized P95 70ms, baseline P99 1217ms -> optimized P99 70ms
- pdf: baseline P95 467ms -> optimized P95 20ms, baseline P99 493ms -> optimized P99 20ms

## nameplate-preview-local-baseline

- 总请求：300
- 并发：24
- 成功：300
- 失败：0
- 成功率：100.00%
- P50：453ms
- P95：1060ms
- P99：1217ms
- Max：1287ms
- 附加指标：
  - averagePayloadBytes: 0
  - maxPayloadBytes: 0

## nameplate-preview-local-optimized

- 总请求：300
- 并发：24
- 成功：300
- 失败：0
- 成功率：100.00%
- P50：0ms
- P95：70ms
- P99：70ms
- Max：70ms
- 附加指标：
  - averagePayloadBytes: 0
  - maxPayloadBytes: 0

## nameplate-pdf-local-baseline

- 总请求：96
- 并发：12
- 成功：96
- 失败：0
- 成功率：100.00%
- P50：287ms
- P95：467ms
- P99：493ms
- Max：493ms
- 附加指标：
  - averagePayloadBytes: 31129
  - maxPayloadBytes: 31129
- 结论：
  - 本地 PDF 生成的尾延迟目前仍在可控范围，没有出现极端抖动。
- 说明：
  - 这一段关注 PDF 生成的长尾，而不是浏览器下载链路。
  - baseline 关闭 preview/pdf/qr 缓存，并关闭字体资源复用，接近优化前路径。

## nameplate-pdf-local-optimized

- 总请求：96
- 并发：12
- 成功：96
- 失败：0
- 成功率：100.00%
- P50：0ms
- P95：20ms
- P99：20ms
- Max：20ms
- 附加指标：
  - averagePayloadBytes: 31129
  - maxPayloadBytes: 31129
- 结论：
  - 当前样本出现了明显缓存命中，尾延迟已经远低于未优化路径。
- 说明：
  - 这一段关注 PDF 生成的长尾，而不是浏览器下载链路。
  - optimized 开启 preview/pdf/qr 短缓存，并复用字体资源。

