package com.godwitcare.web;

import com.godwitcare.entity.Role;
import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(UserRepository users,
                          PasswordEncoder encoder,
                          AuthenticationManager authManager,
                          SecurityContextRepository securityContextRepository) {
        this.users = users;
        this.encoder = encoder;
        this.authManager = authManager;
        this.securityContextRepository = securityContextRepository;
    }

    // ---------- DTOs ----------
    public record RegisterReq(
            @NotBlank String firstName,
            @NotBlank String lastName,
            @Email String email,
            @NotBlank String password) {}

    public record LoginReq(@Email String email, @NotBlank String password) {}

    // Now includes role(s)
    public record UserDto(Long id,
                          String firstName,
                          String lastName,
                          String email,
                          List<String> roles) {}

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(),
                u.getFirstName(),
                u.getLastName(),
                u.getEmail(),
                List.of(u.getRole().name()) // e.g. ["USER"] or ["DOCTOR"]
        );
    }

    // ---------- Endpoints ----------

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterReq req) {
        if (users.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        User u = new User();
        u.setFirstName(req.firstName());
        u.setLastName(req.lastName());
        u.setEmail(req.email());
        u.setPassword(encoder.encode(req.password()));
        u.setRole(Role.USER); // default
        users.save(u);
        return ResponseEntity.ok(toDto(u));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );

        // Save security context into session (sets JSESSIONID)
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        request.getSession(true);

        UserDetails principal = (UserDetails) auth.getPrincipal();
        User u = users.findByEmail(principal.getUsername()).orElseThrow();

        return ResponseEntity.ok(toDto(u));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) throws Exception {
        request.logout();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        User u = users.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(toDto(u));
    }

    @PostMapping("/registerDoctor")
    public ResponseEntity<UserDto> registerDoctor(@RequestBody RegisterReq dto) {
        if (users.findByEmail(dto.email()).isPresent()) {
            return ResponseEntity.status(409).build();
        }
        User u = new User();
        u.setEmail(dto.email());
        u.setFirstName(dto.firstName());
        u.setLastName(dto.lastName());
        u.setPassword(encoder.encode(dto.password()));
        u.setRole(Role.DOCTOR);
        users.save(u);
        return ResponseEntity.ok(toDto(u));
    }
}
