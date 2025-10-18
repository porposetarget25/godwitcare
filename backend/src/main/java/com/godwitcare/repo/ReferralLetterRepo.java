// src/main/java/com/godwitcare/repo/ReferralLetterRepo.java
package com.godwitcare.repo;

import com.godwitcare.entity.ReferralLetter;
import com.godwitcare.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReferralLetterRepo extends JpaRepository<ReferralLetter, Long> {
    Optional<ReferralLetter> findTopByConsultationUserIdOrderByCreatedAtDesc(Long userId);
}
