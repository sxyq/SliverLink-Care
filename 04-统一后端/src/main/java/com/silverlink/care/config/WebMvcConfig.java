package com.silverlink.care.config;

import com.silverlink.care.security.SignatureInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final SignatureInterceptor signatureInterceptor;

    public WebMvcConfig(SignatureInterceptor signatureInterceptor) {
        this.signatureInterceptor = signatureInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(signatureInterceptor)
                .addPathPatterns("/api/admin/**", "/api/sms-relay/admin/**");
    }
}
