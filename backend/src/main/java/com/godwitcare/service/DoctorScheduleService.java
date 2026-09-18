package com.godwitcare.service;

import com.godwitcare.entity.DoctorAvailability;
import com.godwitcare.repo.DoctorAvailabilityRepository;
import com.godwitcare.repo.DoctorTimeBlockRepository;
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DoctorScheduleService {
    public static final ZoneId CLINIC_ZONE = ZoneId.of("Europe/London");
    // Fallback working hours used only when a doctor has no configured availability rows.
    private static final LocalTime DEFAULT_START = LocalTime.of(9, 0);
    private static final LocalTime DEFAULT_END = LocalTime.of(17, 0);

    private final DoctorAvailabilityRepository availability;
    private final DoctorTimeBlockRepository blocks;

    public DoctorScheduleService(DoctorAvailabilityRepository availability, DoctorTimeBlockRepository blocks) {
        this.availability = availability;
        this.blocks = blocks;
    }

    private record Window(LocalTime start, LocalTime end) {}

    public boolean isAvailable(Long doctorId, Instant start, Instant end) {
        LocalDate date = start.atZone(CLINIC_ZONE).toLocalDate();
        List<Window> windows = windowsFor(doctorId, date);
        LocalTime from = start.atZone(CLINIC_ZONE).toLocalTime();
        LocalTime to = end.atZone(CLINIC_ZONE).toLocalTime();
        boolean inWorkingHours = windows.stream().anyMatch(w -> !from.isBefore(w.start()) && !to.isAfter(w.end()));
        return inWorkingHours && blocks.findByDoctorIdAndStartTimeLessThanAndEndTimeGreaterThan(doctorId, end, start).isEmpty();
    }

    // Every slot start time a doctor could be booked at on `date`, derived from that doctor's
    // own configured availability windows (each window stepped independently from its own start
    // time, not a shared clinic-wide grid) — so a window like 09:50-10:00 correctly yields 09:50
    // as a slot even though it doesn't align to a fixed :00/:15/:30/:45 cadence.
    public List<LocalTime> slotStartsFor(Long doctorId, LocalDate date, int reservedMinutes) {
        List<LocalTime> starts = new ArrayList<>();
        for (Window w : windowsFor(doctorId, date)) {
            for (LocalTime cursor = w.start(); !cursor.plusMinutes(reservedMinutes).isAfter(w.end()); cursor = cursor.plusMinutes(reservedMinutes)) {
                starts.add(cursor);
            }
        }
        return starts;
    }

    // The doctor's configured [start,end) working windows active on `date`, or the default
    // clinic hours if the doctor hasn't configured any availability of their own.
    private List<Window> windowsFor(Long doctorId, LocalDate date) {
        List<DoctorAvailability> configured = availability.findByDoctorIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(doctorId, date, date);
        if (configured.isEmpty()) {
            return List.of(new Window(DEFAULT_START, DEFAULT_END));
        }
        int weekday = date.getDayOfWeek().getValue();
        List<Window> windows = new ArrayList<>();
        for (DoctorAvailability a : configured) {
            if (activeOn(a, weekday)) windows.add(new Window(a.getStartTime(), a.getEndTime()));
        }
        return windows;
    }

    private boolean activeOn(DoctorAvailability availability, int weekday) {
        return List.of(availability.getActiveDays().split(",")).contains(String.valueOf(weekday));
    }
}
