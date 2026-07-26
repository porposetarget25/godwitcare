package com.godwitcare.service;

import com.godwitcare.entity.DoctorAvailability;
import com.godwitcare.repo.DoctorAvailabilityRepository;
import com.godwitcare.repo.DoctorTimeBlockRepository;
import java.time.*;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DoctorScheduleService {
    public static final ZoneId CLINIC_ZONE = ZoneId.of("Europe/London");
    private final DoctorAvailabilityRepository availability;
    private final DoctorTimeBlockRepository blocks;

    public DoctorScheduleService(DoctorAvailabilityRepository availability, DoctorTimeBlockRepository blocks) {
        this.availability = availability;
        this.blocks = blocks;
    }

    public boolean isAvailable(Long doctorId, Instant start, Instant end) {
        LocalDate date = start.atZone(CLINIC_ZONE).toLocalDate();
        List<DoctorAvailability> configured = availability.findByDoctorIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(doctorId, date, date);
        boolean inWorkingHours;
        if (configured.isEmpty()) {
            LocalTime time = start.atZone(CLINIC_ZONE).toLocalTime();
            inWorkingHours = !time.isBefore(LocalTime.of(9, 0)) && end.atZone(CLINIC_ZONE).toLocalTime().compareTo(LocalTime.of(17, 0)) <= 0;
        } else {
            int weekday = date.getDayOfWeek().getValue();
            LocalTime from = start.atZone(CLINIC_ZONE).toLocalTime();
            LocalTime to = end.atZone(CLINIC_ZONE).toLocalTime();
            inWorkingHours = configured.stream().anyMatch(a -> activeOn(a, weekday) && !from.isBefore(a.getStartTime()) && !to.isAfter(a.getEndTime()));
        }
        return inWorkingHours && blocks.findByDoctorIdAndStartTimeLessThanAndEndTimeGreaterThan(doctorId, end, start).isEmpty();
    }

    private boolean activeOn(DoctorAvailability availability, int weekday) {
        return List.of(availability.getActiveDays().split(",")).contains(String.valueOf(weekday));
    }
}
