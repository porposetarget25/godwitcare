package com.godwitcare.web;

import com.godwitcare.entity.*;
import com.godwitcare.repo.*;
import java.time.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctor/schedule")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorScheduleController {
    private final DoctorAvailabilityRepository availability;
    private final DoctorTimeBlockRepository blocks;
    private final AppointmentRepository appointments;
    private final UserRepository users;

    public DoctorScheduleController(DoctorAvailabilityRepository availability, DoctorTimeBlockRepository blocks,
                                    AppointmentRepository appointments, UserRepository users) {
        this.availability = availability; this.blocks = blocks; this.appointments = appointments; this.users = users;
    }

    @GetMapping
    public ResponseEntity<?> get(Authentication auth) {
        User doctor = current(auth);
        if (doctor == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(Map.of(
            "availability", availability.findByDoctorIdOrderByStartDateAscStartTimeAsc(doctor.getId()).stream().map(this::availabilityDto).toList(),
            "blocks", blocks.findByDoctorIdOrderByStartTimeAsc(doctor.getId()).stream().map(this::blockDto).toList()));
    }

    @PostMapping("/availability")
    public ResponseEntity<?> addAvailability(Authentication auth, @RequestBody Map<String, Object> body) {
        User doctor = current(auth);
        if (doctor == null) return ResponseEntity.status(401).build();
        try {
            DoctorAvailability row = new DoctorAvailability();
            row.setDoctor(doctor); row.setStartDate(LocalDate.parse(text(body, "startDate"))); row.setEndDate(LocalDate.parse(text(body, "endDate")));
            row.setStartTime(LocalTime.parse(text(body, "startTime"))); row.setEndTime(LocalTime.parse(text(body, "endTime")));
            List<?> days = (List<?>) body.get("activeDays");
            if (row.getEndDate().isBefore(row.getStartDate()) || !row.getEndTime().isAfter(row.getStartTime()) || days == null || days.isEmpty()) throw new IllegalArgumentException();
            row.setActiveDays(days.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(",")));
            return ResponseEntity.ok(availabilityDto(availability.save(row)));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "Enter a valid date range, time window and at least one active day.")); }
    }

    @DeleteMapping("/availability/{id}")
    public ResponseEntity<?> deleteAvailability(Authentication auth, @PathVariable Long id) {
        User doctor = current(auth); DoctorAvailability row = availability.findById(id).orElse(null);
        if (doctor == null || row == null || !row.getDoctor().getId().equals(doctor.getId())) return ResponseEntity.status(404).build();
        availability.delete(row); return ResponseEntity.noContent().build();
    }

    @PostMapping("/blocks")
    public ResponseEntity<?> addBlock(Authentication auth, @RequestBody Map<String, Object> body) {
        User doctor = current(auth);
        if (doctor == null) return ResponseEntity.status(401).build();
        try {
            Instant start = Instant.parse(text(body, "startTime")), end = Instant.parse(text(body, "endTime"));
            if (!end.isAfter(start) || start.isBefore(Instant.now())) throw new IllegalArgumentException();
            if (!appointments.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(doctor.getId(), start, end.minusNanos(1)).isEmpty())
                return ResponseEntity.status(409).body(Map.of("message", "This period contains confirmed appointments. Reschedule or cancel them before blocking the time."));
            DoctorTimeBlock row = new DoctorTimeBlock(); row.setDoctor(doctor); row.setStartTime(start); row.setEndTime(end); row.setReason(text(body, "reason"));
            return ResponseEntity.ok(blockDto(blocks.save(row)));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "Enter a valid future blocked period.")); }
    }

    @DeleteMapping("/blocks/{id}")
    public ResponseEntity<?> deleteBlock(Authentication auth, @PathVariable Long id) {
        User doctor = current(auth); DoctorTimeBlock row = blocks.findById(id).orElse(null);
        if (doctor == null || row == null || !row.getDoctor().getId().equals(doctor.getId())) return ResponseEntity.status(404).build();
        blocks.delete(row); return ResponseEntity.noContent().build();
    }

    private User current(Authentication auth) { return auth == null ? null : users.findByUsername(auth.getName()).or(() -> users.findByEmail(auth.getName())).orElse(null); }
    private String text(Map<String, Object> body, String key) { return body.get(key) == null ? "" : String.valueOf(body.get(key)).trim(); }
    private Map<String, Object> availabilityDto(DoctorAvailability a) { return Map.of("id", a.getId(), "startDate", a.getStartDate(), "endDate", a.getEndDate(), "startTime", a.getStartTime(), "endTime", a.getEndTime(), "activeDays", Arrays.stream(a.getActiveDays().split(",")).map(Integer::valueOf).toList()); }
    private Map<String, Object> blockDto(DoctorTimeBlock b) { Map<String,Object> out = new LinkedHashMap<>(); out.put("id", b.getId()); out.put("startTime", b.getStartTime()); out.put("endTime", b.getEndTime()); out.put("reason", b.getReason()); return out; }
}
