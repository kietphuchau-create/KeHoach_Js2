package com.medsched.security;

import com.medsched.persistence.entity.UserEntity;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    private JwtService jwtService;
    private AppUserDetailsService userDetailsService;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = mock(JwtService.class);
        userDetailsService = mock(AppUserDetailsService.class);
        filter = new JwtAuthenticationFilter(jwtService, userDetailsService);
    }

    @Test
    @DisplayName("Valid token with matching session ID sets authentication")
    void validTokenWithMatchingSessionSetsAuth() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        when(request.getHeader("Authorization")).thenReturn("Bearer valid-token");

        Claims claims = mock(Claims.class);
        when(jwtService.parse("valid-token")).thenReturn(claims);
        when(jwtService.isType(claims, JwtService.TYPE_ACCESS)).thenReturn(true);
        when(claims.getSubject()).thenReturn("user-1");
        when(claims.get(JwtService.CLAIM_SESSION_ID, String.class)).thenReturn("sess-abc");

        UserEntity user = new UserEntity("user-1", "a@b.com", "hash", "Nguyen A", "090", true, Instant.now(), Instant.now());
        user.setCurrentSessionId("sess-abc");
        AppUserDetails userDetails = new AppUserDetails(user, List.of());

        when(userDetailsService.loadUserById("user-1")).thenReturn(userDetails);

        filter.doFilterInternal(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("a@b.com");
        verify(chain).doFilter(request, response);
    }

    @Test
    @DisplayName("Outdated token with mismatched session ID returns 401 CONCURRENT_SESSION_EXPIRED and does not continue chain")
    void mismatchedSessionReturnsConcurrentExpired() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);

        when(request.getHeader("Authorization")).thenReturn("Bearer old-token");
        when(request.getRequestURI()).thenReturn("/api/v1/appointments");
        when(response.getWriter()).thenReturn(printWriter);

        Claims claims = mock(Claims.class);
        when(jwtService.parse("old-token")).thenReturn(claims);
        when(jwtService.isType(claims, JwtService.TYPE_ACCESS)).thenReturn(true);
        when(claims.getSubject()).thenReturn("user-1");
        // Old token has old session id
        when(claims.get(JwtService.CLAIM_SESSION_ID, String.class)).thenReturn("old-sess-1");

        // DB has new session id because user logged in on another browser
        UserEntity user = new UserEntity("user-1", "a@b.com", "hash", "Nguyen A", "090", true, Instant.now(), Instant.now());
        user.setCurrentSessionId("new-sess-2");
        AppUserDetails userDetails = new AppUserDetails(user, List.of());

        when(userDetailsService.loadUserById("user-1")).thenReturn(userDetails);

        filter.doFilterInternal(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        printWriter.flush();
        assertThat(stringWriter.toString()).contains("CONCURRENT_SESSION_EXPIRED");
        verify(chain, never()).doFilter(any(), any());
    }
}
