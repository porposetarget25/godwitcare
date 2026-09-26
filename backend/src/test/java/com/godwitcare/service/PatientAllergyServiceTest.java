package com.godwitcare.service;

import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Registration;
import com.godwitcare.entity.Traveler;
import com.godwitcare.entity.User;
import com.godwitcare.repo.RegistrationRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PatientAllergyServiceTest {
    private final RegistrationRepository registrations = mock(RegistrationRepository.class);
    private final PatientAllergyService service = new PatientAllergyService(registrations);

    @Test
    void unansweredPatientIsDistinctFromNo() {
        Consultation consultation = primaryConsultation(new Registration());
        PatientAllergyService.AllergyInfo info = service.forConsultation(consultation);
        assertNull(info.hasAllergies());
        assertEquals("Not provided", info.display());
    }

    @Test
    void requiresDetailsForYesAndTrimsSavedValue() {
        Registration registration = new Registration();
        Consultation consultation = primaryConsultation(registration);
        assertThrows(IllegalArgumentException.class, () -> service.update(consultation, true, "  "));

        PatientAllergyService.AllergyInfo info = service.update(consultation, true, "  Penicillin, peanuts  ");
        assertTrue(info.hasAllergies());
        assertEquals("Penicillin, peanuts", registration.getAllergyDetails());
    }

    @Test
    void changingYesToNoClearsStaleDetails() {
        Registration registration = new Registration();
        registration.setHasAllergies(true);
        registration.setAllergyDetails("Penicillin");
        Consultation consultation = primaryConsultation(registration);

        PatientAllergyService.AllergyInfo info = service.update(consultation, false, "stale client value");
        assertFalse(info.hasAllergies());
        assertNull(registration.getAllergyDetails());
        assertEquals("None reported", info.display());
    }

    @Test
    void secondaryTravellerAllergiesRemainIndependentFromPrimary() {
        Registration registration = new Registration();
        registration.setHasAllergies(true);
        registration.setAllergyDetails("Penicillin");
        Traveler traveler = new Traveler();
        traveler.setRegistration(registration);
        Consultation consultation = primaryConsultation(registration);
        consultation.setTraveler(traveler);

        service.update(consultation, true, " Peanut ");
        assertEquals("Penicillin", registration.getAllergyDetails());
        assertEquals("Peanut", service.forConsultation(consultation).details());
    }

    private Consultation primaryConsultation(Registration registration) {
        User user = new User();
        user.setEmail("patient@example.com");
        Consultation consultation = new Consultation();
        consultation.setUser(user);
        when(registrations.findTopByEmailAddressOrderByIdDesc("patient@example.com"))
                .thenReturn(Optional.of(registration));
        return consultation;
    }
}
