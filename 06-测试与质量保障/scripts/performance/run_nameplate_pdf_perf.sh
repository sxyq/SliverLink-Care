#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/04-统一后端"

(
  cd "$BACKEND_DIR"
  ./mvnw -DskipTests test-compile
  ./mvnw -DargLine= \
    -Dnameplate.preview.total="${NAMEPLATE_PREVIEW_TOTAL:-300}" \
    -Dnameplate.preview.concurrency="${NAMEPLATE_PREVIEW_CONCURRENCY:-24}" \
    -Dnameplate.pdf.total="${NAMEPLATE_PDF_TOTAL:-96}" \
    -Dnameplate.pdf.concurrency="${NAMEPLATE_PDF_CONCURRENCY:-12}" \
    -Dnameplate.pdf.high.total="${NAMEPLATE_PDF_HIGH_TOTAL:-0}" \
    -Dnameplate.pdf.high.concurrency="${NAMEPLATE_PDF_HIGH_CONCURRENCY:-0}" \
    -Dtest=NameplatePdfPerfTest surefire:test
)
