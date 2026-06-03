package com.godwitcare.service;

import com.godwitcare.config.StripeProperties;
import com.godwitcare.entity.Payment;
import com.godwitcare.entity.PaymentMethod;
import com.godwitcare.entity.User;
import com.godwitcare.repo.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class StripePaymentService {
    private static final Set<String> ZERO_DECIMAL_CURRENCIES = Set.of(
            "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
    );

    private final StripeProperties stripeProperties;
    private final PaymentRepository payments;

    public StripePaymentService(StripeProperties stripeProperties, PaymentRepository payments) {
        this.stripeProperties = stripeProperties;
        this.payments = payments;
        Stripe.apiKey = stripeProperties.getSecretKey();
    }

    @Transactional
    public PaymentIntentSession createPaymentIntent(User user, PaymentMethod method, BigDecimal amount, String currency) throws StripeException {
        ensureStripeConfigured();

        String normalizedCurrency = normalizeCurrency(currency);
        BigDecimal normalizedAmount = amount.setScale(2, RoundingMode.HALF_UP);

        Payment payment = new Payment();
        payment.setUser(user);
        payment.setMethod(method);
        payment.setAmount(normalizedAmount);
        payment.setCurrency(normalizedCurrency);
        payment.setStatus("CREATED");
        payment = payments.saveAndFlush(payment);

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(toMinorUnits(normalizedAmount, normalizedCurrency))
                .setCurrency(normalizedCurrency.toLowerCase(Locale.ROOT))
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .setAllowRedirects(PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                                .build()
                )
                .putAllMetadata(Map.of(
                        "paymentId", String.valueOf(payment.getId()),
                        "userId", String.valueOf(user.getId()),
                        "method", method.name()
                ))
                .build();

        RequestOptions requestOptions = RequestOptions.builder()
                .setIdempotencyKey("payment-" + payment.getId() + "-" + UUID.randomUUID())
                .build();

        PaymentIntent intent = PaymentIntent.create(params, requestOptions);
        payment.setStripePaymentIntentId(intent.getId());
        payment.setStatus(normalizeStatus(intent.getStatus()));
        payment = payments.save(payment);

        return new PaymentIntentSession(payment, intent.getClientSecret());
    }

    @Transactional
    public Payment syncPaymentIntent(Payment payment) throws StripeException {
        ensureStripeConfigured();
        PaymentIntent intent = PaymentIntent.retrieve(payment.getStripePaymentIntentId());
        payment.setStatus(normalizeStatus(intent.getStatus()));
        if (intent.getLastPaymentError() != null) {
            payment.setFailureMessage(intent.getLastPaymentError().getMessage());
        } else if ("succeeded".equals(intent.getStatus())) {
            payment.setFailureMessage(null);
        }
        if (intent.getLatestCharge() != null) {
            payment.setStripeChargeId(intent.getLatestCharge());
        }
        return payments.save(payment);
    }

    public String normalizeCurrency(String currency) {
        String normalized = (currency == null || currency.isBlank()) ? "GBP" : currency.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Currency must be a valid 3-letter ISO code.");
        }
        return normalized;
    }

    public long toMinorUnits(BigDecimal amount, String currency) {
        if (ZERO_DECIMAL_CURRENCIES.contains(currency.toUpperCase(Locale.ROOT))) {
            return amount.setScale(0, RoundingMode.HALF_UP).longValueExact();
        }
        return amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private void ensureStripeConfigured() {
        if (!stripeProperties.hasSecretKeyValue()) {
            throw new IllegalStateException("Stripe secret key is not configured. Set STRIPE_SECRET_KEY to your sk_test or sk_live key.");
        }
        if (!stripeProperties.isBackendConfigured()) {
            throw new IllegalStateException("Stripe secret key must start with sk_test or sk_live. Do not use a publishable pk_ key for backend API calls.");
        }
        Stripe.apiKey = stripeProperties.getSecretKey().trim();
    }

    private String normalizeStatus(String stripeStatus) {
        return stripeStatus == null ? "UNKNOWN" : stripeStatus.toUpperCase(Locale.ROOT);
    }

    public record PaymentIntentSession(Payment payment, String clientSecret) {}
}
