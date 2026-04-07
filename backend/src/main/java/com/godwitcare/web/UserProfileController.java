package com.godwitcare.web;

import com.godwitcare.entity.User;
import com.godwitcare.repo.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserRepository users;
    private final Path uploadDir = Path.of("uploads", "profile-photos").toAbsolutePath().normalize();

    public UserProfileController(UserRepository users) {
        this.users = users;
    }

    public record ProfileReq(String firstName, String lastName, String email, String username) {}

    private Optional<User> currentUser(Authentication auth) {
        if (auth == null || auth.getName() == null) return Optional.empty();
        String principal = auth.getName();
        return users.findByUsername(principal).or(() -> users.findByEmail(principal));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth, HttpServletRequest req) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        User u = ou.get();
        String photoUrl = (u.getProfilePhotoFileName() == null || u.getProfilePhotoFileName().isBlank())
                ? null
                : req.getContextPath() + "/api/users/me/photo";

        return ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "firstName", Optional.ofNullable(u.getFirstName()).orElse(""),
                "lastName", Optional.ofNullable(u.getLastName()).orElse(""),
                "email", Optional.ofNullable(u.getEmail()).orElse(""),
                "username", Optional.ofNullable(u.getUsername()).orElse(""),
                "photoUrl", Optional.ofNullable(photoUrl).orElse(""),
                "roles", java.util.List.of(u.getRole().name())
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<?> update(Authentication auth, @RequestBody ProfileReq req) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        User u = ou.get();
        if (req.firstName() != null && !req.firstName().isBlank()) u.setFirstName(req.firstName().trim());
        if (req.lastName() != null) u.setLastName(req.lastName().trim());

        if (req.email() != null) {
            String email = req.email().trim();
            if (!email.isBlank() && users.existsByEmail(email) && !email.equalsIgnoreCase(Optional.ofNullable(u.getEmail()).orElse(""))) {
                return ResponseEntity.badRequest().body("Email already registered");
            }
            u.setEmail(email.isBlank() ? null : email);
        }

        if (req.username() != null) {
            String username = req.username().trim();
            if (username.isBlank()) return ResponseEntity.badRequest().body("Username cannot be blank");
            if (users.existsByUsername(username) && !username.equalsIgnoreCase(u.getUsername())) {
                return ResponseEntity.badRequest().body("Username already registered");
            }
            u.setUsername(username);
        }

        users.save(u);
        return ResponseEntity.ok(Map.of("message", "Profile updated"));
    }

    @PostMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhoto(Authentication auth, @RequestParam("file") MultipartFile file) throws Exception {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();
        if (file == null || file.isEmpty()) return ResponseEntity.badRequest().body("Photo is required");

        Files.createDirectories(uploadDir);

        User u = ou.get();
        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("photo.jpg");
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : ".jpg";
        String fileName = "user-" + u.getId() + "-" + System.currentTimeMillis() + ext;

        if (u.getProfilePhotoFileName() != null && !u.getProfilePhotoFileName().isBlank()) {
            try {
                Files.deleteIfExists(uploadDir.resolve(u.getProfilePhotoFileName()));
            } catch (Exception ignored) {}
        }

        Path target = uploadDir.resolve(fileName).normalize();
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        u.setProfilePhotoFileName(fileName);
        users.save(u);

        return ResponseEntity.ok(Map.of("message", "Photo uploaded"));
    }

    @GetMapping("/me/photo")
    public ResponseEntity<byte[]> photo(Authentication auth) throws Exception {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        User u = ou.get();
        if (u.getProfilePhotoFileName() == null || u.getProfilePhotoFileName().isBlank()) {
            return ResponseEntity.notFound().build();
        }

        Path p = uploadDir.resolve(u.getProfilePhotoFileName()).normalize();
        if (!Files.exists(p)) return ResponseEntity.notFound().build();

        String ct = Optional.ofNullable(Files.probeContentType(p)).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(ct)).body(Files.readAllBytes(p));
    }

    @DeleteMapping("/me/photo")
    public ResponseEntity<?> deletePhoto(Authentication auth) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();

        User u = ou.get();
        if (u.getProfilePhotoFileName() != null && !u.getProfilePhotoFileName().isBlank()) {
            try {
                Files.deleteIfExists(uploadDir.resolve(u.getProfilePhotoFileName()));
            } catch (Exception ignored) {}
            u.setProfilePhotoFileName(null);
            users.save(u);
        }
        return ResponseEntity.ok(Map.of("message", "Photo deleted"));
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAccount(Authentication auth) {
        Optional<User> ou = currentUser(auth);
        if (ou.isEmpty()) return ResponseEntity.status(401).build();
        User u = ou.get();
        users.delete(u);
        return ResponseEntity.ok(Map.of("message", "Account deleted"));
    }
}
