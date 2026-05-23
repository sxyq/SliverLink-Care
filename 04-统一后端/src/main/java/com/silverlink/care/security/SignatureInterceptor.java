package com.silverlink.care.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class SignatureInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String timestamp = request.getHeader("X-Timestamp");
        String nonce = request.getHeader("X-Nonce");
        String signature = request.getHeader("X-Signature");

        if (timestamp == null || nonce == null || signature == null) {
            if (isHighRiskPath(request.getRequestURI())) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("{\"code\":400,\"message\":\"missing signature headers\"}");
                return false;
            }
            return true;
        }

        long ts = Long.parseLong(timestamp);
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - ts) > 300) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"code\":400,\"message\":\"timestamp expired\"}");
            return false;
        }

        return true;
    }

    private boolean isHighRiskPath(String uri) {
        return uri.contains("/admin/") || uri.contains("/qrcodes/");
    }
}
