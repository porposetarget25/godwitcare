// src/main/java/com/godwitcare/web/ReferralPublicController.java
package com.godwitcare.web;

import com.godwitcare.entity.ReferralLetter;
import com.godwitcare.entity.User;
import com.godwitcare.repo.ReferralLetterRepo;
import com.godwitcare.repo.UserRepository;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/referrals")
public class ReferralPublicController {

    private final UserRepository users;
    private final ReferralLetterRepo referrals;

    public ReferralPublicController(UserRepository users, ReferralLetterRepo referrals) {
        this.users = users;
        this.referrals = referrals;
    }

    private User requireCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(UNAUTHORIZED);
        }
        final String login = auth.getName();
        if (login == null || login.isBlank() || "anonymousUser".equals(login)) {
            throw new ResponseStatusException(UNAUTHORIZED);
        }
        return users.findByUsername(login)
                .or(() -> users.findByEmail(login.toLowerCase(Locale.ROOT)))
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED));
    }

    /** Return latest referral meta for the logged-in patient. */
    @GetMapping("/latest")
    public ResponseEntity<?> latest(Authentication auth) {
        User u = requireCurrentUser(auth);

        Optional<ReferralLetter> opt = referrals
                .findTopByConsultationUserUsernameOrConsultationUserEmailOrderByIdDesc(
                        u.getUsername(), u.getEmail()
                );

        if (opt.isEmpty()) return ResponseEntity.noContent().build();

        ReferralLetter r = opt.get();
        // IMPORTANT: point to the *patient* route, not /api/doctor/...
        String pdfUrl = "/api/referrals/" + r.getId() + "/pdf";

        return ResponseEntity.ok(Map.of("id", r.getId(), "pdfUrl", pdfUrl));
    }

    /** Stream the PDF if (and only if) the referral belongs to the logged-in patient. */
    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getMyReferralPdf(@PathVariable long id, Authentication auth) {
        User u = requireCurrentUser(auth);

        ReferralLetter r = referrals.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Ownership check: referral -> consultation -> user must be the current user
        var owner = r.getConsultation() != null ? r.getConsultation().getUser() : null;
        if (owner == null || owner.getId() == null || !owner.getId().equals(u.getId())) {
            throw new ResponseStatusException(FORBIDDEN);
        }

        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.setContentDisposition(ContentDisposition.inline()
                .filename(Optional.ofNullable(r.getFileName()).orElse("referral.pdf"), StandardCharsets.UTF_8)
                .build());
        return new ResponseEntity<>(r.getPdfBytes(), h, HttpStatus.OK);
    }
}
