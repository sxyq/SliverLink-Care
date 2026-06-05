#!/usr/bin/env bash
set -euo pipefail

COMPAT_ROOT="${HOME}/.silverlink-compat-libs"
PCRE_DIR="${COMPAT_ROOT}/pcre2"
OPENSSL_DIR="${COMPAT_ROOT}/openssl3"

mkdir -p "$PCRE_DIR" "$OPENSSL_DIR"

PCRE_SOURCE=""
for candidate in \
  "${HOME}/Desktop/Docker.app/Contents/Resources/lib/libpcre2-8.0.dylib" \
  "/Applications/BlueStacks.app/Contents/Frameworks/libpcre2-8.0.dylib" \
  "/Applications/BlueStacksMIM.app/Contents/Frameworks/libpcre2-8.0.dylib"
do
  if [[ -f "$candidate" ]]; then
    PCRE_SOURCE="$candidate"
    break
  fi
done

SSL_SOURCE=""
CRYPTO_SOURCE=""
for base in \
  "${HOME}/Desktop/network device/mac/Sunshine.app/Contents/Frameworks" \
  "${HOME}/Library/Application Support/com.tencent.mac.marvis/components/MarvisKnowledgebase/Versions/1.0.0.10038/_internal" \
  "${HOME}/Library/Application Support/com.tencent.mac.marvis/components/MarvisKnowledgebase/Versions/1.0.0.10038/_internal/cv2/.dylibs"
do
  if [[ -f "${base}/libssl.3.dylib" && -f "${base}/libcrypto.3.dylib" ]]; then
    SSL_SOURCE="${base}/libssl.3.dylib"
    CRYPTO_SOURCE="${base}/libcrypto.3.dylib"
    break
  fi
done

if [[ -z "$PCRE_SOURCE" || -z "$SSL_SOURCE" || -z "$CRYPTO_SOURCE" ]]; then
  echo "Missing local compatibility libraries for MariaDB4j." >&2
  echo "PCRE source: ${PCRE_SOURCE:-not found}" >&2
  echo "SSL source: ${SSL_SOURCE:-not found}" >&2
  echo "CRYPTO source: ${CRYPTO_SOURCE:-not found}" >&2
  exit 1
fi

cp "$PCRE_SOURCE" "$PCRE_DIR/libpcre2-8.0.dylib"
cp "$SSL_SOURCE" "$OPENSSL_DIR/libssl.3.dylib"
cp "$CRYPTO_SOURCE" "$OPENSSL_DIR/libcrypto.3.dylib"

export DYLD_LIBRARY_PATH="${PCRE_DIR}:${OPENSSL_DIR}${DYLD_LIBRARY_PATH:+:${DYLD_LIBRARY_PATH}}"
export DYLD_FALLBACK_LIBRARY_PATH="${PCRE_DIR}:${OPENSSL_DIR}${DYLD_FALLBACK_LIBRARY_PATH:+:${DYLD_FALLBACK_LIBRARY_PATH}}"
export SILVERLINK_MARIADB_COMPAT_ROOT="$COMPAT_ROOT"

echo "$COMPAT_ROOT"
