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
                doctor.setFirstName("Doctor");
                doctor.setLastName("GodwitCare");
                doctor.setEmail("doctor@godwitcare.com"); // unique email
                doctor.setPassword(encoder.encode("demo")); // hashed password
                doctor.setRole(Role.DOCTOR); // <-- make sure you added role in User entity
                repo.save(doctor);

                System.out.println("✅ Doctor user created: doctor@godwitcare.com / demo");
            }
        };
    }
}
