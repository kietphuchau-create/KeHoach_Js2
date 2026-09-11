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

    public JwtAuthenticationFilter(JwtService jwtService, AppUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
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
            Claims claims = jwtService.parse(header.substring(PREFIX.length()));
            // Refresh token KHÔNG được dùng để gọi API nghiệp vụ.
            if (jwtService.isType(claims, JwtService.TYPE_ACCESS)) {
                AppUserDetails user = userDetailsService.loadUserById(claims.getSubject());
                if (user.isEnabled()) {
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
