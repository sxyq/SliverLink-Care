#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
WEAPP_DIR="$ROOT_DIR/08-微信小程序端"

cd "$WEAPP_DIR"

npm run test:unit
npm run test:static
npm run test:route-contract
npm run test:platform-contract
npm run test:backend-contract
npm run test:page-privacy-render
npm run typecheck
npm run test:build-performance
npm run test:dist-security
npm run test:artifact
npm run test:performance-budget
