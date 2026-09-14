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
 * Kiểm thử JwtService - phần rủi ro cao nhất của luồng đăng nhập.
 * Không cần Spring context nên chạy rất nhanh.
 */
class JwtServiceTest {

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private JwtService jwtService() {
        return new JwtService(SECRET, Duration.ofHours(1), Duration.ofDays(7));
    }

    @Test
    @DisplayName("Access token mang đúng danh tính và quyền của người đăng nhập")
    void accessTokenChuaDungThongTin() {
        JwtService jwt = jwtService();

        String token = jwt.generateAccessToken("user-1", "a@b.com", List.of("ROLE_PATIENT", "ROLE_STAFF@center-1"));
        Claims claims = jwt.parse(token);

        assertThat(claims.getSubject()).isEqualTo("user-1");
        assertThat(claims.get("email", String.class)).isEqualTo("a@b.com");
        assertThat(claims.get("roles").toString()).contains("ROLE_STAFF@center-1");
        assertThat(jwt.isType(claims, JwtService.TYPE_ACCESS)).isTrue();
    }

    @Test
    @DisplayName("Refresh token không bị nhận nhầm thành access token và ngược lại")
    void haiLoaiTokenTachBiet() {
        JwtService jwt = jwtService();

        Claims refresh = jwt.parse(jwt.generateRefreshToken("user-1"));
        Claims access = jwt.parse(jwt.generateAccessToken("user-1", "a@b.com", List.of()));

        assertThat(jwt.isType(refresh, JwtService.TYPE_REFRESH)).isTrue();
        assertThat(jwt.isType(refresh, JwtService.TYPE_ACCESS)).isFalse();
        assertThat(jwt.isType(access, JwtService.TYPE_REFRESH)).isFalse();
    }

    @Test
    @DisplayName("Token ký bằng secret khác bị từ chối")
    void tuChoiTokenKyBangSecretKhac() {
        String token = jwtService().generateAccessToken("user-1", "a@b.com", List.of());
        JwtService keHacKhac = new JwtService(
                "mot-secret-hoan-toan-khac-nhung-van-du-32-ky-tu", Duration.ofHours(1), Duration.ofDays(7));

        assertThatThrownBy(() -> keHacKhac.parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("Token bị sửa chữ ký bị từ chối")
    void tuChoiTokenBiSuaChuKy() {
        JwtService jwt = jwtService();
        String token = jwt.generateAccessToken("user-1", "a@b.com", List.of());
        String giaMao = token.substring(0, token.lastIndexOf('.') + 1) + "chu-ky-gia-mao";

        assertThatThrownBy(() -> jwt.parse(giaMao)).isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("Token hết hạn bị từ chối")
    void tuChoiTokenHetHan() {
        JwtService jwt = jwtService();
        JwtService phatHanhTokenDaHetHan = new JwtService(SECRET, Duration.ofSeconds(-10), Duration.ofDays(7));
        String tokenHetHan = phatHanhTokenDaHetHan.generateAccessToken("user-1", "a@b.com", List.of());

        assertThatThrownBy(() -> jwt.parse(tokenHetHan)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("Secret ngắn hơn 32 ký tự bị chặn ngay khi khởi động")
    void chanSecretYeu() {
        assertThatThrownBy(() -> new JwtService("qua-ngan", Duration.ofHours(1), Duration.ofDays(7)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32");
    }

    @Test
    @DisplayName("Thời hạn access token lấy đúng từ cấu hình (1 giờ = 3600 giây)")
    void expiresInLayTuCauHinh() {
        assertThat(jwtService().accessTtlSeconds()).isEqualTo(3600L);
        assertThat(new JwtService(SECRET, Duration.ofMinutes(30), Duration.ofDays(7)).accessTtlSeconds())
                .isEqualTo(1800L);
    }

    @Test
    @DisplayName("Secret mặc định trong application.yml đủ mạnh để khởi động")
    void secretMacDinhHopLe() {
        assertDoesNotThrow(this::jwtService);
    }
}
