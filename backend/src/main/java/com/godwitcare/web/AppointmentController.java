package com.godwitcare.web;

import com.godwitcare.entity.Appointment;
import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.Role;
import com.godwitcare.entity.User;
import com.godwitcare.repo.AppointmentRepository;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.UserRepository;
import java.time.*;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AppointmentController {
    private static final int SLOT_MINUTES = 10;
    private static final ZoneId CLINIC_ZONE = ZoneId.of("Europe/London");
    private static final LocalTime DAY_START = LocalTime.of(9, 0);
    private static final LocalTime DAY_END = LocalTime.of(17, 0);

    private final AppointmentRepository appointments;
    private final ConsultationRepository consultations;
    private final UserRepository users;

    public AppointmentController(AppointmentRepository appointments, ConsultationRepository consultations, UserRepository users) {
        this.appointments = appointments;
        this.consultations = consultations;
        this.users = users;
    }

    @GetMapping("/appointments/doctors")
    public ResponseEntity<List<Map<String, Object>>> doctors() {
        List<Map<String, Object>> out = users.findByRoleOrderByIdDesc(Role.DOCTOR).stream()
                .sorted(Comparator.comparing(User::getId))
                .map(d -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", d.getId());
                    row.put("name", fullName(d));
                    return row;
                }).toList();
        return ResponseEntity.ok(out);
    }

    @GetMapping("/appointments/availability")
    public ResponseEntity<?> availability(@RequestParam(required = false) Long doctorId,
                                          @RequestParam(required = false) String from,
                                          @RequestParam(required = false) String to) {
        User doctor = resolveDoctor(doctorId);
        if (doctor == null) return ResponseEntity.badRequest().body(Map.of("message", "No doctor is available for booking."));

        LocalDate fromDate = parseDate(from, LocalDate.now(CLINIC_ZONE));
        LocalDate toDate = parseDate(to, fromDate.plusDays(6));
        if (toDate.isBefore(fromDate)) toDate = fromDate;

        Instant rangeStart = fromDate.atStartOfDay(CLINIC_ZONE).toInstant();
        Instant rangeEnd = toDate.plusDays(1).atStartOfDay(CLINIC_ZONE).toInstant();
        Set<Instant> booked = new HashSet<>();
        for (Appointment appt : appointments.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(doctor.getId(), rangeStart, rangeEnd)) {
            if (appt.getStatus() != Appointment.Status.CANCELLED) booked.add(appt.getStartTime());
        }

        Instant now = Instant.now();
        List<Map<String, Object>> days = new ArrayList<>();
        for (LocalDate day = fromDate; !day.isAfter(toDate); day = day.plusDays(1)) {
            List<Map<String, Object>> slots = new ArrayList<>();
            for (LocalDateTime cursor = LocalDateTime.of(day, DAY_START); cursor.toLocalTime().isBefore(DAY_END); cursor = cursor.plusMinutes(SLOT_MINUTES)) {
                Instant start = cursor.atZone(CLINIC_ZONE).toInstant();
                boolean disabled = !start.isAfter(now) || booked.contains(start);
                slots.add(Map.of(
                        "startTime", start.toString(),
                        "endTime", start.plus(Duration.ofMinutes(SLOT_MINUTES)).toString(),
                        "label", cursor.toLocalTime().toString(),
                        "available", !disabled
                ));
            }
            days.add(Map.of("date", day.toString(), "slots", slots));
        }

        return ResponseEntity.ok(Map.of(
                "doctor", Map.of("id", doctor.getId(), "name", fullName(doctor)),
                "slotMinutes", SLOT_MINUTES,
                "timeZone", CLINIC_ZONE.toString(),
                "days", days
        ));
    }

    @PostMapping("/appointments")
    public ResponseEntity<?> book(Authentication auth, @RequestBody Map<String, Object> body) {
        User patient = currentUser(auth);
        if (patient == null) return ResponseEntity.status(401).build();

        Long consultationId = toLong(body.get("consultationId"));
        Long doctorId = toLong(body.get("doctorId"));
        if (consultationId == null || body.get("startTime") == null) return ResponseEntity.badRequest().body(Map.of("message", "Consultation and start time are required."));

        Consultation consultation = consultations.findById(consultationId).orElse(null);
        if (consultation == null || consultation.getUser() == null || !Objects.equals(consultation.getUser().getId(), patient.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Consultation does not belong to the signed-in patient."));
        }

        User doctor = resolveDoctor(doctorId);
        if (doctor == null) return ResponseEntity.badRequest().body(Map.of("message", "Please select an available doctor."));

        Instant start;
        try { start = Instant.parse(String.valueOf(body.get("startTime"))); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid appointment time.")); }
        if (!start.isAfter(Instant.now())) return ResponseEntity.badRequest().body(Map.of("message", "Please choose a future appointment time."));
        if (!isClinicSlot(start)) return ResponseEntity.badRequest().body(Map.of("message", "Please choose one of the available appointment slots."));
        if (appointments.findByConsultationId(consultationId).isPresent()) return ResponseEntity.badRequest().body(Map.of("message", "This consultation already has an appointment."));
        if (appointments.existsByDoctorIdAndStartTimeAndStatusNot(doctor.getId(), start, Appointment.Status.CANCELLED)) return ResponseEntity.status(409).body(Map.of("message", "This appointment slot was just booked. Please choose another time."));

        Appointment appt = new Appointment();
        appt.setPatient(patient);
        appt.setDoctor(doctor);
        appt.setConsultation(consultation);
        appt.setStartTime(start);
        appt.setEndTime(start.plus(Duration.ofMinutes(SLOT_MINUTES)));
        try { appt = appointments.save(appt); }
        catch (DataIntegrityViolationException e) { return ResponseEntity.status(409).body(Map.of("message", "This appointment slot is no longer available.")); }
        return ResponseEntity.ok(toDto(appt));
    }

    @GetMapping("/appointments/mine")
    public ResponseEntity<List<Map<String, Object>>> mine(Authentication auth) {
        User patient = currentUser(auth);
        if (patient == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(appointments.findByPatientIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(patient.getId(), Instant.now()).stream().map(this::toDto).toList());
    }

    @GetMapping("/doctor/appointments")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<Map<String, Object>> doctorAppointments(Authentication auth) {
        User doctor = currentUser(auth);
        if (doctor == null) return List.of();
        return appointments.findByDoctorIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(doctor.getId(), Instant.now()).stream().map(this::toDto).toList();
    }

    private Map<String, Object> toDto(Appointment a) {
        Consultation c = a.getConsultation();
        User patient = a.getPatient();
        User doctor = a.getDoctor();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", a.getId());
        row.put("startTime", a.getStartTime());
        row.put("endTime", a.getEndTime());
        row.put("status", a.getStatus().name());
        row.put("doctorId", doctor.getId());
        row.put("doctorName", fullName(doctor));
        row.put("patientId", patient.getId());
        row.put("patientName", c.getContactName() != null && !c.getContactName().isBlank() ? c.getContactName() : fullName(patient));
        row.put("patientEmail", patient.getEmail());
        row.put("contactPhone", c.getContactPhone());
        row.put("contactAddress", c.getContactAddress());
        row.put("consultationId", c.getId());
        row.put("consultationStatus", c.getStatus().name());
        row.put("reason", c.getHistoryOfPresentingComplaint() != null ? c.getHistoryOfPresentingComplaint() : c.getCurrentLocation());
        return row;
    }

    private User currentUser(Authentication auth) {
        if (auth == null) return null;
        return users.findByUsername(auth.getName()).or(() -> users.findByEmail(auth.getName())).orElse(null);
    }
    private User resolveDoctor(Long id) {
        if (id != null) return users.findById(id).filter(u -> u.getRole() == Role.DOCTOR).orElse(null);
        return users.findByRoleOrderByIdDesc(Role.DOCTOR).stream().min(Comparator.comparing(User::getId)).orElse(null);
    }
    private boolean isClinicSlot(Instant start) {
        ZonedDateTime z = start.atZone(CLINIC_ZONE);
        LocalTime t = z.toLocalTime();
        return !t.isBefore(DAY_START) && t.isBefore(DAY_END) && t.getMinute() % SLOT_MINUTES == 0 && t.getSecond() == 0 && t.getNano() == 0;
    }
    private static LocalDate parseDate(String s, LocalDate fallback) { try { return s == null || s.isBlank() ? fallback : LocalDate.parse(s); } catch (Exception e) { return fallback; } }
    private static Long toLong(Object o) { try { return o == null ? null : Long.valueOf(String.valueOf(o)); } catch (Exception e) { return null; } }
    private static String fullName(User u) { return ((u.getFirstName() == null ? "" : u.getFirstName()) + " " + (u.getLastName() == null ? "" : u.getLastName())).trim(); }
}
