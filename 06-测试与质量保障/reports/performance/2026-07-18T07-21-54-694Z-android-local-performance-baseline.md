# Android 本地性能基线

- 生成时间：2026-07-18T07:21:54.206456Z
- 模式：Robolectric + MockWebServer 本地 JVM 基线
- JSON 报告：2026-07-18T07-21-54-694Z-android-local-performance-baseline.json

## sms-parser-parse

- iterations：50000
- unit：us
- avg：1.12 us
- P50：1 us
- P95：2 us
- P99：5 us
- Max：2715 us

## relay-request-signer-sign

- iterations：20000
- unit：us
- avg：6.98 us
- P50：4 us
- P95：14 us
- P99：32 us
- Max：2508 us

## relay-api-upload-inbound-sms

- iterations：80
- unit：ms
- avg：0.25 ms
- P50：0 ms
- P95：1 ms
- P99：2 ms
- Max：2 ms

## relay-api-send-heartbeat

- iterations：80
- unit：ms
- avg：0.14 ms
- P50：0 ms
- P95：1 ms
- P99：1 ms
- Max：1 ms

## sms-relay-repository-upload-inbound-sms

- iterations：40
- unit：ms
- avg：2.40 ms
- P50：2 ms
- P95：3 ms
- P99：6 ms
- Max：6 ms

## 说明

- 这轮是 Android 本地逻辑性能基线，不是设备端真机 profiling。
- `RelayApiService` 和 `SmsRelayRepository` 使用本机 `MockWebServer` 回环请求，因此重点看代码路径相对开销，不代表公网网络时延。
