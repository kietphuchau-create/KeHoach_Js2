package com.medsched.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.common.ApiError;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;
    private final List<String> allowedOrigins;

    public SecurityConfig(ObjectMapper objectMapper,
                          @Value("${medsched.cors.allowed-origins:http://localhost:3000}") List<String> allowedOrigins) {
        this.objectMapper = objectMapper;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AppUserDetailsService userDetailsService,
                                                       PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        // An unknown email fails exactly like a wrong password, so an attacker
        // cannot probe which emails are registered.
        provider.setHideUserNotFoundExceptions(true);
        return new ProviderManager(provider);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
                // Stateless API with no cookies/session, so classic CSRF does not apply.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 1. Endpoints công khai hoàn toàn: Auth, tài liệu Swagger / OpenAPI
                        .requestMatchers(
                                "/error",
                                "/api/v1/auth/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // 2. Cho phép GET public danh mục y tế để người bệnh xem thông tin phòng khám/dịch vụ
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/medical-centers/**",
                                "/api/v1/specialties/**",
                                "/api/v1/services/**"
                        ).permitAll()

                        // 3. Khách xem danh sách slot giờ khám và tra cứu mã booking
                        .requestMatchers(HttpMethod.GET,
                                "/api/appointments/doctors/*/slots",
                                "/api/v1/appointments/doctors/*/slots",
                                "/api/appointments/booking-code/*",
                                "/api/v1/appointments/booking-code/*"
                        ).permitAll()

                        // 4. AI Triage định hướng chuyên khoa ban đầu
                        .requestMatchers("/api/ai/**", "/api/v1/ai/**").permitAll()

                        // 5. Phân quyền theo vai trò cụ thể
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/doctor/**", "/api/doctor/**").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers("/api/v1/reception/**", "/api/reception/**").hasAnyRole("STAFF", "ADMIN")

                        // 6. Toàn bộ các API còn lại (bao gồm /api/v1/appointments/**, /api/v1/me/**) BẮT BUỘC ĐĂNG NHẬP
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> write(res, HttpStatus.UNAUTHORIZED,
                                "Bạn cần đăng nhập để dùng chức năng này", req.getRequestURI()))
                        .accessDeniedHandler((req, res, e) -> write(res, HttpStatus.FORBIDDEN,
                                "Tài khoản của bạn không có quyền thực hiện chức năng này", req.getRequestURI())))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private void write(HttpServletResponse response, HttpStatus status, String message, String path)
            throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), ApiError.of(status, message, path));
    }

}
