package com.godwitcare.web;

import com.godwitcare.entity.Role;
import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(UserRepository users,
                          PasswordEncoder encoder,
                          SecurityContextRepository securityContextRepository) {
        this.users = users;
        this.encoder = encoder;
        this.securityContextRepository = securityContextRepository;
    }

    // ---------- DTOs ----------

    /** Registration: username is REQUIRED; email is optional */
    public record RegisterReq(
            @NotBlank String firstName,
            String lastName,
            String email,            // optional
            @NotBlank String username, // primary WhatsApp like +91XXXXXXXXXX
            @NotBlank String password
    ) {}

    /**
     * Login supports any of:
     * - identifier (username OR email)
     * - username
     * - email
     * Frontend can continue sending {email,password}; this will still work.
     */
    public record LoginReq(String identifier, String username, @Email String email, @NotBlank String password) {}

    public record UserDto(Long id,
                          String firstName,
                          String lastName,
                          String email,     // may be null
                          String username,  // always present
                          List<String> roles) {}

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(),
                u.getFirstName(),
                u.getLastName(),
                u.getEmail(),
                u.getUsername(),
                List.of(u.getRole().name())
        );
    }

    // ---------- Helpers ----------

    private Optional<User> findByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) return Optional.empty();
        // Try username first (phone), then email
        return users.findByUsername(identifier).or(() -> users.findByEmail(identifier));
    }

    private Authentication buildAuth(User u) {
        GrantedAuthority ga = new SimpleGrantedAuthority("ROLE_" + u.getRole().name());
        return new UsernamePasswordAuthenticationToken(u.getUsername(), null, List.of(ga));
    }

    private void persistContext(Authentication auth, HttpServletRequest request, HttpServletResponse response) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        request.getSession(true);
    }

    // ---------- Endpoints ----------

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterReq req) {
        // username required and must be unique
        if (users.existsByUsername(req.username())) {
            return ResponseEntity.badRequest().body("Username already registered");
        }
        // email optional but, if present, must be unique
        if (req.email() != null && !req.email().isBlank() && users.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User u = new User();
        u.setFirstName(req.firstName());
        u.setLastName(req.lastName());
        u.setUsername(req.username().trim());
        u.setEmail((req.email() == null || req.email().isBlank()) ? null : req.email().trim());
        u.setPassword(encoder.encode(req.password()));
        u.setRole(Role.USER);
        users.save(u);

        return ResponseEntity.ok(toDto(u));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {

        // Determine identifier precedence: identifier -> username -> email
        String id = (req.identifier() != null && !req.identifier().isBlank())
                ? req.identifier()
                : (req.username() != null && !req.username().isBlank())
                ? req.username()
                : req.email();

        if (id == null || id.isBlank()) {
            return ResponseEntity.badRequest().body("Username or email is required");
        }

        Optional<User> ou = findByIdentifier(id);
        if (ou.isEmpty()) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        User u = ou.get();
        if (!encoder.matches(req.password(), u.getPassword())) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }

        // Build Authentication with authorities and persist to session
        Authentication auth = buildAuth(u);
        persistContext(auth, request, response);

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

        // auth.getName() is the username we set in buildAuth (NOT email)
        String username = auth.getName();
        User u = users.findByUsername(username).orElse(null);
        if (u == null) {
            // Fallback: some older sessions may have email as principal
            u = users.findByEmail(username).orElse(null);
        }
        if (u == null) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(toDto(u));
    }

    @PostMapping("/registerDoctor")
    public ResponseEntity<?> registerDoctor(@RequestBody RegisterReq dto) {
        if (users.existsByUsername(dto.username())) {
            return ResponseEntity.badRequest().body("Username already registered");
        }
        if (dto.email() != null && !dto.email().isBlank() && users.existsByEmail(dto.email())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User u = new User();
        u.setFirstName(dto.firstName());
        u.setLastName(dto.lastName());
        u.setUsername(dto.username().trim());
        u.setEmail((dto.email() == null || dto.email().isBlank()) ? null : dto.email().trim());
        u.setPassword(encoder.encode(dto.password()));
        u.setRole(Role.DOCTOR);
        users.save(u);

        return ResponseEntity.ok(toDto(u));
    }
}
