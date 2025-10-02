package com.godwitcare.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Prescription;
import com.godwitcare.entity.User;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.PrescriptionRepository;
import com.godwitcare.repo.RegistrationRepository;
import com.godwitcare.repo.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.godwitcare.util.PdfMaker;

import java.util.*;

@RestController
@RequestMapping("/api")
public class ConsultationController {

    private final ConsultationRepository consultations;
    private final UserRepository users;
    private final ObjectMapper om = new ObjectMapper();
    private final PrescriptionRepository prescriptions;
    private RegistrationRepository registrations;



    public ConsultationController(UserRepository users,
                                  ConsultationRepository consultations,
                                  RegistrationRepository registrations,
                                  PrescriptionRepository prescriptions) {
        this.users = users;
        this.consultations = consultations;
        this.registrations = registrations;
        this.prescriptions = prescriptions;
    }

    @PostMapping("/consultations")
    public ResponseEntity<Map<String, Object>> create(
            Authentication auth,
            @RequestBody Map<String, Object> body
    ) throws Exception {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        Consultation c = new Consultation();
        c.setUser(u);
        c.setCurrentLocation((String) body.getOrDefault("currentLocation", ""));
        c.setContactName((String) body.getOrDefault("contactName", ""));
        c.setContactPhone((String) body.getOrDefault("contactPhone", ""));
        c.setContactAddress((String) body.getOrDefault("contactAddress", ""));
        // Generate unique 9-digit patientId
        String patientId = "PV-" + String.format("%09d", (int)(Math.random() * 1_000_000_000));
        c.setPatientId(patientId);

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // Save answers (qid -> "Yes"/"No")
        c.setAnswersJson(mapper.writeValueAsString(
                body.getOrDefault("answers", java.util.Map.of())
        ));

        // NEW: save optional free-text notes per question (qid -> note)
        c.setDetailsByQuestionJson(mapper.writeValueAsString(
                body.getOrDefault("detailsByQuestion", java.util.Map.of())
        ));
        Object dobVal = body.get("dob");
        if (dobVal instanceof String dobStr && !dobStr.isBlank()) {
            try { c.setDob(java.time.LocalDate.parse(dobStr)); } catch (Exception ignored) {}
        }
        c = consultations.save(c);

        return ResponseEntity.ok(java.util.Map.of(
                "id", c.getId(),
                "status", c.getStatus().name()
        ));
    }


    @GetMapping("/consultations/mine/latest")
    public ResponseEntity<Map<String, Object>> myLatest(Authentication auth) throws Exception {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        var list = consultations.findByUserEmailOrderByIdDesc(u.getEmail());
        if (list.isEmpty()) return ResponseEntity.noContent().build();

        var c = list.get(0);
        var res = new java.util.HashMap<String, Object>();
        res.put("id", c.getId());
        res.put("createdAt", c.getCreatedAt());
        res.put("status", c.getStatus().name());
        return ResponseEntity.ok(res);
    }

    // ---------- Doctor: list ----------
    @GetMapping("/doctor/consultations")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<Map<String, Object>> listAll() {
        List<Consultation> all = consultations.findAll();
        all.sort(Comparator.comparingLong(Consultation::getId).reversed());
        List<Map<String, Object>> out = new ArrayList<>();
        for (Consultation c : all) {
            var u = c.getUser();
            out.add(Map.of(
                    "id", c.getId(),
                    "patientEmail", u.getEmail(),
                    "patientName", (u.getFirstName() == null ? "" : u.getFirstName()) +
                            (u.getLastName() == null ? "" : " " + u.getLastName()),
                    "createdAt", c.getCreatedAt(),
                    "status", c.getStatus().name()
            ));
        }
        return out;
    }

    // ---------- Doctor: details ----------
    @GetMapping("/doctor/consultations/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, Object>> details(@PathVariable Long id) {
        return consultations.findById(id)
                .map(c -> {
                    var u = c.getUser();
                    Map<String, Object> d = new HashMap<>();
                    d.put("id", c.getId());
                    d.put("patientId", c.getPatientId());
                    d.put("createdAt", c.getCreatedAt());
                    d.put("status", c.getStatus().name());
                    d.put("patient", Map.of(
                            "email", u.getEmail(),
                            "firstName", u.getFirstName(),
                            "lastName", u.getLastName(),
                            "dob", c.getDob() != null ? c.getDob().toString():""
                    ));
                    d.put("currentLocation", c.getCurrentLocation());
                    d.put("contactName", c.getContactName());
                    d.put("contactPhone", c.getContactPhone());
                    d.put("contactAddress", c.getContactAddress());
                    ObjectMapper mapper = new ObjectMapper();

                    // Existing: answers (qid -> "Yes"/"No")
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, String> answers =
                                mapper.readValue(c.getAnswersJson(), Map.class);
                        d.put("answers", answers != null ? answers : Map.of());
                    } catch (Exception ex) {
                        d.put("answers", Map.of());
                    }

                    // NEW: free-text notes per question (qid -> note)
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, String> detailsByQuestion =
                                mapper.readValue(
                                        c.getDetailsByQuestionJson() == null ? "{}" : c.getDetailsByQuestionJson(),
                                        Map.class
                                );
                        d.put("detailsByQuestion", detailsByQuestion != null ? detailsByQuestion : Map.of());
                    } catch (Exception ex) {
                        d.put("detailsByQuestion", Map.of());
                    }

                    return ResponseEntity.ok(d);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ---------- Doctor creates a prescription for a consultation ----------
    @PostMapping("/doctor/consultations/{id}/prescriptions")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String,Object>> createPrescription(
            @PathVariable Long id,
            @RequestBody Map<String,Object> body
    ) throws Exception {
        Consultation c = consultations.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();

        String history = (String) body.getOrDefault("history", "");
        String diagnosis = (String) body.getOrDefault("diagnosis", "");
        @SuppressWarnings("unchecked")
        List<String> meds = (List<String>) body.getOrDefault("medicines", java.util.List.of());

        String patientName = (c.getUser().getFirstName() + " " + c.getUser().getLastName()).trim();
        String patientDob   = c.getDob() != null ? c.getDob().toString() : null;
        String patientPhone = c.getContactPhone();
        String patientId    = c.getPatientId(); // you already set this when first created

        byte[] pdf = PdfMaker.makePrescriptionPdf(
                "GodwitCare", patientName, patientDob, patientPhone, patientId,
                diagnosis, history, meds
        );

        Prescription p = new Prescription();
        p.setConsultation(c);
        p.setPatientId(patientId);
        p.setPatientName(patientName);
        p.setPatientDob(patientDob);
        p.setPatientPhone(patientPhone);
        p.setHistoryOfPresentingComplaint(history);
        p.setDiagnosis(diagnosis);
        p.setMedicines(String.join("\n", meds));
        p.setPdfBytes(pdf);
        p.setSize(pdf.length);
        // fileName/contentType defaults OK

        p = prescriptions.save(p);

        return ResponseEntity.ok(Map.of("id", p.getId()));
    }

    // ---------- Doctor download any prescription by id ----------
    @GetMapping("/doctor/prescriptions/{pid}/pdf")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<byte[]> downloadPrescriptionDoctor(@PathVariable Long pid) {
        return prescriptions.findById(pid)
                .map(p -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(p.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "inline; filename=\"" + p.getFileName() + "\"")
                        .body(p.getPdfBytes()))
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/doctor/consultations/{id}/prescriptions/latest")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> doctorLatestPrescription(@PathVariable Long id) {
        return prescriptions.findTopByConsultationIdOrderByIdDesc(id)
                .<ResponseEntity<?>>map(p -> {
                    var body = new java.util.HashMap<String, Object>();
                    body.put("id", p.getId());
                    body.put("createdAt", p.getCreatedAt());
                    body.put("fileName", p.getFileName());
                    body.put("size", p.getSize());
                    // existing doctor PDF route you already have:
                    body.put("pdfUrl", "/api/doctor/prescriptions/" + p.getId() + "/pdf");
                    return ResponseEntity.ok(body);
                })
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/prescriptions/latest")
    public ResponseEntity<?> patientLatestPrescription(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        var u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        return prescriptions.findTopByConsultation_User_IdOrderByIdDesc(u.getId())
                .<ResponseEntity<?>>map(p -> {
                    var body = new java.util.HashMap<String, Object>();
                    body.put("id", p.getId());
                    body.put("createdAt", p.getCreatedAt());
                    body.put("fileName", p.getFileName());
                    body.put("size", p.getSize());
                    // patient-safe PDF route (ownership checked below)
                    body.put("pdfUrl", "/api/prescriptions/" + p.getId() + "/pdf");
                    return ResponseEntity.ok(body);
                })
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/prescriptions/{rxId}/pdf")
    public ResponseEntity<byte[]> patientDownloadPrescription(
            @PathVariable Long rxId,
            Authentication auth
    ) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        var u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        var p = prescriptions.findById(rxId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();

        // enforce ownership
        var owner = p.getConsultation().getUser();
        if (owner == null || !owner.getId().equals(u.getId())) {
            return ResponseEntity.status(403).build();
        }

        var bytes = p.getPdfBytes();
        if (bytes == null || bytes.length == 0) return ResponseEntity.notFound().build();

        return ResponseEntity.ok()
                .header("Content-Type", p.getContentType() != null ? p.getContentType() : "application/pdf")
                .header("Content-Disposition", "inline; filename=\"" + (p.getFileName() != null ? p.getFileName() : ("prescription-" + rxId + ".pdf")) + "\"")
                .body(bytes);
    }
}
