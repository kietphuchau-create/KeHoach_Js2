package com.medsched.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Đọc header {@code Authorization: Bearer <token>}, xác minh chữ ký rồi nạp
 * người dùng từ DB.
 * <p>
 * Cố ý nạp lại từ DB mỗi request (thay vì tin hoàn toàn vào claim trong token):
 * khi Admin khóa tài khoản hoặc thu hồi quyền, thay đổi có hiệu lực NGAY thay
 * vì phải chờ access token hết hạn.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;
    private final com.medsched.persistence.repository.RevokedTokenJpaRepository revokedTokens;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   AppUserDetailsService userDetailsService,
                                   com.medsched.persistence.repository.RevokedTokenJpaRepository revokedTokens) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.revokedTokens = revokedTokens;
    }

    /**
     * Mặc định OncePerRequestFilter bỏ qua error dispatch, khiến mọi lỗi chưa
     * bắt được đều biến thành 401 gây hiểu nhầm. Bật lên để giữ nguyên danh
     * tính người dùng và trả đúng mã lỗi thật.
     */
    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HEADER);
        if (header == null || !header.startsWith(PREFIX)
                || SecurityContextHolder.getContext().getAuthentication() != null) {
            chain.doFilter(request, response);
            return;
        }

        try {
            String rawToken = header.substring(PREFIX.length());
            String tokenHash = JwtService.sha256Hex(rawToken);

            // 1. Kiểm tra nếu token đã bị thu hồi khi đăng xuất (Server-side Invalidation)
            if (revokedTokens.existsByTokenHash(tokenHash)) {
                SecurityContextHolder.clearContext();
                chain.doFilter(request, response);
                return;
            }

            Claims claims = jwtService.parse(rawToken);
            // Refresh token KHÔNG được dùng để gọi API nghiệp vụ.
            if (jwtService.isType(claims, JwtService.TYPE_ACCESS)) {
                AppUserDetails user = userDetailsService.loadUserById(claims.getSubject());
                if (user.isEnabled()) {
                    // 2. Kiểm tra nếu token được phát hành trước thời điểm đặt lại mật khẩu / huỷ toàn bộ session
                    if (user.getTokenInvalidBefore() != null && claims.getIssuedAt() != null) {
                        java.time.Instant issuedAt = claims.getIssuedAt().toInstant();
                        if (issuedAt.isBefore(user.getTokenInvalidBefore())) {
                            SecurityContextHolder.clearContext();
                            chain.doFilter(request, response);
                            return;
                        }
                    }

                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            user, null, user.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        } catch (JwtException | UsernameNotFoundException | IllegalArgumentException ex) {
            // Token sai/hết hạn/tài khoản đã bị xóa: để request đi tiếp không có
            // danh tính, SecurityConfig sẽ trả 401 với thông báo thống nhất.
            SecurityContextHolder.clearContext();
        }

        chain.doFilter(request, response);
    }

}
