package com.godwitcare.web;

import com.godwitcare.entity.Registration;
import com.godwitcare.entity.Traveler;
import com.godwitcare.entity.RegistrationDocument;
import com.godwitcare.repo.RegistrationDocumentRepository;
import com.godwitcare.repo.RegistrationRepository;
import com.godwitcare.repo.ConsultationRepository;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;


import java.util.*;

@RestController
@RequestMapping("/api")
public class RegistrationController {

    private final RegistrationRepository repo;
    private final RegistrationDocumentRepository docs;
    private final UserRepository users;
    private final ConsultationRepository consultations;


    public RegistrationController(RegistrationRepository repo,
                                  RegistrationDocumentRepository docs,
                                  UserRepository users,
                                  ConsultationRepository consultations) {
        this.repo = repo;
        this.docs = docs;
        this.users = users;
        this.consultations = consultations;
    }

    /* ---------------- Registrations ---------------- */

    @PostMapping("/registrations")
    public ResponseEntity<?> create(@Valid @RequestBody Registration r) {
        if (r.getTravelers() == null) r.setTravelers(new java.util.ArrayList<>());

        // Drop empty rows to avoid @NotBlank/@NotNull violations
        r.getTravelers().removeIf(t ->
                t.getFullName() == null || t.getFullName().isBlank() || t.getDateOfBirth() == null);

        // Co-travellers must use the atomic multipart endpoint, which cannot create
        // a traveller unless both documents are present and successfully stored.
        if (!r.getTravelers().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Co-travellers must be added with both required documents."));
        }

        Registration saved = repo.save(r);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/registrations/{id}")
    @Transactional
    public ResponseEntity<?> update(
            @PathVariable("id") Long id, @Valid @RequestBody Registration r) {

        return repo.findById(id)
                .map(existing -> {
                    List<Traveler> normalizedTravelers = normalizeTravelers(r.getTravelers());
                    if (normalizedTravelers.size() > 6) return ResponseEntity.badRequest().build();
                    Set<Long> existingIds = existing.getTravelers().stream()
                            .map(Traveler::getId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
                    boolean containsNewTraveler = normalizedTravelers.stream()
                            .anyMatch(t -> t.getId() == null || !existingIds.contains(t.getId()));
                    if (containsNewTraveler) {
                        return ResponseEntity.badRequest().body(Map.of("message",
                                "New co-travellers must be added with both required documents."));
                    }

                    copyRegistrationDetails(existing, r);
                    syncTravelers(existing, normalizedTravelers);

                    return ResponseEntity.ok(repo.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private List<Traveler> normalizeTravelers(List<Traveler> requestedTravelers) {
        if (requestedTravelers == null) return List.of();
        List<Traveler> normalizedTravelers = new ArrayList<>();
        for (Traveler traveler : requestedTravelers) {
            if (traveler == null || traveler.getFullName() == null || traveler.getFullName().isBlank() || traveler.getDateOfBirth() == null) {
                continue;
            }
            traveler.setFullName(traveler.getFullName().trim());
            normalizedTravelers.add(traveler);
        }
        return normalizedTravelers;
    }

    private void copyRegistrationDetails(Registration target, Registration source) {
        target.setFirstName(source.getFirstName());
        target.setMiddleName(source.getMiddleName());
        target.setLastName(source.getLastName());
        target.setDateOfBirth(source.getDateOfBirth());
        target.setGender(source.getGender());
        target.setPrimaryWhatsAppNumber(source.getPrimaryWhatsAppNumber());
        target.setCarerSecondaryWhatsAppNumber(source.getCarerSecondaryWhatsAppNumber());
        target.setEmailAddress(source.getEmailAddress());
        target.setLongTermMedication(source.getLongTermMedication());
        target.setHealthCondition(source.getHealthCondition());
        target.setAllergies(source.getAllergies());
        target.setFitToFlyCertificate(source.getFitToFlyCertificate());
        target.setTravellingFrom(source.getTravellingFrom());
        target.setTravellingTo(source.getTravellingTo());
        target.setTravelStartDate(source.getTravelStartDate());
        target.setTravelEndDate(source.getTravelEndDate());
        target.setPackageDays(source.getPackageDays());
        target.setDocumentFileName(source.getDocumentFileName());
    }

    private void syncTravelers(Registration registration, List<Traveler> requestedTravelers) {
        List<Traveler> existingTravelers = registration.getTravelers();
        List<Traveler> remainingReusableTravelers = existingTravelers.stream()
                .sorted(Comparator.comparing(Traveler::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        Map<Long, Traveler> reusableTravelersById = new HashMap<>();
        for (Traveler traveler : remainingReusableTravelers) {
            if (traveler.getId() != null) {
                reusableTravelersById.put(traveler.getId(), traveler);
            }
        }

        Set<Long> usedTravelerIds = new HashSet<>();
        for (Traveler requestedTraveler : requestedTravelers) {
            Traveler traveler = null;
            if (requestedTraveler.getId() != null && usedTravelerIds.add(requestedTraveler.getId())) {
                traveler = reusableTravelersById.get(requestedTraveler.getId());
            }
            if (traveler == null && !remainingReusableTravelers.isEmpty()) {
                traveler = remainingReusableTravelers.get(0);
            }
            if (traveler == null) {
                traveler = new Traveler();
                existingTravelers.add(traveler);
            } else {
                remainingReusableTravelers.remove(traveler);
            }
            applyTraveler(traveler, requestedTraveler, registration);
        }

        for (Traveler traveler : remainingReusableTravelers) {
            Long travelerId = traveler.getId();
            boolean hasConsultations = travelerId != null && consultations.existsByTravelerId(travelerId);
            if (!hasConsultations) {
                existingTravelers.remove(traveler);
                traveler.setRegistration(null);
            }
        }
    }

    private void applyTraveler(Traveler traveler, Traveler requestedTraveler, Registration registration) {
        traveler.setRegistration(registration);
        traveler.setFullName(requestedTraveler.getFullName());
        traveler.setDateOfBirth(requestedTraveler.getDateOfBirth());
    }


    @GetMapping("/registrations/{id}")
    public ResponseEntity<Registration> get(@PathVariable("id") Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/registrations")
    public ResponseEntity<Registration> getMostRecentByEmail(@RequestParam("email") String email) {
        return repo.findTopByEmailAddressOrderByIdDesc(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /* ---------------- Documents ---------------- */

    @PostMapping(value = "/registrations/{id}/travelers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> addTravelerWithDocuments(
            @PathVariable Long id,
            @RequestParam String fullName,
            @RequestParam String dateOfBirth,
            @RequestParam("passport") MultipartFile passport,
            @RequestParam("travelDocument") MultipartFile travelDocument) {
        Registration registration = repo.findById(id).orElse(null);
        if (registration == null) return ResponseEntity.notFound().build();
        if (fullName == null || fullName.isBlank() || dateOfBirth == null || dateOfBirth.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Full name and date of birth are required."));
        }
        if (passport == null || passport.isEmpty() || travelDocument == null || travelDocument.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Passport and travel document are required."));
        }
        if (registration.getTravelers().size() >= 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "A maximum of six co-travellers is allowed."));
        }

        final java.time.LocalDate dob;
        try {
            dob = java.time.LocalDate.parse(dateOfBirth);
        } catch (java.time.format.DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "A valid date of birth is required."));
        }

        try {
            Traveler traveler = new Traveler();
            traveler.setRegistration(registration);
            traveler.setFullName(fullName.trim());
            traveler.setDateOfBirth(dob);
            registration.getTravelers().add(traveler);
            repo.saveAndFlush(registration);

            saveDocument(registration, traveler.getPatientId(), RegistrationDocument.DocumentType.PASSPORT, passport);
            saveDocument(registration, traveler.getPatientId(), RegistrationDocument.DocumentType.TRAVEL_DOCUMENT, travelDocument);
            return ResponseEntity.ok(traveler);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to store co-traveller documents.", ex);
        }
    }

    @PostMapping(value = "/registrations/{id}/patients/{patientId}/documents/{type}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<Map<String, Object>> upload(
            @PathVariable("id") Long id,
            @PathVariable String patientId,
            @PathVariable RegistrationDocument.DocumentType type,
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        Registration r = repo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!belongsTo(r, patientId)) return ResponseEntity.status(403).build();
        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "A document file is required."));

        RegistrationDocument d = saveDocument(r, patientId, type, file);

        Map<String, Object> body = new HashMap<>();
        body.put("id", d.getId());
        body.put("fileName", d.getOriginalFileName());
        body.put("sizeBytes", d.getSizeBytes());
        body.put("patientId", d.getPatientId());
        body.put("type", d.getDocumentType());
        return ResponseEntity.ok(body);
    }

    private RegistrationDocument saveDocument(Registration registration, String patientId,
                                               RegistrationDocument.DocumentType type, MultipartFile file) throws Exception {
        RegistrationDocument d = docs.findByRegistrationIdAndPatientIdAndDocumentType(registration.getId(), patientId, type)
                .orElseGet(RegistrationDocument::new);
        d.setRegistration(registration);
        d.setPatientId(patientId);
        d.setDocumentType(type);
        d.setOriginalFileName(Optional.ofNullable(file.getOriginalFilename()).orElse("upload.bin"));
        d.setContentType(Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
        d.setSizeBytes(file.getSize());
        d.setData(file.getBytes());
        return docs.save(d);
    }

    @PostMapping("/registrations/{id}/documents/complete")
    @Transactional
    public ResponseEntity<?> completeDocuments(@PathVariable Long id) {
        Registration registration = repo.findById(id).orElse(null);
        if (registration == null) return ResponseEntity.notFound().build();
        List<String> patients = new ArrayList<>();
        patients.add(registration.getPrimaryPatientId());
        registration.getTravelers().forEach(t -> patients.add(t.getPatientId()));
        boolean complete = patients.stream().allMatch(patientId ->
                docs.existsByRegistrationIdAndPatientIdAndDocumentType(id, patientId, RegistrationDocument.DocumentType.PASSPORT)
                && docs.existsByRegistrationIdAndPatientIdAndDocumentType(id, patientId, RegistrationDocument.DocumentType.TRAVEL_DOCUMENT));
        if (!complete) return ResponseEntity.badRequest().body(Map.of("message", "Passport and travel document are required for every traveller."));
        registration.setDocumentsComplete(true);
        repo.save(registration);
        return ResponseEntity.ok(Map.of("documentsComplete", true));
    }

    @GetMapping("/registrations/{id}/patients/{patientId}/documents")
    public ResponseEntity<List<Map<String, Object>>> listDocs(@PathVariable Long id, @PathVariable String patientId) {
        Registration registration = repo.findById(id).orElse(null);
        if (registration == null) return ResponseEntity.notFound().build();
        if (!belongsTo(registration, patientId)) return ResponseEntity.status(403).build();
        List<Map<String, Object>> list = docs.findByRegistrationIdAndPatientIdOrderByCreatedAtDesc(id, patientId).stream().map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("fileName", d.getOriginalFileName());
            m.put("sizeBytes", d.getSizeBytes());
            m.put("createdAt", d.getCreatedAt());
            m.put("patientId", d.getPatientId());
            m.put("type", d.getDocumentType());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    private boolean belongsTo(Registration registration, String patientId) {
        return Objects.equals(registration.getPrimaryPatientId(), patientId)
                || registration.getTravelers().stream().anyMatch(t -> Objects.equals(t.getPatientId(), patientId));
    }

    @DeleteMapping("/registrations/{regId}/documents/{docId}")
    public ResponseEntity<Void> deleteDoc(
            @PathVariable Long regId,
            @PathVariable Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId))
                .map(d -> {
                    docs.delete(d);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Legacy: forces download (Content-Disposition: attachment). */
    @GetMapping(value = "/registrations/{regId}/patients/{patientId}/documents/{docId}")
    public ResponseEntity<byte[]> downloadLegacy(
            @PathVariable("regId") Long regId,
            @PathVariable String patientId, @PathVariable("docId") Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId) && Objects.equals(d.getPatientId(), patientId))
                .map(d -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(d.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + d.getOriginalFileName() + "\"")
                        .body(d.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    /** New: VIEW inline for iframe preview (no Content-Disposition). */
    @GetMapping("/registrations/{regId}/patients/{patientId}/documents/{docId}/view")
    public ResponseEntity<byte[]> viewDoc(
            @PathVariable Long regId,
            @PathVariable String patientId, @PathVariable Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId) && Objects.equals(d.getPatientId(), patientId))
                .map(d -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(d.getContentType()))
                        .body(d.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    /** New: explicit download alias (same behavior as legacy). */
    @GetMapping("/registrations/{regId}/patients/{patientId}/documents/{docId}/download")
    public ResponseEntity<byte[]> downloadDoc(
            @PathVariable Long regId,
            @PathVariable String patientId, @PathVariable Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId) && Objects.equals(d.getPatientId(), patientId))
                .map(d -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(d.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + d.getOriginalFileName() + "\"")
                        .body(d.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/registrations/mine/latest")
    public ResponseEntity<?> myLatestRegistration(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        String principal = auth.getName();
        User u = users.findByUsername(principal)
                .or(() -> users.findByEmail(principal))
                .orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        return repo.findTopByEmailAddressOrderByIdDesc(u.getEmail())
                .<ResponseEntity<?>>map(reg -> {
                    var body = new java.util.HashMap<String, Object>();
                    body.put("id", reg.getId());
                    body.put("firstName", reg.getFirstName());
                    body.put("lastName", reg.getLastName());

                    // Prefer the registration’s primary WhatsApp if present; else fallback to user username
                    String wa = u.getUsername();
                    if (wa == null || wa.isBlank()) wa = u.getUsername();
                    body.put("primaryWhatsApp", wa);

                    // Primary member DOB (top-level convenience)
                    body.put("dateOfBirth",
                            reg.getDateOfBirth() != null ? reg.getDateOfBirth().toString() : "");

                    // Add travellers (only fields needed by UI)
                    java.util.List<java.util.Map<String, Object>> travellers = new java.util.ArrayList<>();
                    if (reg.getTravelers() != null) {
                        for (var t : reg.getTravelers()) {
                            var m = new java.util.HashMap<String, Object>();
                            m.put("id", t.getId());
                            m.put("fullName", t.getFullName());
                            m.put("dateOfBirth", t.getDateOfBirth() != null ? t.getDateOfBirth().toString() : "");
                            travellers.add(m);
                        }
                    }
                    body.put("travelers", travellers);
                    body.put("primaryPatientId", reg.getPrimaryPatientId());

                    return ResponseEntity.ok(body);
                })
                .orElse(ResponseEntity.noContent().build());
    }



}
