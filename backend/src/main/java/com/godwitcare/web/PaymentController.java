package com.godwitcare.web;

import com.godwitcare.config.StripeProperties;
import com.godwitcare.entity.Payment;
import com.godwitcare.entity.PaymentMethod;
import com.godwitcare.entity.User;
import com.godwitcare.repo.PaymentRepository;
import com.godwitcare.repo.UserRepository;
import com.godwitcare.service.StripePaymentService;
import com.stripe.exception.StripeException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final UserRepository users;
    private final PaymentRepository payments;
    private final StripePaymentService stripePaymentService;
    private final StripeProperties stripeProperties;

    public PaymentController(UserRepository users,
                             PaymentRepository payments,
                             StripePaymentService stripePaymentService,
                             StripeProperties stripeProperties) {
        this.users = users;
        this.payments = payments;
        this.stripePaymentService = stripePaymentService;
        this.stripeProperties = stripeProperties;
    }

    public record PaymentIntentRequest(
            String method,
            BigDecimal amount,
            String currency
    ) {}

    private Optional<User> currentUser(Authentication auth) {
        if (auth == null || auth.getName() == null) return Optional.empty();
        String principal = auth.getName();
        return users.findByUsername(principal).or(() -> users.findByEmail(principal));
    }

    @GetMapping("/config")
    public ResponseEntity<?> config(Authentication auth) {
        if (currentUser(auth).isEmpty()) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(Map.of(
                "publishableKey", stripeProperties.getPublishableKey() == null ? "" : stripeProperties.getPublishableKey(),
                "environment", stripeProperties.getEnvironment(),
                "frontendConfigured", stripeProperties.isFrontendConfigured(),
                "backendConfigured", stripeProperties.isBackendConfigured()
        ));
    }

    @PostMapping("/payment-intents")
    public ResponseEntity<?> createPaymentIntent(Authentication auth, @RequestBody PaymentIntentRequest req) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        if (req.amount() == null || req.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Amount must be greater than zero."));
        }

        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf((req.method() == null ? "CARD" : req.method().trim().toUpperCase(Locale.ROOT)));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid payment method."));
        }

        String currency;
        try {
            currency = stripePaymentService.normalizeCurrency(req.currency());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }

        try {
            StripePaymentService.PaymentIntentSession session = stripePaymentService.createPaymentIntent(ou.get(), method, req.amount(), currency);
            Map<String, Object> response = toPaymentDto(session.payment());
            response.put("clientSecret", session.clientSecret());
            return ResponseEntity.ok(response);
        } catch (StripeException ex) {
            return ResponseEntity.status(502).body(Map.of("message", stripeMessage(ex)));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/payment-intents/{paymentIntentId}/confirm")
    public ResponseEntity<?> confirmPaymentIntent(Authentication auth, @PathVariable String paymentIntentId) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        Optional<Payment> payment = payments.findByStripePaymentIntentIdAndUserId(paymentIntentId, ou.get().getId());
        if (payment.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        try {
            return ResponseEntity.ok(toPaymentDto(stripePaymentService.syncPaymentIntent(payment.get())));
        } catch (StripeException ex) {
            return ResponseEntity.status(502).body(Map.of("message", stripeMessage(ex)));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
        }
    }

    private Map<String, Object> toPaymentDto(Payment p) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", p.getId());
        body.put("method", p.getMethod().name());
        body.put("amount", p.getAmount());
        body.put("currency", p.getCurrency());
        body.put("stripePaymentIntentId", p.getStripePaymentIntentId());
        body.put("stripeChargeId", p.getStripeChargeId());
        body.put("status", p.getStatus());
        body.put("failureMessage", p.getFailureMessage());
        body.put("cardLast4", p.getCardLast4());
        body.put("cardBrand", p.getCardBrand());
        body.put("userId", p.getUser().getId());
        body.put("createdAt", p.getCreatedAt());
        body.put("updatedAt", p.getUpdatedAt());
        return body;
    }

    private String stripeMessage(StripeException ex) {
        String message = ex.getStripeError() != null ? ex.getStripeError().getMessage() : ex.getMessage();
        return message == null || message.isBlank() ? "Stripe payment processing failed." : message;
    }
}
