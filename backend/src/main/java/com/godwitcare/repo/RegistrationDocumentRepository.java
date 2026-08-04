package com.godwitcare.repo;

import com.godwitcare.entity.RegistrationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RegistrationDocumentRepository extends JpaRepository<RegistrationDocument, Long> {
    List<RegistrationDocument> findByRegistrationIdOrderByCreatedAtDesc(Long registrationId);
    List<RegistrationDocument> findByRegistrationIdAndPatientIdOrderByCreatedAtDesc(Long registrationId, String patientId);
    Optional<RegistrationDocument> findByRegistrationIdAndPatientIdAndDocumentType(Long registrationId, String patientId, RegistrationDocument.DocumentType documentType);
    boolean existsByRegistrationIdAndPatientIdAndDocumentType(Long registrationId, String patientId, RegistrationDocument.DocumentType documentType);
}
