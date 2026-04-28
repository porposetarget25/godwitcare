package com.godwitcare.service;

import com.godwitcare.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;

@Service
public class OtpService {

    private final PasswordEncoder passwordEncoder;
    private final WhatsAppSender whatsAppSender;
    private final SecureRandom random = new SecureRandom();

    @Value("${otp.expiry-seconds:300}")
    private long otpExpirySeconds;

    public OtpService(PasswordEncoder passwordEncoder, WhatsAppSender whatsAppSender) {
        this.passwordEncoder = passwordEncoder;
        this.whatsAppSender = whatsAppSender;
    }

    public void generateAndSendOtp(User user) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        user.setOtpCodeHash(passwordEncoder.encode(otp));
        user.setOtpExpiresAt(Instant.now().plusSeconds(otpExpirySeconds));

        String message = "Your GodwitCare verification OTP is " + otp + ". It expires in " + (otpExpirySeconds / 60) + " minutes.";
        whatsAppSender.send(user.getUsername(), message);
    }

    public boolean verifyOtp(User user, String code) {
        if (user.getOtpCodeHash() == null || user.getOtpExpiresAt() == null) {
            return false;
        }

        if (user.getOtpExpiresAt().isBefore(Instant.now())) {
            return false;
        }

        if (!passwordEncoder.matches(code, user.getOtpCodeHash())) {
            return false;
        }

        user.setOtpVerified(true);
        user.setOtpVerifiedAt(Instant.now());
        user.setOtpCodeHash(null);
        user.setOtpExpiresAt(null);
        return true;
    }
}
