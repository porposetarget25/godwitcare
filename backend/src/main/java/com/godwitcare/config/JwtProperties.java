package com.godwitcare.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    /**
     * Secret used to sign JWTs. Override with APP_JWT_SECRET in deployed environments.
     */
    private String secret = "godwitcare-development-jwt-secret-change-me-please-32-bytes-minimum";

    /**
     * Token lifetime in milliseconds. Defaults to 7 days.
     */
    private long expirationMs = 7 * 24 * 60 * 60 * 1000L;

    private String issuer = "godwitcare";

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public void setExpirationMs(long expirationMs) {
        this.expirationMs = expirationMs;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }
}
