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

    /**
     * Gửi email nhắc lịch khám trước 24 giờ (REQ-NOTI-02 trong SRS Chương 5) bất đồng bộ.
     */
    @Async
    public void sendAppointmentReminderEmail(String toEmail, String recipientName, String bookingCode,
                                            String doctorName, String specialtyName, String appointmentTime,
                                            String medicalCenterName, String address) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        String subject = "[MedSched] Nhắc hẹn: Bạn có lịch khám bệnh vào ngày mai (" + appointmentTime + ")";
        String htmlContent = buildAppointmentReminderHtmlTemplate(safeName, bookingCode, doctorName, specialtyName,
                appointmentTime, medicalCenterName, address);

        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            boolean brevoSuccess = sendViaBrevoHttpApi(toEmail, safeName, subject, htmlContent, bookingCode);
            if (brevoSuccess) {
                return;
            }
            log.warn("⚠️ [EmailService] Gửi email nhắc hẹn qua Brevo thất bại, chuyển sang Gmail SMTP...");
        }

        sendViaSmtp(toEmail, subject, htmlContent, bookingCode);
    }

    private String buildAppointmentReminderHtmlTemplate(String recipientName, String bookingCode,
                                                        String doctorName, String specialtyName,
                                                        String appointmentTime, String medicalCenterName,
                                                        String address) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        String safeDoctor = (doctorName == null || doctorName.isBlank()) ? "Bác sĩ chuyên khoa" : doctorName.trim();
        String safeSpecialty = (specialtyName == null || specialtyName.isBlank()) ? "Đa khoa" : specialtyName.trim();
        String safeCenter = (medicalCenterName == null || medicalCenterName.isBlank()) ? "Phòng khám MedSched" : medicalCenterName.trim();
        String safeAddress = (address == null || address.isBlank()) ? "TP. Hồ Chí Minh" : address.trim();

        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Nhắc hẹn lịch khám bệnh - MedSched</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #0284c7 0%%, #0369a1 100%%); padding: 32px 24px; text-align: center; color: #ffffff;">
                        <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">MedSched Smart Healthcare</div>
                        <div style="font-size: 14px; opacity: 0.92; margin-top: 6px;">Thông Báo Nhắc Hẹn Lịch Khám Bệnh Tự Động</div>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px;">
                        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Xin chào %s,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                          Hệ thống xin trân trọng thông báo bạn có một lịch hẹn khám bệnh sắp diễn ra vào <strong>ngày mai</strong>. Dưới đây là thông tin chi tiết ca khám:
                        </p>
                        
                        <!-- Appointment Card -->
                        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 20px 0;">
                          <table width="100%%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #1e293b;">
                            <tr>
                              <td width="35%%" style="color: #64748b; font-weight: 600;">Mã lịch hẹn:</td>
                              <td style="font-weight: 800; color: #0284c7; font-size: 16px; font-family: monospace;">%s</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">Thời gian khám:</td>
                              <td style="font-weight: 700; color: #0f172a;">%s</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">Bác sĩ phụ trách:</td>
                              <td style="font-weight: 600;">%s (%s)</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">Cơ sở khám:</td>
                              <td style="font-weight: 600;">%s</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-weight: 600;">Địa chỉ:</td>
                              <td style="color: #475569;">%s</td>
                            </tr>
                          </table>
                        </div>
                        
                        <!-- Important Guidelines -->
                        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #78350f; line-height: 1.6;">
                          📌 <strong>Lưu ý quan trọng cho bệnh nhân:</strong><br>
                          • Vui lòng có mặt tại <strong>Quầy tiếp đón trước 15 phút</strong> so với giờ hẹn.<br>
                          • Chuẩn bị sẵn <strong>Mã lịch hẹn</strong> hoặc mã QR để quét Check-in nhanh.<br>
                          • Nếu cần đổi hoặc hủy lịch, vui lòng thao tác trên ứng dụng trước giờ hẹn tối thiểu 2 giờ.
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
                          Chúc bạn có một buổi thăm khám thuận lợi và nhiều sức khỏe!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        © 2026 <strong>MedSched Smart Healthcare</strong>. Hệ thống hỗ trợ y tế thông minh.<br>
                        Email này được gửi tự động bởi tính năng nhắc hẹn định kỳ (REQ-NOTI-02).
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(safeName, bookingCode, appointmentTime, safeDoctor, safeSpecialty, safeCenter, safeAddress);
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

    /**
     * Gửi email mã OTP / Token khôi phục mật khẩu (REQ-AUTH-05 trong SRS Chương 5) bất đồng bộ.
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String recipientName, String resetToken, String otpCode) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        String subject = "[MedSched] Yêu cầu đặt lại mật khẩu tài khoản của bạn";
        String htmlContent = buildPasswordResetHtmlTemplate(safeName, resetToken);

        // 1. Gửi qua Brevo HTTP API
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            boolean brevoSuccess = sendViaBrevoHttpApi(toEmail, safeName, subject, htmlContent, "MAGIC_LINK");
            if (brevoSuccess) {
                return;
            }
            log.warn("⚠️ [EmailService] Gửi qua Brevo HTTP API thất bại, chuyển sang thử Gmail SMTP...");
        }

        // 2. Fallback: Gửi qua JavaMailSender (SMTP)
        sendViaSmtp(toEmail, subject, htmlContent, "MAGIC_LINK");
    }

    private String buildPasswordResetHtmlTemplate(String recipientName, String resetToken) {
        String safeName = (recipientName == null || recipientName.isBlank()) ? "Quý khách" : recipientName.trim();
        String resetUrl = "https://medsched-lyart.vercel.app/reset-password?token=" + resetToken;

        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Đặt lại mật khẩu MedSched</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #2563eb 0%%, #1d4ed8 100%%); padding: 32px 24px; text-align: center; color: #ffffff;">
                        <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">MedSched Smart Healthcare</div>
                        <div style="font-size: 14px; opacity: 0.92; margin-top: 6px;">Yêu Cầu Đặt Lại Mật Khẩu Tài Khoản</div>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px 28px;">
                        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Xin chào %s,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                          Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này. Vui lòng bấm vào nút bên dưới để tiến hành thiết lập mật khẩu mới (liên kết bảo mật có thời hạn trong <strong>15 phút</strong>):
                        </p>
                        
                        <!-- Action Button -->
                        <div style="text-align: center; margin: 28px 0;">
                          <a href="%s" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                            ĐẶT LẠI MẬT KHẨU NGAY
                          </a>
                        </div>

                        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; text-align: center;">
                          Nếu nút bấm trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:<br>
                          <a href="%s" style="color: #2563eb; word-break: break-all; font-size: 12px;">%s</a>
                        </p>
                        
                        <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #64748b; line-height: 1.5;">
                          🔒 <strong>Bảo mật tài khoản:</strong> Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ an toàn tuyệt đối.
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        © 2026 <strong>MedSched Smart Healthcare</strong>. All rights reserved.<br>
                        Email này được gửi tự động bởi hệ thống khôi phục tài khoản (REQ-AUTH-05).
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(safeName, resetUrl, resetUrl, resetUrl);
    }
}
