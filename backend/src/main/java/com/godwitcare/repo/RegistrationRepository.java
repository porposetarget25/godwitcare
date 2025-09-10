package com.godwitcare.repo;

import com.godwitcare.entity.Registration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


import java.util.Optional;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    // All registrations for an email (newest first)
    List<Registration> findByEmailAddressOrderByIdDesc(String emailAddress);

    Optional<Registration> findTopByEmailAddressOrderByIdDesc(String emailAddress);

    // Only the newest one (Top/First are synonyms)
    Optional<Registration> findFirstByEmailAddressOrderByIdDesc(String emailAddress);
}


