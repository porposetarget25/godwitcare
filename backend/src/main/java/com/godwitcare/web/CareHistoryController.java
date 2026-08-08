// src/main/java/com/godwitcare/web/CareHistoryController.java
package com.godwitcare.web;

import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Prescription;
import com.godwitcare.entity.ReferralLetter;
import com.godwitcare.entity.User;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.PrescriptionRepository;
import com.godwitcare.repo.ReferralLetterRepo;
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
    private final ReferralLetterRepo referrals;

    public CareHistoryController(UserRepository users,
                                 ConsultationRepository consultations,
                                 PrescriptionRepository prescriptions,
                                 ReferralLetterRepo referrals) {
        this.users = users;
        this.consultations = consultations;
        this.prescriptions = prescriptions;
        this.referrals = referrals;
    }

    @GetMapping("/care-history/mine")
    public ResponseEntity<?> mine(Authentication auth,
                                  @RequestParam(name = "travelerId", required = false) Long travelerId,
                                  @RequestParam(name = "patientId", required = false) String patientId) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        // All consultations for user (newest first)
        List<Consultation> list;
        if (patientId != null && !patientId.isBlank()) {
            list = consultations.findByUserEmailAndPatientIdOrderByIdDesc(u.getEmail(), patientId);
        } else if (travelerId != null) {
            list = consultations.findByUserEmailAndTravelerIdOrderByIdDesc(u.getEmail(), travelerId);
        } else {
            list = consultations.findByUserEmailAndTravelerIsNullOrderByIdDesc(u.getEmail());
        }
        if (list.isEmpty()) return ResponseEntity.noContent().build();

        // Patient header from the MOST RECENT consultation
        Consultation latest = list.get(0);
        Map<String, Object> patient = new HashMap<>();
        patient.put("name", Optional.ofNullable(latest.getContactName()).orElse(""));
        patient.put("patientId", Optional.ofNullable(latest.getPatientId()).orElse(""));
        patient.put("dob", latest.getDob() != null ? latest.getDob().toString() : "");

        // Build timeline items where a Prescription exists OR a consultation was completed with no prescription
        List<Map<String, Object>> items = new ArrayList<>();
        for (Consultation c : list) {
            Optional<Prescription> maybeRx =
                    prescriptions.findTopByConsultationIdOrderByIdDesc(c.getId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("consultationId", c.getId());
            m.put("date", c.getCreatedAt()); // ISO instant
            m.put("status", c.getStatus() != null ? c.getStatus().name() : "LOGGED");
            // Location from Consultation
            m.put("locationTravellingTo", Optional.ofNullable(c.getCurrentLocation()).orElse(""));
            referrals.findTopByConsultationIdOrderByIdDesc(c.getId())
                    .ifPresent(ref -> m.put("referralPdfUrl", "/api/referrals/" + ref.getId() + "/pdf"));

            if (maybeRx.isPresent()) {
                Prescription rx = maybeRx.get();
                m.put("presentingComplaint", Optional.ofNullable(rx.getHistoryOfPresentingComplaint()).orElse(""));
                m.put("diagnosis", Optional.ofNullable(rx.getDiagnosis()).orElse(""));
                m.put("medicines", Optional.ofNullable(rx.getMedicines()).orElse(""));
                m.put("recommendations", Optional.ofNullable(rx.getRecommendations()).orElse(""));
                m.put("pdfUrl", "/api/prescriptions/" + rx.getId() + "/pdf");
                items.add(m);
                continue;
            }

            boolean noPrescriptionCompleted =
                    c.getStatus() == Consultation.Status.COMPLETED
                            && !Boolean.TRUE.equals(c.getPrescriptionRequired());
            if (!noPrescriptionCompleted) continue;

            m.put("presentingComplaint", Optional.ofNullable(c.getHistoryOfPresentingComplaint()).orElse(""));
            m.put("diagnosis", Optional.ofNullable(c.getDiagnosis()).orElse(""));
            m.put("medicines", "");
            m.put("recommendations", Optional.ofNullable(c.getRecommendations()).orElse(""));
            items.add(m);
        }

        if (items.isEmpty()) {
            // No prescription/no-prescription-completed history yet -> keep Home button disabled by returning 204
            return ResponseEntity.noContent().build();
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("patient", patient);
        body.put("items", items);
        return ResponseEntity.ok(body);
    }

    /**
     * Gives a doctor the same longitudinal record while they are treating a patient.
     * The consultation id is deliberately used as the lookup key so a doctor never
     * has to know (or submit) the patient's account identifier.
     */
    @GetMapping("/doctor/consultations/{consultationId}/care-history")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> forDoctor(@PathVariable Long consultationId) {
        Consultation selected = consultations.findById(consultationId).orElse(null);
        if (selected == null || selected.getUser() == null) return ResponseEntity.notFound().build();

        List<Consultation> list = consultations.findByUserEmailAndPatientIdOrderByIdDesc(
                selected.getUser().getEmail(), selected.getPatientId());
        Map<String, Object> body = buildHistory(list);
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> buildHistory(List<Consultation> list) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (list.isEmpty()) {
            body.put("items", List.of());
            return body;
        }
        Consultation latest = list.get(0);
        Map<String, Object> patient = new LinkedHashMap<>();
        patient.put("name", Optional.ofNullable(latest.getContactName()).orElse(""));
        patient.put("patientId", Optional.ofNullable(latest.getPatientId()).orElse(""));
        patient.put("dob", latest.getDob() != null ? latest.getDob().toString() : "");
        body.put("patient", patient);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Consultation c : list) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("consultationId", c.getId());
            item.put("date", c.getCreatedAt());
            item.put("status", c.getStatus() != null ? c.getStatus().name() : "LOGGED");
            item.put("locationTravellingTo", Optional.ofNullable(c.getCurrentLocation()).orElse(""));
            item.put("presentingComplaint", Optional.ofNullable(c.getHistoryOfPresentingComplaint()).orElse(""));
            item.put("diagnosis", Optional.ofNullable(c.getDiagnosis()).orElse(""));
            item.put("recommendations", Optional.ofNullable(c.getRecommendations()).orElse(""));
            Optional<Prescription> rx = prescriptions.findTopByConsultationIdOrderByIdDesc(c.getId());
            item.put("medicines", rx.map(Prescription::getMedicines).orElse(""));
            rx.ifPresent(p -> {
                item.put("presentingComplaint", Optional.ofNullable(p.getHistoryOfPresentingComplaint()).orElse(""));
                item.put("diagnosis", Optional.ofNullable(p.getDiagnosis()).orElse(""));
                item.put("recommendations", Optional.ofNullable(p.getRecommendations()).orElse(""));
            });
            items.add(item);
        }
        body.put("items", items);
        return body;
    }
}
