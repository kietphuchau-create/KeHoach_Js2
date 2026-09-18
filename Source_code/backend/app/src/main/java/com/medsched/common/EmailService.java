package com.medsched.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final String frontendUrl;

    public EmailService(@Value("${medsched.frontend.url:http://localhost:3000}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public void sendPasswordResetEmail(String toEmail, String rawToken) {
        String resetLink = frontendUrl + "/reset-password?token=" + rawToken;
        // Ghi log link rõ ràng ở Console để DEV/Tester/Giáo viên kiểm thử trực tiếp mà không cần cấu hình SMTP thật
        log.info("================================================================================");
        log.info("📧 [EMAIL SERVICE] GỬI LIÊN KẾT ĐẶT LẠI MẬT KHẨU CHO: {}", toEmail);
        log.info("🔗 Link đặt lại mật khẩu: {}", resetLink);
        log.info("⏰ Thời hạn hiệu lực: 15 phút (Dùng 1 lần duy nhất)");
        log.info("================================================================================");
    }

}
