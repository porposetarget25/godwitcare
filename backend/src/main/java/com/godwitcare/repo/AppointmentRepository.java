package com.godwitcare.repo;

import com.godwitcare.entity.Appointment;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(Long doctorId, Instant from, Instant to);
    List<Appointment> findByDoctorIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(Long doctorId, Instant from);
    List<Appointment> findByPatientIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(Long patientId, Instant from);
    Optional<Appointment> findTopByConsultationIdOrderByIdDesc(Long consultationId);
    boolean existsByConsultationIdAndStatusNot(Long consultationId, Appointment.Status status);
    void deleteByConsultationUserId(Long userId);
    void deleteByPatientId(Long patientId);
    void deleteByDoctorId(Long doctorId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Appointment a where a.id = :id")
    Optional<Appointment> findLockedById(@Param("id") Long id);
    boolean existsByDoctorIdAndStartTimeAndStatusNot(Long doctorId, Instant startTime, Appointment.Status status);
    boolean existsByDoctorIdAndStatusNotAndStartTimeLessThanAndEndTimeGreaterThan(
            Long doctorId, Appointment.Status status, Instant end, Instant start);
}
