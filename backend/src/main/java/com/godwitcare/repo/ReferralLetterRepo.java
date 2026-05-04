// src/main/java/com/godwitcare/repo/ReferralLetterRepo.java
package com.godwitcare.repo;

import com.godwitcare.entity.ReferralLetter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReferralLetterRepo extends JpaRepository<ReferralLetter, Long> {
    Optional<ReferralLetter> findTopByConsultationUserUsernameOrConsultationUserEmailOrderByIdDesc(
            String username, String email
    );

    Optional<ReferralLetter> findTopByConsultationIdOrderByIdDesc(Long consultationId);
    Optional<ReferralLetter> findTopByConsultationUserIdAndConsultationTravelerIsNullOrderByIdDesc(Long userId);
    Optional<ReferralLetter> findTopByConsultationUserIdAndConsultationTravelerIdOrderByIdDesc(Long userId, Long travelerId);
    Optional<ReferralLetter> findTopByConsultationUserIdAndConsultationPatientIdOrderByIdDesc(Long userId, String patientId);
    java.util.List<ReferralLetter> findByConsultationUserIdOrderByIdDesc(Long userId);
    void deleteByConsultationUserId(Long userId);

}
