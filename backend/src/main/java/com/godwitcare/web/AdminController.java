package com.godwitcare.web;

import com.godwitcare.entity.*;
import com.godwitcare.repo.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    public record TravelerReq(Long id, String fullName, LocalDate dateOfBirth) {}

    public record AdminUserReq(
            String firstName,
            String lastName,
            String email,
            String username,
            String password,
            LocalDate dateOfBirth,
            String travellingFrom,
            String travellingTo,
            LocalDate travelStartDate,
            LocalDate travelEndDate,
            String middleName,
            String gender,
            String carerSecondaryWhatsAppNumber,
            Boolean longTermMedication,
            Boolean healthCondition,
            Boolean allergies,
            Boolean fitToFlyCertificate,
            Integer packageDays,
            List<TravelerReq> travelers,
            String paymentMethod,
            BigDecimal paymentAmount,
            String paymentCurrency,
            String cardExpiry
    ) {}

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

    private Map<String, Object> toTravelerDto(Traveler traveler) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", traveler.getId());
        m.put("fullName", traveler.getFullName());
        m.put("dateOfBirth", traveler.getDateOfBirth());
        return m;
    }

    private Map<String, Object> toRegistrationDto(Registration registration) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", registration.getId());
        m.put("firstName", registration.getFirstName());
        m.put("middleName", registration.getMiddleName());
        m.put("lastName", registration.getLastName());
        m.put("dateOfBirth", registration.getDateOfBirth());
        m.put("gender", registration.getGender());
        m.put("primaryWhatsAppNumber", registration.getPrimaryWhatsAppNumber());
        m.put("carerSecondaryWhatsAppNumber", registration.getCarerSecondaryWhatsAppNumber());
        m.put("emailAddress", registration.getEmailAddress());
        m.put("longTermMedication", registration.getLongTermMedication());
        m.put("healthCondition", registration.getHealthCondition());
        m.put("allergies", registration.getAllergies());
        m.put("fitToFlyCertificate", registration.getFitToFlyCertificate());
        m.put("travellingFrom", registration.getTravellingFrom());
        m.put("travellingTo", registration.getTravellingTo());
        m.put("travelStartDate", registration.getTravelStartDate());
        m.put("travelEndDate", registration.getTravelEndDate());
        m.put("packageDays", registration.getPackageDays());
        m.put("documentFileName", registration.getDocumentFileName());
        m.put("travelers", registration.getTravelers().stream().map(this::toTravelerDto).toList());
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
    @Transactional
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
    @Transactional
    public ResponseEntity<?> deleteDoctor(@PathVariable Long id) {
        return deleteByRole(id, Role.DOCTOR);
    }

    @GetMapping("/users/{id}/details")
    @Transactional(readOnly = true)
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
            m.put("cardLast4", p.getCardLast4());
            m.put("cardBrand", p.getCardBrand());
            m.put("stripePaymentIntentId", p.getStripePaymentIntentId());
            m.put("stripeChargeId", p.getStripeChargeId());
            m.put("status", p.getStatus());
            m.put("failureMessage", p.getFailureMessage());
            m.put("createdAt", p.getCreatedAt());
            return m;
        }).toList();

        List<Registration> regList = (u.getEmail() == null || u.getEmail().isBlank())
                ? List.of()
                : registrations.findByEmailAddressIgnoreCaseOrderByIdDesc(u.getEmail());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user", toUserRow(u));
        body.put("registrationDetails", regList.stream().map(this::toRegistrationDto).toList());
        body.put("consultationHistory", cDto);
        body.put("prescriptions", pDto);
        body.put("referralLetters", rDto);
        body.put("paymentHistory", payDto);
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> deleteByRole(Long id, Role role) {
        User existing = users.findById(id).orElse(null);
        if (existing == null || existing.getRole() != role) return ResponseEntity.notFound().build();

        // Delete dependent rows first to satisfy FK constraints.
        referrals.deleteByConsultationUserId(id);
        prescriptions.deleteByConsultationUserId(id);
        consultations.deleteByUserId(id);
        payments.deleteByUserId(id);
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
        if (role == Role.USER) {
            syncLatestRegistrationAndPayment(entity, req);
        }
        return ResponseEntity.ok(toUserRow(entity));
    }

    private void syncTravelers(Registration registration, List<TravelerReq> requestedTravelers) {
        List<TravelerReq> normalizedTravelers = normalizeTravelers(requestedTravelers);
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
        for (TravelerReq requestedTraveler : normalizedTravelers) {
            Traveler traveler = null;
            if (requestedTraveler.id() != null && usedTravelerIds.add(requestedTraveler.id())) {
                traveler = reusableTravelersById.get(requestedTraveler.id());
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

    private List<TravelerReq> normalizeTravelers(List<TravelerReq> requestedTravelers) {
        if (requestedTravelers == null) return List.of();
        List<TravelerReq> normalizedTravelers = new ArrayList<>();
        for (TravelerReq traveler : requestedTravelers) {
            if (traveler == null || traveler.fullName() == null || traveler.fullName().isBlank() || traveler.dateOfBirth() == null) {
                continue;
            }
            normalizedTravelers.add(new TravelerReq(traveler.id(), traveler.fullName().trim(), traveler.dateOfBirth()));
        }
        return normalizedTravelers;
    }

    private void applyTraveler(Traveler traveler, TravelerReq requestedTraveler, Registration registration) {
        traveler.setRegistration(registration);
        traveler.setFullName(requestedTraveler.fullName());
        traveler.setDateOfBirth(requestedTraveler.dateOfBirth());
    }

    private void syncLatestRegistrationAndPayment(User entity, AdminUserReq req) {
        if (entity.getEmail() != null && !entity.getEmail().isBlank()) {
            Registration registration = registrations.findTopByEmailAddressOrderByIdDesc(entity.getEmail())
                    .orElseGet(Registration::new);

            registration.setEmailAddress(entity.getEmail());
            registration.setFirstName(entity.getFirstName());
            registration.setLastName(entity.getLastName());
            registration.setPrimaryWhatsAppNumber(entity.getUsername());
            registration.setMiddleName(req.middleName());
            registration.setDateOfBirth(req.dateOfBirth());
            registration.setGender(req.gender());
            registration.setCarerSecondaryWhatsAppNumber(req.carerSecondaryWhatsAppNumber());
            registration.setLongTermMedication(req.longTermMedication());
            registration.setHealthCondition(req.healthCondition());
            registration.setAllergies(req.allergies());
            registration.setFitToFlyCertificate(req.fitToFlyCertificate());
            registration.setTravellingFrom(req.travellingFrom());
            registration.setTravellingTo(req.travellingTo());
            registration.setTravelStartDate(req.travelStartDate());
            registration.setTravelEndDate(req.travelEndDate());
            registration.setPackageDays(req.packageDays());

            syncTravelers(registration, req.travelers());
            registrations.save(registration);
        }

        boolean hasPaymentPatch = req.paymentMethod() != null
                || req.paymentAmount() != null
                || req.paymentCurrency() != null;

        if (!hasPaymentPatch) return;

        Payment payment = payments.findByUserIdOrderByIdDesc(entity.getId()).stream().findFirst().orElse(null);
        if (payment == null) return;

        if (req.paymentMethod() != null && !req.paymentMethod().isBlank()) {
            try {
                payment.setMethod(PaymentMethod.valueOf(req.paymentMethod().trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {
                // keep existing payment method when an invalid value is sent
            }
        }
        if (req.paymentAmount() != null) payment.setAmount(req.paymentAmount());
        if (req.paymentCurrency() != null && !req.paymentCurrency().isBlank()) {
            payment.setCurrency(req.paymentCurrency().trim().toUpperCase(Locale.ROOT));
        }
        payments.save(payment);
    }
}
