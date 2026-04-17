package com.godwitcare.web;

import com.godwitcare.entity.Payment;
import com.godwitcare.entity.PaymentMethod;
import com.godwitcare.entity.User;
import com.godwitcare.repo.PaymentRepository;
import com.godwitcare.repo.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final UserRepository users;
    private final PaymentRepository payments;

    public PaymentController(UserRepository users, PaymentRepository payments) {
        this.users = users;
        this.payments = payments;
    }

    public record PaymentRequest(
            String method,
            BigDecimal amount,
            String currency,
            String cardNumber,
            String expiryDate,
            String cvv
    ) {}

    private Optional<User> currentUser(Authentication auth) {
        if (auth == null || auth.getName() == null) return Optional.empty();
        String principal = auth.getName();
        return users.findByUsername(principal).or(() -> users.findByEmail(principal));
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication auth, @RequestBody PaymentRequest req) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        if (req.amount() == null || req.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Amount must be greater than zero");
        }

        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf((req.method() == null ? "" : req.method().trim().toUpperCase(Locale.ROOT)));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Invalid payment method");
        }

        Payment p = new Payment();
        p.setUser(ou.get());
        p.setMethod(method);
        p.setAmount(req.amount().setScale(2, RoundingMode.HALF_UP));
        p.setCurrency((req.currency() == null || req.currency().isBlank()) ? "GBP" : req.currency().trim().toUpperCase(Locale.ROOT));

        if (method == PaymentMethod.CARD) {
            String digits = req.cardNumber() == null ? "" : req.cardNumber().replaceAll("\\s+", "");
            if (!digits.matches("\\d{16}")) {
                return ResponseEntity.badRequest().body("Card number must be exactly 16 digits");
            }
            String expiry = req.expiryDate() == null ? "" : req.expiryDate().trim();
            if (expiry.isBlank()) {
                return ResponseEntity.badRequest().body("Expiry date is required");
            }
            if (!expiry.matches("(0[1-9]|1[0-2])/[0-9]{2}")) {
                return ResponseEntity.badRequest().body("Expiry date must be in MM/YY format");
            }
            p.setCardLast4(digits.substring(12));
            p.setCardExpiry(expiry);
            // CVV is intentionally ignored and never stored.
        }

        p = payments.save(p);

        return ResponseEntity.ok(Map.of(
                "id", p.getId(),
                "method", p.getMethod().name(),
                "amount", p.getAmount(),
                "currency", p.getCurrency(),
                "cardLast4", p.getCardLast4(),
                "cardExpiry", p.getCardExpiry(),
                "userId", p.getUser().getId(),
                "createdAt", p.getCreatedAt()
        ));
    }
}
