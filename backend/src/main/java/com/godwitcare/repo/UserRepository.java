package com.godwitcare.repo;

import com.godwitcare.entity.User;
import com.godwitcare.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByResetPasswordToken(String resetPasswordToken);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByRoleOrderByIdDesc(Role role);
}
