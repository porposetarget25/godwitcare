package com.godwitcare.service;

public interface WhatsAppSender {
    void send(String toPhoneNumber, String contentSid, String contentVariables);
}
