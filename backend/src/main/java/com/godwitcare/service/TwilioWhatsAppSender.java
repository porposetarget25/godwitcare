package com.godwitcare.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TwilioWhatsAppSender implements WhatsAppSender {

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

        Message.creator(
                new PhoneNumber("whatsapp:" + toPhoneNumber),
                new PhoneNumber("whatsapp:" + fromNumber),
                message
        ).create();
    }
}
