package com.godwitcare.config;

import com.godwitcare.entity.Role;
import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class Bootstrap {

    @Bean
    CommandLineRunner initUsers(UserRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByEmail("doctor@godwitcare.com").isEmpty()) {
                User doctor = new User();
                doctor.setUsername("12345");
                doctor.setFirstName("Doctor");
                doctor.setLastName("GodwitCare");
                doctor.setEmail("doctor@godwitcare.com");
                doctor.setPassword(encoder.encode("demo"));
                doctor.setRole(Role.DOCTOR);
                repo.save(doctor);
            }

            if (repo.findByEmail("admin@godwitcare.com").isEmpty()) {
                User admin = new User();
                admin.setUsername("007");
                admin.setFirstName("Faiz");
                admin.setLastName("Ahamad");
                admin.setEmail("admin@godwitcare.com");
                admin.setPassword(encoder.encode("demo"));
                admin.setRole(Role.ADMIN);
                repo.save(admin);
            }
        };
    }
}
