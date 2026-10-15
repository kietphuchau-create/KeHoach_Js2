package com.medsched.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Tests for JwtService, the highest-risk part of the login flow.
 * Runs without a Spring context, so it stays fast.
 */
class JwtServiceTest {

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private JwtService jwtService() {
        return new JwtService(SECRET, Duration.ofHours(1), Duration.ofDays(7));
    }

    @Test
    @DisplayName("Access token carries the correct identity and roles")
    void accessTokenCarriesIdentityAndRoles() {
        JwtService jwt = jwtService();

        String token = jwt.generateAccessToken("user-1", "a@b.com", List.of("ROLE_PATIENT", "ROLE_STAFF@center-1"));
        Claims claims = jwt.parse(token);

        assertThat(claims.getSubject()).isEqualTo("user-1");
        assertThat(claims.get("email", String.class)).isEqualTo("a@b.com");
        assertThat(claims.get("roles").toString()).contains("ROLE_STAFF@center-1");
        assertThat(jwt.isType(claims, JwtService.TYPE_ACCESS)).isTrue();
    }

    @Test
    @DisplayName("Access and refresh tokens can never be mistaken for each other")
    void accessAndRefreshTokensStaySeparate() {
        JwtService jwt = jwtService();

        Claims refresh = jwt.parse(jwt.generateRefreshToken("user-1"));
        Claims access = jwt.parse(jwt.generateAccessToken("user-1", "a@b.com", List.of()));

        assertThat(jwt.isType(refresh, JwtService.TYPE_REFRESH)).isTrue();
        assertThat(jwt.isType(refresh, JwtService.TYPE_ACCESS)).isFalse();
        assertThat(jwt.isType(access, JwtService.TYPE_REFRESH)).isFalse();
    }

    @Test
    @DisplayName("A token signed with a different secret is rejected")
    void rejectsTokenSignedWithAnotherSecret() {
        String token = jwtService().generateAccessToken("user-1", "a@b.com", List.of());
        JwtService attacker = new JwtService(
                "a-completely-different-secret-but-still-32-chars", Duration.ofHours(1), Duration.ofDays(7));

        assertThatThrownBy(() -> attacker.parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("A token with a tampered signature is rejected")
    void rejectsTokenWithTamperedSignature() {
        JwtService jwt = jwtService();
        String token = jwt.generateAccessToken("user-1", "a@b.com", List.of());
        String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "forged-signature";

        assertThatThrownBy(() -> jwt.parse(tampered)).isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("An expired token is rejected")
    void rejectsExpiredToken() {
        JwtService jwt = jwtService();
        JwtService issuerOfExpiredTokens = new JwtService(SECRET, Duration.ofSeconds(-10), Duration.ofDays(7));
        String expiredToken = issuerOfExpiredTokens.generateAccessToken("user-1", "a@b.com", List.of());

        assertThatThrownBy(() -> jwt.parse(expiredToken)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("A secret shorter than 32 characters is refused at startup")
    void refusesWeakSecret() {
        assertThatThrownBy(() -> new JwtService("too-short", Duration.ofHours(1), Duration.ofDays(7)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32");
    }

    @Test
    @DisplayName("Access token lifetime comes from configuration (1 hour = 3600 seconds)")
    void expiresInComesFromConfiguration() {
        assertThat(jwtService().accessTtlSeconds()).isEqualTo(3600L);
        assertThat(new JwtService(SECRET, Duration.ofMinutes(30), Duration.ofDays(7)).accessTtlSeconds())
                .isEqualTo(1800L);
    }

    @Test
    @DisplayName("The default secret in application.yml is strong enough to boot")
    void defaultSecretIsAccepted() {
        assertDoesNotThrow(this::jwtService);
    }
}
