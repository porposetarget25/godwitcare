package com.godwitcare.repo;

import com.godwitcare.entity.DoctorTimeBlock;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorTimeBlockRepository extends JpaRepository<DoctorTimeBlock, Long> {
    List<DoctorTimeBlock> findByDoctorIdOrderByStartTimeAsc(Long doctorId);
    List<DoctorTimeBlock> findByDoctorIdAndStartTimeLessThanAndEndTimeGreaterThan(Long doctorId, Instant end, Instant start);
}
