package com.silverlink.care.module.qrcode;

public class QrCodeIssueResult {
    private final QrCodeEntity entity;
    private final String token;
    private final String url;

    public QrCodeIssueResult(QrCodeEntity entity, String token, String url) {
        this.entity = entity;
        this.token = token;
        this.url = url;
    }

    public QrCodeEntity getEntity() {
        return entity;
    }

    public String getToken() {
        return token;
    }

    public String getUrl() {
        return url;
    }
}
