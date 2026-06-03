package com.godwitcare.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.stripe")
public class StripeProperties {
    /**
     * Stripe secret key used only by the backend. Use an sk_test key in sandbox and an sk_live key in production.
     */
    private String secretKey;

    /**
     * Stripe publishable key that is safe for the frontend. Use a pk_test key in sandbox.
     */
    private String publishableKey;

    /**
     * Logical environment label for operational visibility and future switching.
     */
    private String environment = "test";

    public String getSecretKey() {
        return normalize(secretKey);
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getPublishableKey() {
        return normalize(publishableKey);
    }

    public void setPublishableKey(String publishableKey) {
        this.publishableKey = publishableKey;
    }

    public String getEnvironment() {
        String normalizedEnvironment = normalize(environment);
        return normalizedEnvironment == null ? "test" : normalizedEnvironment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public boolean isBackendConfigured() {
        return isSecretKey(getSecretKey());
    }

    public boolean isFrontendConfigured() {
        return isPublishableKey(getPublishableKey());
    }

    public boolean hasSecretKeyValue() {
        return hasText(getSecretKey());
    }

    public boolean hasPublishableKeyValue() {
        return hasText(getPublishableKey());
    }

    public static boolean isSecretKey(String key) {
        return hasText(key) && key.trim().startsWith("sk_");
    }

    public static boolean isPublishableKey(String key) {
        return hasText(key) && key.trim().startsWith("pk_");
    }

    private static String normalize(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static boolean hasText(String value) {
        return normalize(value) != null;
    }
}
