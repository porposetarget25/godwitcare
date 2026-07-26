package com.godwitcare.repo;

import com.godwitcare.entity.DoctorAvailability;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, Long> {
    List<DoctorAvailability> findByDoctorIdOrderByStartDateAscStartTimeAsc(Long doctorId);
    List<DoctorAvailability> findByDoctorIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(Long doctorId, LocalDate end, LocalDate start);
}
