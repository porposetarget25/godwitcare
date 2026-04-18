package com.godwitcare.web;

import com.godwitcare.entity.*;
import com.godwitcare.repo.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository users;
    private final ConsultationRepository consultations;
    private final PrescriptionRepository prescriptions;
    private final ReferralLetterRepo referrals;
    private final PaymentRepository payments;
    private final RegistrationRepository registrations;
    private final PasswordEncoder encoder;

    public AdminController(UserRepository users,
                           ConsultationRepository consultations,
                           PrescriptionRepository prescriptions,
                           ReferralLetterRepo referrals,
                           PaymentRepository payments,
                           RegistrationRepository registrations,
                           PasswordEncoder encoder) {
        this.users = users;
        this.consultations = consultations;
        this.prescriptions = prescriptions;
        this.referrals = referrals;
        this.payments = payments;
        this.registrations = registrations;
        this.encoder = encoder;
    }

    public record AdminUserReq(String firstName, String lastName, String email, String username, String password) {}

    private Map<String, Object> toUserRow(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("firstName", u.getFirstName());
        m.put("lastName", u.getLastName());
        m.put("email", u.getEmail());
        m.put("username", u.getUsername());
        m.put("role", u.getRole().name());
        return m;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        List<Map<String, Object>> userList = users.findByRoleOrderByIdDesc(Role.USER).stream().map(this::toUserRow).toList();
        List<Map<String, Object>> doctorList = users.findByRoleOrderByIdDesc(Role.DOCTOR).stream().map(this::toUserRow).toList();
        return ResponseEntity.ok(Map.of("users", userList, "doctors", doctorList));
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers() {
        return ResponseEntity.ok(users.findByRoleOrderByIdDesc(Role.USER).stream().map(this::toUserRow).toList());
    }

    @GetMapping("/doctors")
    public ResponseEntity<?> listDoctors() {
        return ResponseEntity.ok(users.findByRoleOrderByIdDesc(Role.DOCTOR).stream().map(this::toUserRow).toList());
    }

    @PostMapping("/users")
    public ResponseEntity<?> addUser(@RequestBody AdminUserReq req) {
        return upsertUser(null, req, Role.USER, true);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody AdminUserReq req) {
        return upsertUser(id, req, Role.USER, false);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return deleteByRole(id, Role.USER);
    }

    @PostMapping("/doctors")
    public ResponseEntity<?> addDoctor(@RequestBody AdminUserReq req) {
        return upsertUser(null, req, Role.DOCTOR, true);
    }

    @PutMapping("/doctors/{id}")
    public ResponseEntity<?> updateDoctor(@PathVariable Long id, @RequestBody AdminUserReq req) {
        return upsertUser(id, req, Role.DOCTOR, false);
    }

    @DeleteMapping("/doctors/{id}")
    public ResponseEntity<?> deleteDoctor(@PathVariable Long id) {
        return deleteByRole(id, Role.DOCTOR);
    }

    @GetMapping("/users/{id}/details")
    public ResponseEntity<?> userDetails(@PathVariable Long id) {
        User u = users.findById(id).orElse(null);
        if (u == null || u.getRole() != Role.USER) return ResponseEntity.notFound().build();

        List<Consultation> cList = consultations.findByUserIdOrderByIdDesc(id);
        List<Map<String, Object>> cDto = cList.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("createdAt", c.getCreatedAt());
            m.put("status", c.getStatus() != null ? c.getStatus().name() : null);
            m.put("currentLocation", c.getCurrentLocation());
            m.put("patientId", c.getPatientId());
            return m;
        }).toList();

        List<Map<String, Object>> pDto = cList.stream()
                .map(c -> prescriptions.findTopByConsultationIdOrderByIdDesc(c.getId()).orElse(null))
                .filter(Objects::nonNull)
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("consultationId", p.getConsultation().getId());
                    m.put("createdAt", p.getCreatedAt());
                    m.put("fileName", p.getFileName());
                    return m;
                }).toList();

        List<Map<String, Object>> rDto = referrals.findByConsultationUserIdOrderByIdDesc(id).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("consultationId", r.getConsultation().getId());
            m.put("createdAt", r.getCreatedAt());
            m.put("fileName", r.getFileName());
            return m;
        }).toList();

        List<Map<String, Object>> payDto = payments.findByUserIdOrderByIdDesc(id).stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("method", p.getMethod().name());
            m.put("amount", p.getAmount());
            m.put("currency", p.getCurrency());
            m.put("createdAt", p.getCreatedAt());
            return m;
        }).toList();

        List<Registration> regList = (u.getEmail() == null || u.getEmail().isBlank())
                ? List.of()
                : registrations.findByEmailAddressIgnoreCaseOrderByIdDesc(u.getEmail());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user", toUserRow(u));
        body.put("registrationDetails", regList);
        body.put("consultationHistory", cDto);
        body.put("prescriptions", pDto);
        body.put("referralLetters", rDto);
        body.put("paymentHistory", payDto);
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> deleteByRole(Long id, Role role) {
        User existing = users.findById(id).orElse(null);
        if (existing == null || existing.getRole() != role) return ResponseEntity.notFound().build();
        users.delete(existing);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    private ResponseEntity<?> upsertUser(Long id, AdminUserReq req, Role role, boolean creating) {
        User entity = creating ? new User() : users.findById(id).orElse(null);
        if (!creating && (entity == null || entity.getRole() != role)) return ResponseEntity.notFound().build();

        String firstName = req.firstName() == null ? "" : req.firstName().trim();
        String username = req.username() == null ? "" : req.username().trim();
        String email = req.email() == null ? null : req.email().trim();

        if (firstName.isBlank()) return ResponseEntity.badRequest().body("First name is required");
        if (username.isBlank()) return ResponseEntity.badRequest().body("Username is required");
        if (email != null && email.isBlank()) email = null;

        if (users.existsByUsername(username) && (creating || !username.equalsIgnoreCase(entity.getUsername()))) {
            return ResponseEntity.badRequest().body("Username already registered");
        }

        if (email != null && users.existsByEmail(email) && (creating || !email.equalsIgnoreCase(entity.getEmail()))) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        entity.setFirstName(firstName);
        entity.setLastName(req.lastName() == null ? "" : req.lastName().trim());
        entity.setUsername(username);
        entity.setEmail(email);
        entity.setRole(role);

        if (creating) {
            String password = (req.password() == null || req.password().isBlank()) ? "demo" : req.password();
            entity.setPassword(encoder.encode(password));
        } else if (req.password() != null && !req.password().isBlank()) {
            entity.setPassword(encoder.encode(req.password()));
        }

        users.save(entity);
        return ResponseEntity.ok(toUserRow(entity));
    }
}
