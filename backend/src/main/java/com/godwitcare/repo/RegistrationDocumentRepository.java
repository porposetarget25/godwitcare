package com.godwitcare.repo;

import com.godwitcare.entity.RegistrationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RegistrationDocumentRepository extends JpaRepository<RegistrationDocument, Long> {
    List<RegistrationDocument> findByRegistrationIdOrderByCreatedAtDesc(Long registrationId);
}
