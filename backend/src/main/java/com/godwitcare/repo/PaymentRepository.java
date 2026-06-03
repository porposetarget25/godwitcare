package com.godwitcare.repo;

import com.godwitcare.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    java.util.Optional<Payment> findByStripePaymentIntentIdAndUserId(String stripePaymentIntentId, Long userId);
    java.util.List<Payment> findByUserIdOrderByIdDesc(Long userId);
    void deleteByUserId(Long userId);
}
