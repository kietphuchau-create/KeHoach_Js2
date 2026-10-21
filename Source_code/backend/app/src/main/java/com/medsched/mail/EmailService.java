package com.medsched.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Dịch vụ gửi Email tự động:
 * 1. Ưu tiên: Brevo HTTP API qua Cổng HTTPS 443 (hoạt động 100% trên Render Free, không bao giờ bị chặn).
 * 2. Fallback: Google Gmail SMTP qua Cổng 587 (dành cho chạy máy cục bộ / Localhost).
 */
@Service("otpEmailService")
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${brevo.api-key:${BREVO_API_KEY:}}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:${BREVO_SENDER_EMAIL:kietphuchau@gmail.com}}")
    private String brevoSenderEmail;

    @Value("${brevo.sender.name:${BREVO_SENDER_NAME:MedSched Smart Healthcare}}")
    private String brevoSenderName;

    @Value("${spring.mail.username:}")
    private String smtpFromEmail;

    public EmailService(JavaMailSender mailSender, ObjectMapper objectMapper) {
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Gửi email mã OTP xác thực đăng ký tài khoản MedSched (HTML đẹp mắt) bất đồng bộ.
     */
    @Async
    public void sendOtpEmail(String toEmail, String recipientName, String otpCode) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        String subject = "[MedSched] " + otpCode + " là mã xác thực OTP đăng ký tài khoản của bạn";
        String htmlContent = buildOtpHtmlTemplate(safeName, otpCode);

        // ── 1. ƯU TIÊN HÀNG ĐẦU: Gửi qua Brevo HTTP API (Cổng HTTPS 443 - Vượt qua tường lửa Render) ──
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            boolean brevoSuccess = sendViaBrevoHttpApi(toEmail, safeName, subject, htmlContent, otpCode);
            if (brevoSuccess) {
                return;
            }
            log.warn("⚠️ [EmailService] Gửi qua Brevo HTTP API thất bại, chuyển sang thử Gmail SMTP...");
        }

        // ── 2. FALLBACK: Gửi qua JavaMailSender (Gmail SMTP Cổng 587) ──
        sendViaSmtp(toEmail, subject, htmlContent, otpCode);
    }

    /**
     * Gửi qua Brevo HTTPS API (Cổng 443 - không bao giờ bị Render hay các Cloud chặn).
     */
    private boolean sendViaBrevoHttpApi(String toEmail, String recipientName, String subject, String htmlContent, String otpCode) {
        try {
            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", brevoSenderName, "email", brevoSenderEmail),
                    "to", List.of(Map.of("email", toEmail, "name", recipientName)),
                    "subject", subject,
                    "htmlContent", htmlContent
            );
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .header("accept", "application/json")
                    .header("api-key", brevoApiKey.trim())
                    .header("content-type", "application/json; charset=utf-8")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("🚀 [EmailService] Đã gửi mã OTP [{}] thành công qua Brevo HTTPS API (Cổng 443) tới: {}", otpCode, toEmail);
                return true;
            } else {
                log.error("❌ [EmailService] Brevo API trả về mã lỗi HTTP {}: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("❌ [EmailService] Ngoại lệ khi gọi Brevo HTTP API: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Gửi qua Gmail SMTP truyền thống (Cổng 587).
     */
    private void sendViaSmtp(String toEmail, String subject, String htmlContent, String otpCode) {
        if (smtpFromEmail == null || smtpFromEmail.isBlank()) {
            log.warn("⚠️ [EmailService] Chưa cấu hình spring.mail.username. Bỏ qua gửi SMTP.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(smtpFromEmail, "MedSched Smart Healthcare");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("✅ [EmailService] Đã gửi mã OTP [{}] thành công qua Gmail SMTP tới: {}", otpCode, toEmail);
        } catch (MessagingException e) {
            log.error("❌ [EmailService] Lỗi tạo nội dung email SMTP tới {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.error("❌ [EmailService] Lỗi khi gửi email qua Gmail SMTP tới {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildOtpHtmlTemplate(String recipientName, String otpCode) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Mã xác thực OTP MedSched</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #0d9488 0%%, #0f766e 100%%); padding: 32px 24px; text-align: center; color: #ffffff;">
                        <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">MedSched Smart Healthcare</div>
                        <div style="font-size: 14px; opacity: 0.92; margin-top: 6px;">Hệ Thống Đặt Lịch & Chăm Sóc Y Tế Thông Minh</div>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px;">
                        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Xin chào %s,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                          Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>MedSched</strong>. Để hoàn tất quy trình kích hoạt tài khoản và bảo vệ an toàn thông tin, vui lòng nhập mã xác thực OTP 4 chữ số dưới đây:
                        </p>
                        
                        <!-- OTP Box -->
                        <div style="background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                          <div style="font-size: 12px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">MÃ XÁC THỰC OTP CỦA BẠN</div>
                          <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0f766e; font-family: 'Consolas', 'Courier New', monospace; padding-left: 12px;">%s</div>
                        </div>
                        
                        <!-- Notice Box -->
                        <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; border-radius: 6px; padding: 14px 16px; margin: 24px 0; font-size: 13px; color: #334155; line-height: 1.6;">
                          ⏱️ <strong>Thời gian hiệu lực:</strong> Mã này có giá trị trong vòng <strong>2 phút (120 giây)</strong>.<br>
                          🔒 <strong>Nguyên tắc an toàn:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên y tế hoặc tổng đài viên.
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
                          Nếu bạn không thực hiện yêu cầu đăng ký này, hãy bỏ qua email này hoặc thông báo cho chúng tôi để được hỗ trợ.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        © 2026 <strong>MedSched</strong>. All rights reserved.<br>
                        Đây là email tự động gửi từ hệ thống máy chủ, vui lòng không phản hồi trực tiếp.
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(safeName, otpCode);
    }
}
