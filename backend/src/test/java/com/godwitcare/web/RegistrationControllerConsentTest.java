package com.godwitcare.web;

import com.godwitcare.entity.Registration;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.RegistrationDocumentRepository;
import com.godwitcare.repo.RegistrationRepository;
import com.godwitcare.repo.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RegistrationControllerConsentTest {
    private final RegistrationRepository registrations = mock(RegistrationRepository.class);
    private final RegistrationController controller = new RegistrationController(
            registrations, mock(RegistrationDocumentRepository.class),
            mock(UserRepository.class), mock(ConsultationRepository.class));

    @Test
    void rejectsRegistrationWithoutVirtualConsultationConsent() {
        Registration request = new Registration();
        ResponseEntity<?> response = controller.create(request);
        assertEquals(400, response.getStatusCode().value());
        assertTrue(response.getBody().toString().contains("Please check the Terms and Conditions to proceed."));
        verifyNoInteractions(registrations);
    }

    @Test
    void savesRegistrationWhenConsentIsGiven() {
        Registration request = new Registration();
        assertNull(request.getVirtualConsultationConsentAt());
        request.setVirtualConsultationConsent(true);
        when(registrations.save(any(Registration.class))).thenAnswer(invocation -> {
            Registration saved = invocation.getArgument(0);
            saved.setVirtualConsultationConsentAt(OffsetDateTime.now());
            return saved;
        });
        ResponseEntity<?> response = controller.create(request);
        assertEquals(200, response.getStatusCode().value());
        Registration saved = (Registration) response.getBody();
        assertEquals(Boolean.TRUE, saved.getVirtualConsultationConsent());
        assertNotNull(saved.getVirtualConsultationConsentAt());
        verify(registrations).save(request);
    }
}
