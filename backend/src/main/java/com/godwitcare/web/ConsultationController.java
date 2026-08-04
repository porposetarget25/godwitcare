package com.godwitcare.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Prescription;
import com.godwitcare.entity.User;
import com.godwitcare.entity.Registration;
import com.godwitcare.entity.Traveler;
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
import org.springframework.beans.factory.annotation.Value;


import java.util.*;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.Duration;
import java.time.Instant;


@RestController
@RequestMapping("/api")
public class ConsultationController {

    private final ConsultationRepository consultations;
    private final UserRepository users;
    private final ObjectMapper om = new ObjectMapper();
    private final PrescriptionRepository prescriptions;
    private RegistrationRepository registrations;
    private final PrescriptionPdfService pdfs;
    @Value("${app.consultation.active-hours:48}")
    private long consultationActiveHours;


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

        Long travelerId = null;
        Object travelerIdVal = body.get("travelerId");
        if (travelerIdVal != null) {
            try {
                travelerId = Long.valueOf(String.valueOf(travelerIdVal));
            } catch (NumberFormatException ex) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid traveller identifier."));
            }
        }
        Traveler selectedTraveler = resolveOwnedTraveler(u, travelerId);
        if (travelerId != null && selectedTraveler == null) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not authorized to manage this traveller."));
        }
        String patientId = buildTravelerPatientId(u, travelerId);
        Object requestedPatientId = body.get("patientId");
        if (requestedPatientId == null || !patientId.equals(String.valueOf(requestedPatientId))) {
            return ResponseEntity.badRequest().body(Map.of("message", "A valid selected patient identifier is required."));
        }

        boolean hasActiveConsultation = consultations
                .findByUserEmailAndPatientIdOrderByIdDesc(u.getEmail(), patientId)
                .stream().anyMatch(this::isActive);
        if (hasActiveConsultation) {
            return ResponseEntity.status(409).body(Map.of(
                    "message", "This patient's current consultation must be closed or expire before another can be created."));
        }

        Consultation c = new Consultation();
        c.setUser(u);
        c.setPatientId(patientId);

        if (travelerId != null) {
            c.setTraveler(selectedTraveler);
            c.setContactName(selectedTraveler.getFullName());
            c.setDob(selectedTraveler.getDateOfBirth());
        } else {
            c.setTraveler(null);
            c.setContactName(fullName(u));
        }
        c.setCurrentLocation((String) body.getOrDefault("currentLocation", ""));
        c.setContactPhone((String) body.getOrDefault("contactPhone", ""));
        c.setContactAddress((String) body.getOrDefault("contactAddress", ""));

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

    private String buildTravelerPatientId(User user, Long travelerId) {
        // A consultation's patient ID was historically the public, stable ID for
        // this patient. Keep returning it when records already exist so adding
        // registration-document IDs cannot split the patient's care history.
        List<Consultation> existingConsultations = travelerId == null
                ? consultations.findByUserEmailAndTravelerIsNullOrderByIdDesc(user.getEmail())
                : consultations.findByUserEmailAndTravelerIdOrderByIdDesc(user.getEmail(), travelerId);
        String existingPatientId = existingConsultations.stream()
                .map(Consultation::getPatientId)
                .filter(id -> id != null && !id.isBlank())
                .findFirst()
                .orElse(null);
        if (existingPatientId != null) return existingPatientId;

        Registration latest = registrations.findTopByEmailAddressOrderByIdDesc(user.getEmail()).orElse(null);
        if (latest != null) {
            if (travelerId == null) return latest.getPrimaryPatientId();
            return latest.getTravelers().stream().filter(t -> Objects.equals(t.getId(), travelerId))
                    .map(Traveler::getPatientId).findFirst().orElse("");
        }
        return "PV-" + String.format("%09d", user.getId() == null ? 0L : user.getId());
    }

    private Traveler resolveOwnedTraveler(User user, Long travelerId) {
        if (travelerId == null) return null;
        Registration latest = registrations.findTopByEmailAddressOrderByIdDesc(user.getEmail()).orElse(null);
        if (latest == null || latest.getTravelers() == null) return null;
        return latest.getTravelers().stream()
                .filter(t -> Objects.equals(t.getId(), travelerId))
                .findFirst().orElse(null);
    }

    private static String fullName(User user) {
        return ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
    }


    @GetMapping("/consultations/travelers")
    public ResponseEntity<List<Map<String, Object>>> travelerOptions(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        Registration latest = registrations.findTopByEmailAddressOrderByIdDesc(u.getEmail()).orElse(null);
        List<Map<String, Object>> out = new ArrayList<>();

        Map<String, Object> primary = new LinkedHashMap<>();
        primary.put("id", "PRIMARY");
        primary.put("name", (u.getFirstName() == null ? "" : u.getFirstName()) + " " + (u.getLastName() == null ? "" : u.getLastName()));
        primary.put("patientId", buildTravelerPatientId(u, null));
        out.add(primary);

        if (latest != null) {
            for (Traveler t : latest.getTravelers()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", t.getId());
                row.put("name", t.getFullName());
                row.put("patientId", buildTravelerPatientId(u, t.getId()));
                out.add(row);
            }
        }
        return ResponseEntity.ok(out);
    }

    @GetMapping("/consultations/mine/latest")
    public ResponseEntity<Map<String, Object>> myLatest(Authentication auth,
                                                        @RequestParam(name = "travelerId", required = false) Long travelerId,
                                                       @RequestParam(name = "patientId", required = false) String patientId) throws Exception {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();
        if (!isAuthorizedPatientContext(u, travelerId, patientId)) {
            return ResponseEntity.status(403).build();
        }

        var list = (patientId != null && !patientId.isBlank())
                ? consultations.findByUserEmailAndPatientIdOrderByIdDesc(u.getEmail(), patientId)
                : (travelerId == null
                ? consultations.findByUserEmailAndTravelerIsNullOrderByIdDesc(u.getEmail())
                : consultations.findByUserEmailAndTravelerIdOrderByIdDesc(u.getEmail(), travelerId));
        if (list.isEmpty()) return ResponseEntity.noContent().build();

        var c = list.get(0);
        var res = new java.util.HashMap<String, Object>();
        res.put("id", c.getId());
        res.put("createdAt", c.getCreatedAt());
        res.put("status", c.getStatus().name());
        Instant expiresAt = c.getCreatedAt().plus(Duration.ofHours(consultationActiveHours));
        res.put("expiresAt", expiresAt);
        res.put("active", isActive(c));
        res.put("eligibleForNewConsultation", !isActive(c));
        res.put("contactName", c.getContactName());
        res.put("contactPhone", c.getContactPhone());
        res.put("contactAddress", c.getContactAddress());
        res.put("currentLocation", c.getCurrentLocation());
        res.put("dob", c.getDob() != null ? c.getDob().toString() : null);
        res.put("patientId", c.getPatientId());
        return ResponseEntity.ok(res);
    }

    private boolean isAuthorizedPatientContext(User user, Long travelerId, String patientId) {
        if (travelerId != null && resolveOwnedTraveler(user, travelerId) == null) return false;
        String expected = buildTravelerPatientId(user, travelerId);
        return patientId == null || patientId.isBlank() || expected.equals(patientId);
    }

    private boolean isActive(Consultation consultation) {
        return consultation.getStatus() != Consultation.Status.COMPLETED
                && consultation.getCreatedAt() != null
                && consultation.getCreatedAt().plus(Duration.ofHours(consultationActiveHours)).isAfter(Instant.now());
    }

    // ---------- Doctor: list (with optional status filter) ----------
    @GetMapping("/doctor/consultations")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<Map<String, Object>> listAll(
            @RequestParam(name = "status", required = false, defaultValue = "ALL") String statusParam,
            @RequestParam(name = "patientName", required = false) String patientName,
            @RequestParam(name = "from", required = false) LocalDate from,
            @RequestParam(name = "to", required = false) LocalDate to
    ) {
        final Consultation.Status filterStatus = parseFilterStatus(statusParam);
        // Keep the search parameter a non-null String. PostgreSQL can otherwise infer a
        // null parameter used by lower(concat(...)) as bytea and reject lower(bytea).
        String normalizedName = patientName == null || patientName.isBlank()
                ? "" : patientName.trim();
        java.time.Instant fromInstant = from == null
                ? null : from.atStartOfDay(ZoneOffset.UTC).toInstant();
        // The upper bound is exclusive, so the selected "To" calendar day is included.
        java.time.Instant toInstant = to == null
                ? null : to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<Consultation> all = consultations.searchForDoctor(
                filterStatus, normalizedName, from != null, fromInstant, to != null, toInstant);

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
                    d.put("historyOfPresentingComplaint", nz(c.getHistoryOfPresentingComplaint()));
                    d.put("diagnosis", nz(c.getDiagnosis()));
                    d.put("recommendations", nz(c.getRecommendations()));
                    d.put("prescriptionRequired", c.getPrescriptionRequired() == null || c.getPrescriptionRequired());

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
        if (c.getStatus() == Consultation.Status.COMPLETED) {
            return ResponseEntity.status(409).body(Map.of("error", "Completed consultations are read-only"));
        }

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

        return ResponseEntity.ok(Map.of("id", p.getId()));
    }

    @PutMapping("/doctor/consultations/{id}/complete")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> completeConsultation(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) throws Exception {
        Consultation c = consultations.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        if (c.getStatus() == Consultation.Status.COMPLETED) {
            return ResponseEntity.status(409).body(Map.of("error", "Consultation is already completed"));
        }

        c.setStatus(Consultation.Status.COMPLETED);
        c.setHistoryOfPresentingComplaint((String) body.getOrDefault("history", c.getHistoryOfPresentingComplaint()));
        c.setDiagnosis((String) body.getOrDefault("diagnosis", c.getDiagnosis()));
        c.setRecommendations((String) body.getOrDefault("recommendations", c.getRecommendations()));
        Object prescriptionRequired = body.get("prescriptionRequired");
        if (prescriptionRequired instanceof Boolean b) c.setPrescriptionRequired(b);

        consultations.save(c);
        return ResponseEntity.ok(Map.of("id", c.getId(), "status", c.getStatus().name(), "updated", true));
    }

    @PutMapping("/doctor/consultations/{id}/save-questionnaire")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> saveQuestionnaire(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        Consultation c = consultations.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        // Keep the route for older clients, but never permit a doctor to mutate
        // answers supplied by the patient.
        return ResponseEntity.status(403).body(Map.of(
                "error", "Patient questionnaire responses are read-only"));
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
    public ResponseEntity<?> patientLatestPrescription(Authentication auth,
                                                       @RequestParam(name = "travelerId", required = false) Long travelerId,
                                                       @RequestParam(name = "patientId", required = false) String patientId) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        var u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        Optional<Prescription> latestPrescription;
        if (patientId != null && !patientId.isBlank()) {
            latestPrescription = prescriptions.findTopByConsultationUserIdAndConsultationPatientIdOrderByIdDesc(u.getId(), patientId);
        } else if (travelerId != null) {
            latestPrescription = prescriptions.findTopByConsultationUserIdAndConsultationTravelerIdOrderByIdDesc(u.getId(), travelerId);
        } else {
            latestPrescription = prescriptions.findTopByConsultationUserIdAndConsultationTravelerIsNullOrderByIdDesc(u.getId());
        }
        if (latestPrescription.isEmpty()) return ResponseEntity.noContent().build();

        return latestPrescription
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
