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
 * Sinh và xác minh JWT (HS256) cho Task 1.
 * <p>
 * Có 2 loại token phân biệt bằng claim {@code typ}: {@code access} (ngắn hạn,
 * dùng gọi API) và {@code refresh} (dài hạn, chỉ dùng để xin access token mới).
 * Nhờ vậy một refresh token không thể bị đem gọi API trực tiếp.
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

    public JwtService(@Value("${medsched.jwt.secret}") String secret,
                      @Value("${medsched.jwt.access-ttl:PT30M}") Duration accessTtl,
                      @Value("${medsched.jwt.refresh-ttl:P7D}") Duration refreshTtl) {
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

    /** Ném {@link io.jsonwebtoken.JwtException} nếu token sai chữ ký, hết hạn hoặc hỏng. */
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
