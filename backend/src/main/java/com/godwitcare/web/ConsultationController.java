package com.godwitcare.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.User;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.UserRepository;
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

    public ConsultationController(ConsultationRepository consultations, UserRepository users) {
        this.consultations = consultations;
        this.users = users;
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
        c.setAnswersJson(new com.fasterxml.jackson.databind.ObjectMapper()
                .writeValueAsString(body.getOrDefault("answers", java.util.Map.of())));
        c = consultations.save(c);

        return ResponseEntity.ok(java.util.Map.of("id", c.getId(), "status", c.getStatus().name()));
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
    public ResponseEntity<Map<String, Object>> details(@PathVariable Long id) throws Exception {
        return consultations.findById(id)
                .map(c -> {
                    var u = c.getUser();
                    Map<String, Object> d = new HashMap<>();
                    d.put("id", c.getId());
                    d.put("createdAt", c.getCreatedAt());
                    d.put("status", c.getStatus().name());
                    d.put("patient", Map.of(
                            "email", u.getEmail(),
                            "firstName", u.getFirstName(),
                            "lastName", u.getLastName()
                    ));
                    d.put("currentLocation", c.getCurrentLocation());
                    d.put("contactName", c.getContactName());
                    d.put("contactPhone", c.getContactPhone());
                    d.put("contactAddress", c.getContactAddress());
                    try {
                        d.put("answers", new ObjectMapper().readValue(c.getAnswersJson(), Map.class));
                    } catch (Exception ex) {
                        d.put("answers", Map.of());
                    }
                    return ResponseEntity.ok(d);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
