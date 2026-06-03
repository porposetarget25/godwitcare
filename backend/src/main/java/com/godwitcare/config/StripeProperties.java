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
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getPublishableKey() {
        return publishableKey;
    }

    public void setPublishableKey(String publishableKey) {
        this.publishableKey = publishableKey;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public boolean isBackendConfigured() {
        return secretKey != null && !secretKey.isBlank();
    }

    public boolean isFrontendConfigured() {
        return publishableKey != null && !publishableKey.isBlank();
    }
}
