package com.godwitcare.config;

import com.godwitcare.repo.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /* ======= Beans for auth ======= */

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(UserRepository repo) {
        return username -> repo.findByEmail(username)
                .map(u -> User.withUsername(u.getEmail())
                        .password(u.getPassword())
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

    // Store SecurityContext in HTTP session (so /auth/me works after login)
    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /* ======= Main security chain ======= */
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http,
                                    SecurityContextRepository scr) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .headers(h -> h.frameOptions(f -> f.disable()))
                .securityContext(sc -> sc.securityContextRepository(scr))
                .authorizeHttpRequests(reg -> reg
                        // Public auth endpoints + H2 console
                        .requestMatchers("/api/auth/**", "/h2-console/**").permitAll()

                        // Public creation endpoints
                        .requestMatchers(HttpMethod.POST, "/api/registrations").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/registrations/*/document").permitAll()

                        // ✅ Public, read-only document access (list + view + download)
                        // Keep ** only at the END of the pattern.
                        .requestMatchers(HttpMethod.GET, "/api/registrations/{id}/documents").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/registrations/{id}/documents/**").permitAll()

                        // Everything else requires auth
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
        cfg.setAllowedOrigins(List.of(
                "http://localhost:5173",                      // local dev
                "https://porposetarget25.github.io",          // GitHub Pages root
                "https://porposetarget25.github.io/godwitcare"// project subpath (safe to keep)
        ));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true); // allow JSESSIONID cookie

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
