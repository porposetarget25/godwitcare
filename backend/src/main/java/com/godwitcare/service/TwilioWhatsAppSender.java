package com.godwitcare.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TwilioWhatsAppSender implements WhatsAppSender {

    private static final Logger log = LoggerFactory.getLogger(TwilioWhatsAppSender.class);

    private final String accountSid;
    private final String authToken;
    private final String fromNumber;

    public TwilioWhatsAppSender(
            @Value("${twilio.account.sid:}") String accountSid,
            @Value("${twilio.auth.token:}") String authToken,
            @Value("${twilio.whatsapp.from:}") String fromNumber
    ) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
    }

    @Override
    public void send(String toPhoneNumber, String message) {
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank() || fromNumber == null || fromNumber.isBlank()) {
            throw new IllegalStateException("Twilio credentials are not configured");
        }

        Twilio.init(accountSid, authToken);

        String normalizedTo = normalizeE164(toPhoneNumber);
        String normalizedFrom = normalizeE164(fromNumber);

        Message twilioMessage = Message.creator(
                new PhoneNumber("whatsapp:" + normalizedTo),
                new PhoneNumber("whatsapp:" + normalizedFrom),
                message
        ).create();

        log.info("Twilio WhatsApp OTP message created. sid={}, status={}, to={}",
                twilioMessage.getSid(), twilioMessage.getStatus(), maskPhone(normalizedTo));
    }

    private String normalizeE164(String phone) {
        String cleaned = phone == null ? "" : phone.trim();
        if (cleaned.startsWith("whatsapp:")) {
            cleaned = cleaned.substring("whatsapp:".length());
        }
        if (!cleaned.startsWith("+")) {
            cleaned = "+" + cleaned;
        }
        return cleaned;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) {
            return "****";
        }
        return "***" + phone.substring(phone.length() - 4);
    }
}
