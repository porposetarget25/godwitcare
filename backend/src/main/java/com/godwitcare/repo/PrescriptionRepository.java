// src/main/java/com/godwitcare/repo/PrescriptionRepository.java
package com.godwitcare.repo;

import com.godwitcare.entity.Prescription;
import com.godwitcare.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByConsultationOrderByIdDesc(Consultation c);
    Optional<Prescription> findFirstByConsultationOrderByIdDesc(Consultation c);
    List<Prescription> findByPatientIdOrderByIdDesc(String patientId);
    Optional<Prescription> findFirstByPatientIdOrderByIdDesc(String patientId);
    Optional<Prescription> findTopByConsultationIdOrderByIdDesc(Long consultationId);
    // latest by patient (traveler view)
    Optional<Prescription> findTopByConsultation_User_IdOrderByIdDesc(Long userId);
}
