package com.godwitcare.repo;

import com.godwitcare.entity.Appointment;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(Long doctorId, Instant from, Instant to);
    List<Appointment> findByDoctorIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(Long doctorId, Instant from);
    List<Appointment> findByPatientIdAndStartTimeGreaterThanEqualOrderByStartTimeAsc(Long patientId, Instant from);
    Optional<Appointment> findByConsultationId(Long consultationId);
    boolean existsByDoctorIdAndStartTimeAndStatusNot(Long doctorId, Instant startTime, Appointment.Status status);
}
