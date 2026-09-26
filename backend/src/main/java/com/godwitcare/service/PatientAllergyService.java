package com.godwitcare.service;

import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Registration;
import com.godwitcare.entity.Traveler;
import com.godwitcare.repo.RegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Keeps current allergy information on the actual primary or secondary patient record. */
@Service
public class PatientAllergyService {
    public record AllergyInfo(Boolean hasAllergies, String details) {
        public String display() {
            if (hasAllergies == null) return "Not provided";
            return hasAllergies ? details : "None reported";
        }
    }

    private final RegistrationRepository registrations;

    public PatientAllergyService(RegistrationRepository registrations) {
        this.registrations = registrations;
    }

    public AllergyInfo forConsultation(Consultation consultation) {
        Traveler traveler = consultation.getTraveler();
        if (traveler != null) return new AllergyInfo(traveler.getHasAllergies(), traveler.getAllergyDetails());
        Registration registration = latestRegistration(consultation);
        return registration == null
                ? new AllergyInfo(null, null)
                : new AllergyInfo(registration.getHasAllergies(), registration.getAllergyDetails());
    }

    @Transactional
    public AllergyInfo update(Consultation consultation, Object rawHasAllergies, Object rawDetails) {
        if (!(rawHasAllergies instanceof Boolean hasAllergies)) {
            throw new IllegalArgumentException("Please answer the allergy question.");
        }
        String details = rawDetails == null ? "" : String.valueOf(rawDetails).trim();
        if (hasAllergies && details.isBlank()) {
            throw new IllegalArgumentException("Allergy details are required when allergies are selected.");
        }
        if (!hasAllergies) details = null;

        Traveler traveler = consultation.getTraveler();
        if (traveler != null) {
            traveler.setHasAllergies(hasAllergies);
            traveler.setAllergyDetails(details);
            registrations.save(traveler.getRegistration());
        } else {
            Registration registration = latestRegistration(consultation);
            if (registration == null) throw new IllegalArgumentException("Patient record was not found.");
            registration.setHasAllergies(hasAllergies);
            registration.setAllergyDetails(details);
            registrations.save(registration);
        }
        return new AllergyInfo(hasAllergies, details);
    }

    private Registration latestRegistration(Consultation consultation) {
        if (consultation.getUser() == null) return null;
        return registrations.findTopByEmailAddressOrderByIdDesc(consultation.getUser().getEmail()).orElse(null);
    }
}
