package com.godwitcare.config;

import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class Bootstrap {

    @Bean CommandLineRunner seed(UserRepository repo, PasswordEncoder pe) {
        return args -> {
            if (repo.findByEmail("demo@godwit.care").isEmpty()) {
                User demo = new User();
                demo.setFirstName("Demo");
                demo.setLastName("User");
                demo.setEmail("demo@godwit.care");
                demo.setPassword(pe.encode("demo123"));
                repo.save(demo);

            }
        };
    }
}
