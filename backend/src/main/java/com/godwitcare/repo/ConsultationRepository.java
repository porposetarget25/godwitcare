package com.godwitcare.repo;

import com.godwitcare.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByUserEmailOrderByIdDesc(String email);
    List<Consultation> findByUserEmailAndTravelerIdOrderByIdDesc(String email, Long travelerId);
    List<Consultation> findByUserEmailAndTravelerIsNullOrderByIdDesc(String email);
    List<Consultation> findByUserEmailAndPatientIdOrderByIdDesc(String email, String patientId);
    List<Consultation> findByUserIdOrderByIdDesc(Long userId);
    boolean existsByTravelerId(Long travelerId);
    void deleteByUserId(Long userId);
    List<Consultation> findByUserIdAndStatusNotOrderByCreatedAtDesc(Long userId, Consultation.Status status);

    @Query("""
            select c from Consultation c
            left join c.user u
            where (:status is null or c.status = :status)
              and (:patientName = ''
                   or lower(c.contactName) like lower(concat('%', :patientName, '%'))
                   or lower(u.email) like lower(concat('%', :patientName, '%')))
              and (:hasFromDate = false or c.createdAt >= :fromDate)
              and (:hasToDate = false or c.createdAt < :toDate)
            order by c.createdAt desc, c.id desc
            """)
    List<Consultation> searchForDoctor(
            @Param("status") Consultation.Status status,
            @Param("patientName") String patientName,
            @Param("hasFromDate") boolean hasFromDate,
            @Param("fromDate") Instant fromDate,
            @Param("hasToDate") boolean hasToDate,
            @Param("toDate") Instant toDate);
}
