// src/main/java/com/godwitcare/web/CareHistoryController.java
package com.godwitcare.web;

import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Prescription;
import com.godwitcare.entity.User;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.PrescriptionRepository;
import com.godwitcare.repo.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.*;

@RestController
@RequestMapping("/api")
public class CareHistoryController {

    private final UserRepository users;
    private final ConsultationRepository consultations;
    private final PrescriptionRepository prescriptions;

    public CareHistoryController(UserRepository users,
                                 ConsultationRepository consultations,
                                 PrescriptionRepository prescriptions) {
        this.users = users;
        this.consultations = consultations;
        this.prescriptions = prescriptions;
    }

    @GetMapping("/care-history/mine")
    public ResponseEntity<?> mine(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        // All consultations for user (newest first)
        List<Consultation> list = consultations.findByUserEmailOrderByIdDesc(u.getEmail());
        if (list.isEmpty()) return ResponseEntity.noContent().build();

        // Patient header from the MOST RECENT consultation
        Consultation latest = list.get(0);
        Map<String, Object> patient = new HashMap<>();
        patient.put("name", Optional.ofNullable(latest.getContactName()).orElse(""));
        patient.put("patientId", Optional.ofNullable(latest.getPatientId()).orElse(""));
        patient.put("dob", latest.getDob() != null ? latest.getDob().toString() : "");

        // Build timeline items where a Prescription exists
        List<Map<String, Object>> items = new ArrayList<>();
        for (Consultation c : list) {
            Optional<Prescription> maybeRx =
                    prescriptions.findTopByConsultationIdOrderByIdDesc(c.getId());

            if (maybeRx.isEmpty()) continue; // show only consultations that have Rx

            Prescription rx = maybeRx.get();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("consultationId", c.getId());
            m.put("date", c.getCreatedAt()); // ISO instant
            // Location from Consultation
            m.put("locationTravellingTo", Optional.ofNullable(c.getCurrentLocation()).orElse(""));
            // HOPC, Diagnosis, Medicines from Prescription
            m.put("presentingComplaint", Optional.ofNullable(rx.getHistoryOfPresentingComplaint()).orElse(""));
            m.put("diagnosis", Optional.ofNullable(rx.getDiagnosis()).orElse(""));
            // You can keep this as a single string or split into a list on newline
            m.put("medicines", Optional.ofNullable(rx.getMedicines()).orElse(""));
            m.put("recommendations", Optional.ofNullable(rx.getRecommendations()).orElse(""));
            items.add(m);
        }

        if (items.isEmpty()) {
            // No prescriptions yet -> keep Home button disabled by returning 204
            return ResponseEntity.noContent().build();
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("patient", patient);
        body.put("items", items);
        return ResponseEntity.ok(body);
    }
}
