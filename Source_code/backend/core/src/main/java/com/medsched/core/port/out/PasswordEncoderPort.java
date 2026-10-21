package com.medsched.core.port.out;

/**
 * Outbound Port: Giao tiếp với thuật toán mã hóa mật khẩu (Security Adapter).
 * Giúp Core không bị phụ thuộc vào Spring Security BCryptPasswordEncoder.
 */
public interface PasswordEncoderPort {

    boolean matches(String rawPassword, String encodedPassword);

    String encode(String rawPassword);

}
