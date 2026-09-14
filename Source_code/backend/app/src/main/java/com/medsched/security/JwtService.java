package com.medsched.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;

/**
 * Issues and verifies HS256 JWTs for Task 1.
 * <p>
 * Two token kinds are told apart by the {@code typ} claim: {@code access}
 * (short-lived, used to call the API) and {@code refresh} (long-lived, only
 * good for obtaining a new access token). That way a refresh token can never
 * be replayed against the API directly.
 */
@Service
public class JwtService {

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private static final String CLAIM_TYPE = "typ";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLES = "roles";

    private final SecretKey key;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    /**
     * The property names below match application.yml exactly
     * ({@code access-token-duration} / {@code refresh-token-duration}).
     * This class previously read {@code access-ttl} / {@code refresh-ttl}; those
     * keys do not exist in the configuration file, so the configured lifetimes
     * (1 hour / 7 days) were silently ignored and every token fell back to the
     * hard-coded 30-minute default.
     */
    public JwtService(@Value("${medsched.jwt.secret}") String secret,
                      @Value("${medsched.jwt.access-token-duration:PT1H}") Duration accessTtl,
                      @Value("${medsched.jwt.refresh-token-duration:P7D}") Duration refreshTtl) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length < 32) {
            throw new IllegalStateException(
                    "medsched.jwt.secret phải dài tối thiểu 32 ký tự để ký HS256 an toàn");
        }
        this.key = Keys.hmacShaKeyFor(raw);
        this.accessTtl = accessTtl;
        this.refreshTtl = refreshTtl;
    }

    public String generateAccessToken(String userId, String email, List<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_ROLES, roles)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTtl)))
                .signWith(key)
                .compact();
    }

    /** Throws {@link io.jsonwebtoken.JwtException} if the token is badly signed, expired or malformed. */
    public Claims parse(String token) {
        Jws<Claims> jws = Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
        return jws.getPayload();
    }

    public boolean isType(Claims claims, String expectedType) {
        return expectedType.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public long accessTtlSeconds() {
        return accessTtl.toSeconds();
    }

}
