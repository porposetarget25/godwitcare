package com.godwitcare.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Prescription;
import com.godwitcare.entity.User;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.PrescriptionRepository;
import com.godwitcare.repo.RegistrationRepository;
import com.godwitcare.repo.UserRepository;
import com.godwitcare.service.PrescriptionPdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


import java.util.*;


@RestController
@RequestMapping("/api")
public class ConsultationController {

    private final ConsultationRepository consultations;
    private final UserRepository users;
    private final ObjectMapper om = new ObjectMapper();
    private final PrescriptionRepository prescriptions;
    private RegistrationRepository registrations;
    private final PrescriptionPdfService pdfs;


    public ConsultationController(UserRepository users,
                                  ConsultationRepository consultations,
                                  RegistrationRepository registrations,
                                  PrescriptionRepository prescriptions,
                                  PrescriptionPdfService pdfs) {
        this.users = users;
        this.consultations = consultations;
        this.registrations = registrations;
        this.prescriptions = prescriptions;
        this.pdfs = pdfs;
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
        String patientId = "PV-" + String.format("%09d", (int) (Math.random() * 1_000_000_000));
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
            try {
                c.setDob(java.time.LocalDate.parse(dobStr));
            } catch (Exception ignored) {
            }
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

    // ---------- Doctor: list (with optional status filter) ----------
    @GetMapping("/doctor/consultations")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<Map<String, Object>> listAll(
            @RequestParam(name = "status", required = false, defaultValue = "ALL") String statusParam
    ) {
        List<Consultation> all = consultations.findAll();
        all.sort(Comparator.comparingLong(Consultation::getId).reversed());

        final Consultation.Status filterStatus = parseFilterStatus(statusParam);
        if (filterStatus != null) {
            all = all.stream()
                    .filter(c -> c.getStatus() == filterStatus)
                    .collect(java.util.stream.Collectors.toList());
        }

        List<Map<String, Object>> out = new ArrayList<>(all.size());
        for (Consultation c : all) {
            var u = c.getUser(); // can be null in prod data
            var row = new LinkedHashMap<String, Object>();
            row.put("id", c.getId());
            row.put("patientEmail", u != null ? u.getEmail() : null); // allow null safely
            row.put("patientName", nz(c.getContactName()));
            row.put("createdAt", c.getCreatedAt()); // Instant (non-null typically; ok if null)
            row.put("status", c.getStatus() != null ? c.getStatus().name() : "LOGGED");
            out.add(row);
        }
        return out;
    }


    private static Consultation.Status parseFilterStatus(String statusParam) {
        if (statusParam == null || "ALL".equalsIgnoreCase(statusParam)) return null;
        try {
            return Consultation.Status.valueOf(statusParam.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }


    // ---------- Doctor: details ----------
    @GetMapping("/doctor/consultations/{id}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, Object>> details(@PathVariable Long id) {
        return consultations.findById(id)
                .map(c -> {
                    var u = c.getUser(); // may be null in prod
                    Map<String, Object> d = new LinkedHashMap<>();
                    d.put("id", c.getId());
                    d.put("patientId", c.getPatientId());
                    d.put("createdAt", c.getCreatedAt());
                    d.put("status", c.getStatus() != null ? c.getStatus().name() : "LOGGED");

                    // build patient sub-map without Map.of (null-safe)
                    Map<String, Object> patient = new LinkedHashMap<>();
                    patient.put("email", u != null ? u.getEmail() : null);
                    patient.put("firstName", nz(c.getContactName()));
                    patient.put("dob", c.getDob() != null ? c.getDob().toString() : "");
                    d.put("patient", patient);

                    d.put("currentLocation", nz(c.getCurrentLocation()));
                    d.put("contactName", nz(c.getContactName()));
                    d.put("contactPhone", nz(c.getContactPhone()));
                    d.put("contactAddress", nz(c.getContactAddress()));

                    ObjectMapper mapper = new ObjectMapper();
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, String> answers =
                                mapper.readValue(c.getAnswersJson() == null ? "{}" : c.getAnswersJson(), Map.class);
                        d.put("answers", answers != null ? answers : Collections.emptyMap());
                    } catch (Exception ex) {
                        d.put("answers", Collections.emptyMap());
                    }

                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, String> detailsByQuestion =
                                mapper.readValue(c.getDetailsByQuestionJson() == null ? "{}" : c.getDetailsByQuestionJson(), Map.class);
                        d.put("detailsByQuestion", detailsByQuestion != null ? detailsByQuestion : Collections.emptyMap());
                    } catch (Exception ex) {
                        d.put("detailsByQuestion", Collections.emptyMap());
                    }

                    return ResponseEntity.ok(d);
                })
                .orElse(ResponseEntity.notFound().build());
    }


    // ---------- Doctor creates a prescription for a consultation ----------
    @PostMapping("/doctor/consultations/{id}/prescriptions")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Map<String, Object>> createPrescription(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) throws Exception {
        Consultation c = consultations.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();

        String history = (String) body.getOrDefault("history", "");
        String diagnosis = (String) body.getOrDefault("diagnosis", "");
        @SuppressWarnings("unchecked")
        List<String> meds = (List<String>) body.getOrDefault("medicines", java.util.List.of());
        String recommendations = (String) body.getOrDefault("recommendations", "");

        String patientName = (c.getContactName() == null ? "" : c.getContactName().trim());
        String patientDob = c.getDob() != null ? c.getDob().toString() : null;
        String patientPhone = c.getContactPhone();
        String patientId = c.getPatientId(); // you already set this when first created

        // Build the beautiful PDF (logo + signature) via the service
        byte[] pdf = pdfs.buildPrescriptionPdf(
                /* patient */ patientName,
                c.getDob(),                 // LocalDate
                patientPhone,
                patientId,
                c.getContactAddress(),
                /* consult */ diagnosis,
                history,
                meds, recommendations,
                /* doctor block (put your real values / pull from auth doctor profile) */
                "Dr. Dimitris–Christos Zachariades",
                "GMC Registration: 6164496",
                "15 Regent’s Park Rd, London NW1 8XL, UK",
                "+44 20 7123 4567",
                "dzachariades@nhs.net"
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
        p.setRecommendations(recommendations);
        p.setPdfBytes(pdf);
        p.setSize(Long.valueOf(pdf.length));
        p.setContentType("application/pdf");
        if (p.getFileName() == null || p.getFileName().isBlank()) {
            p.setFileName("prescription-" + System.currentTimeMillis() + ".pdf");
        }

        p = prescriptions.save(p);
        // ✅ mark consultation completed
        c.setStatus(Consultation.Status.COMPLETED);
        consultations.save(c);

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

    // In ConsultationController

    // Patient fetch own consultation to prefill the form
    @GetMapping("/consultations/{id}/mine")
    public ResponseEntity<Map<String, Object>> getMine(
            @PathVariable Long id, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        String principal = auth.getName();
        var u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal)).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        Consultation c = consultations.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        if (!Objects.equals(c.getUser().getId(), u.getId()))
            return ResponseEntity.status(403).build();

        Map<String, Object> d = new HashMap<>();
        d.put("id", c.getId());
        d.put("createdAt", c.getCreatedAt());
        d.put("currentLocation", c.getCurrentLocation());
        d.put("contactName", c.getContactName());
        d.put("contactPhone", c.getContactPhone());
        d.put("contactAddress", c.getContactAddress());
        d.put("patientId", c.getPatientId());
        d.put("dob", c.getDob() != null ? c.getDob().toString() : "");

        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, String> answers = mapper.readValue(
                    c.getAnswersJson() == null ? "{}" : c.getAnswersJson(), Map.class);
            d.put("answers", answers != null ? answers : Map.of());
            @SuppressWarnings("unchecked")
            Map<String, String> detailsByQuestion = mapper.readValue(
                    c.getDetailsByQuestionJson() == null ? "{}" : c.getDetailsByQuestionJson(), Map.class);
            d.put("detailsByQuestion", detailsByQuestion != null ? detailsByQuestion : Map.of());
        } catch (Exception e) {
            d.put("answers", Map.of());
            d.put("detailsByQuestion", Map.of());
        }
        return ResponseEntity.ok(d);
    }

    // Patient updates (overwrites) their own consultation
    @PutMapping("/consultations/{id}")
    public ResponseEntity<?> updateMine(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) throws Exception {
        if (auth == null) return ResponseEntity.status(401).build();
        String principal = auth.getName();
        var u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal)).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        Consultation c = consultations.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        if (!Objects.equals(c.getUser().getId(), u.getId()))
            return ResponseEntity.status(403).build();

        c.setCurrentLocation((String) body.getOrDefault("currentLocation", c.getCurrentLocation()));
        c.setContactName((String) body.getOrDefault("contactName", c.getContactName()));
        c.setContactPhone((String) body.getOrDefault("contactPhone", c.getContactPhone()));
        c.setContactAddress((String) body.getOrDefault("contactAddress", c.getContactAddress()));

        Object dobVal = body.get("dob");
        if (dobVal instanceof String s && !s.isBlank()) {
            try {
                c.setDob(java.time.LocalDate.parse(s));
            } catch (Exception ignored) {
            }
        }

        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        c.setAnswersJson(mapper.writeValueAsString(
                body.getOrDefault("answers", Map.of())
        ));
        c.setDetailsByQuestionJson(mapper.writeValueAsString(
                body.getOrDefault("detailsByQuestion", Map.of())
        ));

        consultations.save(c);
        return ResponseEntity.ok(Map.of("id", c.getId(), "updated", true));
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

}
