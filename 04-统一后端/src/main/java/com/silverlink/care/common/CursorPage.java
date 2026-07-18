package com.silverlink.care.common;

import java.util.List;

/** A keyset page. Cursor values are opaque to API consumers. */
public record CursorPage<T>(List<T> items, String nextCursor, boolean hasMore) {
}
