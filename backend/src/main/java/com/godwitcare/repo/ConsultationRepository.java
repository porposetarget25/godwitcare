package com.godwitcare.repo;

import com.godwitcare.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByUserEmailOrderByIdDesc(String email);
}
