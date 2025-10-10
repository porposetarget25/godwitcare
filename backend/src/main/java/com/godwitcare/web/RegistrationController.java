package com.godwitcare.web;

import com.godwitcare.entity.Registration;
import com.godwitcare.entity.RegistrationDocument;
import com.godwitcare.repo.RegistrationDocumentRepository;
import com.godwitcare.repo.RegistrationRepository;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;


import java.util.*;

@RestController
@RequestMapping("/api")
public class RegistrationController {

    private final RegistrationRepository repo;
    private final RegistrationDocumentRepository docs;
    private final UserRepository users;


    public RegistrationController(RegistrationRepository repo,
                                  RegistrationDocumentRepository docs,
                                  UserRepository users) {
        this.repo = repo;
        this.docs = docs;
        this.users = users;
    }

    /* ---------------- Registrations ---------------- */

    @PostMapping("/registrations")
    public ResponseEntity<Registration> create(@Valid @RequestBody Registration r) {
        if (r.getTravelers() == null) r.setTravelers(new java.util.ArrayList<>());

        // Drop empty rows to avoid @NotBlank/@NotNull violations
        r.getTravelers().removeIf(t ->
                t.getFullName() == null || t.getFullName().isBlank() || t.getDateOfBirth() == null);

        // Safety cap (adjust if you want a different limit)
        if (r.getTravelers().size() > 6) return ResponseEntity.badRequest().build();

        // IMPORTANT: set parent on each child so JPA writes the FK
        r.getTravelers().forEach(t -> t.setRegistration(r));

        Registration saved = repo.save(r);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/registrations/{id}")
    public ResponseEntity<?> update(
            @PathVariable("id") Long id, @Valid @RequestBody Registration r) {

        return repo.findById(id)
                .map(existing -> {
                    r.setId(id);

                    if (r.getTravelers() == null) r.setTravelers(new java.util.ArrayList<>());
                    r.getTravelers().removeIf(t ->
                            t.getFullName() == null || t.getFullName().isBlank() || t.getDateOfBirth() == null);
                    if (r.getTravelers().size() > 6) return ResponseEntity.badRequest().build();

                    r.getTravelers().forEach(t -> t.setRegistration(r));

                    return ResponseEntity.ok(repo.save(r));
                })
                .orElse(ResponseEntity.notFound().build());
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

    @PostMapping(value = "/registrations/{id}/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        Registration r = repo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (file.isEmpty()) return ResponseEntity.badRequest().build();

        RegistrationDocument d = new RegistrationDocument();
        d.setRegistration(r);
        d.setOriginalFileName(Optional.ofNullable(file.getOriginalFilename()).orElse("upload.bin"));
        d.setContentType(Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
        d.setSizeBytes(file.getSize());
        d.setData(file.getBytes());
        d = docs.save(d);

        Map<String, Object> body = new HashMap<>();
        body.put("id", d.getId());
        body.put("fileName", d.getOriginalFileName());
        body.put("sizeBytes", d.getSizeBytes());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/registrations/{id}/documents")
    public ResponseEntity<List<Map<String, Object>>> listDocs(@PathVariable("id") Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        List<Map<String, Object>> list = docs.findByRegistrationIdOrderByCreatedAtDesc(id).stream().map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("fileName", d.getOriginalFileName());
            m.put("sizeBytes", d.getSizeBytes());
            m.put("createdAt", d.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    /** Legacy: forces download (Content-Disposition: attachment). */
    @GetMapping(value = "/registrations/{regId}/documents/{docId}")
    public ResponseEntity<byte[]> downloadLegacy(
            @PathVariable("regId") Long regId,
            @PathVariable("docId") Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId))
                .map(d -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(d.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + d.getOriginalFileName() + "\"")
                        .body(d.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    /** New: VIEW inline for iframe preview (no Content-Disposition). */
    @GetMapping("/registrations/{regId}/documents/{docId}/view")
    public ResponseEntity<byte[]> viewDoc(
            @PathVariable Long regId,
            @PathVariable Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId))
                .map(d -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(d.getContentType()))
                        .body(d.getData()))
                .orElse(ResponseEntity.notFound().build());
    }

    /** New: explicit download alias (same behavior as legacy). */
    @GetMapping("/registrations/{regId}/documents/{docId}/download")
    public ResponseEntity<byte[]> downloadDoc(
            @PathVariable Long regId,
            @PathVariable Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId))
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
                            m.put("fullName", t.getFullName());
                            m.put("dateOfBirth", t.getDateOfBirth() != null ? t.getDateOfBirth().toString() : "");
                            travellers.add(m);
                        }
                    }
                    body.put("travelers", travellers);

                    return ResponseEntity.ok(body);
                })
                .orElse(ResponseEntity.noContent().build());
    }



}
