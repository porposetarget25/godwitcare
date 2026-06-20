package com.godwitcare.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;

@ConfigurationProperties(prefix = "app.stripe")
public class StripeProperties implements EnvironmentAware {
    private Environment environmentProperties;

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
        return firstConfigured(secretKey, "stripe.secret-key");
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getPublishableKey() {
        return firstConfigured(publishableKey, "stripe.publishable-key");
    }

    public void setPublishableKey(String publishableKey) {
        this.publishableKey = publishableKey;
    }

    public String getEnvironment() {
        String normalizedEnvironment = firstConfigured(environment, "stripe.environment");
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

    @Override
    public void setEnvironment(Environment environment) {
        this.environmentProperties = environment;
    }

    private String firstConfigured(String primaryValue, String fallbackPropertyName) {
        String normalizedPrimary = normalize(primaryValue);
        if (normalizedPrimary != null) return normalizedPrimary;
        return environmentProperties == null ? null : normalize(environmentProperties.getProperty(fallbackPropertyName));
    }

    private static String normalize(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        if (normalized.isEmpty() || "xxxxx".equalsIgnoreCase(normalized)) return null;
        return normalized;
    }

    private static boolean hasText(String value) {
        return normalize(value) != null;
    }
}
