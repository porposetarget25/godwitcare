package com.godwitcare.config;

import com.godwitcare.repo.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import org.springframework.http.HttpMethod;


import java.util.List;

@Configuration
@EnableMethodSecurity // optional, lets you use @PreAuthorize if ever needed
public class SecurityConfig {

    /* ======= Beans for auth ======= */

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Loads users from your H2 DB by email (username)
    @Bean
    UserDetailsService userDetailsService(UserRepository repo) {
        return username -> repo.findByEmail(username)
                .map(u -> User.withUsername(u.getEmail())
                        .password(u.getPassword()) // already BCrypt-hashed
                        .roles("USER")
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    @Bean
    DaoAuthenticationProvider authProvider(UserDetailsService uds, PasswordEncoder encoder) {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(uds);
        p.setPasswordEncoder(encoder);
        return p;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    /* ======= Main security chain ======= */

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .headers(h -> h.frameOptions(f -> f.disable()))
                .authorizeHttpRequests(reg -> reg
                        // auth + H2 always public
                        .requestMatchers("/api/auth/**", "/h2-console/**").permitAll()
                        // 👇 allow registration creation + file upload without auth
                        .requestMatchers(HttpMethod.POST, "/api/registrations").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/registrations/*/document").permitAll()
                        // (optional) allow GET of public docs if you have any
                        // .requestMatchers(HttpMethod.GET, "/api/registrations/**").authenticated()
                        .anyRequest().authenticated()
                )
                .formLogin(f -> f.disable())
                .logout(l -> l.logoutUrl("/api/auth/logout"));

        return http.build();
    }

    /* ======= CORS (frontend URLs) ======= */
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        // TODO: put your real frontend origins here.
        // Keep localhost for dev and your hosted frontend domains for prod.
        cfg.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "https://porposetarget25.github.io"
                      // e.g. Netlify/Vercel/Render static site
        ));

        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true); // allow cookies (JSESSIONID)

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
