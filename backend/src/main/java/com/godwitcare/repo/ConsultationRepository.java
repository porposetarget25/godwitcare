package com.godwitcare.repo;

import com.godwitcare.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByUserEmailOrderByIdDesc(String email);
    List<Consultation> findByUserEmailAndTravelerIdOrderByIdDesc(String email, Long travelerId);
    List<Consultation> findByUserEmailAndTravelerIsNullOrderByIdDesc(String email);
    List<Consultation> findByUserEmailAndPatientIdOrderByIdDesc(String email, String patientId);
    List<Consultation> findByUserIdOrderByIdDesc(Long userId);
    void deleteByUserId(Long userId);
}
