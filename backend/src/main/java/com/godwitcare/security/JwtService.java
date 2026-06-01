package com.godwitcare.security;

import com.godwitcare.config.JwtProperties;
import com.godwitcare.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {
    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(properties.getExpirationMs());
        String role = user.getRole().name();

        return Jwts.builder()
                .issuer(properties.getIssuer())
                .subject(user.getUsername())
                .claim("uid", user.getId())
                .claim("email", user.getEmail())
                .claim("roles", List.of(role))
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }

    public Authentication parseAuthentication(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(properties.getIssuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String username = claims.getSubject();
        if (username == null || username.isBlank()) {
            throw new JwtException("JWT subject is missing");
        }

        List<SimpleGrantedAuthority> authorities = extractRoles(claims).stream()
                .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                .map(SimpleGrantedAuthority::new)
                .toList();

        return new UsernamePasswordAuthenticationToken(username, null, authorities);
    }

    @SuppressWarnings("unchecked")
    private List<String> extractRoles(Claims claims) {
        Object rawRoles = claims.get("roles");
        if (rawRoles instanceof List<?> roles) {
            return roles.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .toList();
        }
        String role = claims.get("role", String.class);
        return role == null || role.isBlank() ? List.of() : List.of(role);
    }

    public long getExpirationMs() {
        return properties.getExpirationMs();
    }
}
