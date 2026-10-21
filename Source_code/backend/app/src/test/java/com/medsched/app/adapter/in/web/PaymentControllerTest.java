package com.medsched.app.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.PaymentEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.PaymentMethod;
import com.medsched.persistence.enums.PaymentStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.PaymentJpaRepository;
import com.medsched.security.JwtAuthenticationFilter;
import com.medsched.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PaymentController.class)
@AutoConfigureMockMvc(addFilters = false)
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AppointmentJpaRepository appointmentJpaRepository;

    @MockBean
    private PaymentJpaRepository paymentJpaRepository;

    @MockBean
    private PayOsService payOsService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private AppointmentEntity createMockAppointment(String id, String bookingCode, AppointmentStatus status) {
        return new AppointmentEntity(
                id, bookingCode, "mc-1", "pp-1",
                "doc-1", "slot-1", "STT-01", com.medsched.persistence.enums.QueueType.ONLINE_BOOKED,
                "Triệu chứng", status, Instant.now(), Instant.now()
        );
    }

    @Test
    @DisplayName("Tạo yêu cầu thanh toán đặt cọc giữ chỗ 2.000đ thành công")
    void createPayment_deposit_success() throws Exception {
        AppointmentEntity app = createMockAppointment("app-1", "MED123456", AppointmentStatus.PENDING);
        given(appointmentJpaRepository.findById("app-1")).willReturn(Optional.of(app));

        PaymentController.CreatePaymentRequest req = new PaymentController.CreatePaymentRequest(
                "app-1", "MED123456", "DEPOSIT", new BigDecimal("2000"), "BANK_TRANSFER"
        );

        mockMvc.perform(post("/api/v1/payments/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appointmentId").value("app-1"))
                .andExpect(jsonPath("$.bookingCode").value("MED123456"))
                .andExpect(jsonPath("$.amount").value(2000))
                .andExpect(jsonPath("$.paymentType").value("DEPOSIT"))
                .andExpect(jsonPath("$.transferContent").value("MEDPAY MED123456"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(paymentJpaRepository).save(any(PaymentEntity.class));
    }

    @Test
    @DisplayName("Kiểm tra trạng thái thanh toán khi chưa có giao dịch thành công -> trả về PENDING")
    void checkStatus_pending() throws Exception {
        AppointmentEntity app = createMockAppointment("app-1", "MED123456", AppointmentStatus.PENDING);
        given(appointmentJpaRepository.findById("app-1")).willReturn(Optional.of(app));
        given(paymentJpaRepository.sumSucceededNetAmount("app-1")).willReturn(BigDecimal.ZERO);
        given(paymentJpaRepository.findByAppointmentId("app-1")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/payments/check-status")
                        .param("appointmentId", "app-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Xác nhận chuyển khoản đặt cọc 2.000đ -> cập nhật SUCCEEDED và ca khám sang CONFIRMED")
    void confirmPayment_deposit_success() throws Exception {
        AppointmentEntity app = createMockAppointment("app-1", "MED123456", AppointmentStatus.PENDING);
        given(appointmentJpaRepository.findByBookingCode("MED123456")).willReturn(Optional.of(app));
        given(paymentJpaRepository.findByAppointmentId("app-1")).willReturn(List.of());
        given(paymentJpaRepository.save(any(PaymentEntity.class))).willAnswer(inv -> inv.getArgument(0));

        PaymentController.ConfirmPaymentRequest req = new PaymentController.ConfirmPaymentRequest(
                null, "MED123456", "TXN123456", new BigDecimal("2000"), "DEPOSIT"
        );

        mockMvc.perform(post("/api/v1/payments/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"))
                .andExpect(jsonPath("$.bookingCode").value("MED123456"))
                .andExpect(jsonPath("$.amountPaid").value(2000))
                .andExpect(jsonPath("$.paymentType").value("DEPOSIT"));

        verify(appointmentJpaRepository).save(any(AppointmentEntity.class));
    }

    @Test
    @DisplayName("Xác nhận chuyển khoản với mã booking có dấu gạch ngang (MED-123456) vẫn tìm được ca khám")
    void confirmPayment_hyphenatedBookingCode_success() throws Exception {
        AppointmentEntity app = createMockAppointment("app-1", "MED-123456", AppointmentStatus.PENDING);
        given(appointmentJpaRepository.findByBookingCode("MED123456")).willReturn(Optional.empty());
        given(appointmentJpaRepository.findByBookingCode("MED-123456")).willReturn(Optional.of(app));
        given(paymentJpaRepository.findByAppointmentId("app-1")).willReturn(List.of());
        given(paymentJpaRepository.save(any(PaymentEntity.class))).willAnswer(inv -> inv.getArgument(0));

        PaymentController.ConfirmPaymentRequest req = new PaymentController.ConfirmPaymentRequest(
                null, "MED123456", "TXN9999", new BigDecimal("2000"), "DEPOSIT"
        );

        mockMvc.perform(post("/api/v1/payments/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.bookingCode").value("MED-123456"));
    }

    @Test
    @DisplayName("Mô phỏng Webhook ngân hàng báo biến động số dư thành công")
    void simulateBankWebhook_success() throws Exception {
        AppointmentEntity app = createMockAppointment("app-1", "MED123456", AppointmentStatus.PENDING);
        given(appointmentJpaRepository.findByBookingCode("MED123456")).willReturn(Optional.of(app));
        given(paymentJpaRepository.findByAppointmentId("app-1")).willReturn(List.of());

        mockMvc.perform(post("/api/v1/payments/webhook/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "bookingCode", "MED123456",
                                "amount", "2000"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.error").value(0))
                .andExpect(jsonPath("$.message").value("Webhook processed successfully"));

        verify(paymentJpaRepository).save(any(PaymentEntity.class));
        verify(appointmentJpaRepository).save(any(AppointmentEntity.class));
    }

    @Test
    @DisplayName("Xác nhận đặt cọc miễn phí 0đ khi dùng mã khuyến mãi dành cho giảng viên")
    void confirmPayment_promoFree_success() throws Exception {
        AppointmentEntity app = createMockAppointment("app-1", "MED123456", AppointmentStatus.PENDING);
        given(appointmentJpaRepository.findByBookingCode("MED123456")).willReturn(Optional.of(app));
        given(paymentJpaRepository.findByAppointmentId("app-1")).willReturn(List.of());
        given(paymentJpaRepository.save(any(PaymentEntity.class))).willAnswer(inv -> inv.getArgument(0));

        PaymentController.ConfirmPaymentRequest req = new PaymentController.ConfirmPaymentRequest(
                "app-1", "MED123456", null, BigDecimal.ZERO, "PROMO_FREE", "GIAOVIEN"
        );

        mockMvc.perform(post("/api/v1/payments/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"))
                .andExpect(jsonPath("$.amountPaid").value(0))
                .andExpect(jsonPath("$.paymentType").value("PROMO_FREE"))
                .andExpect(jsonPath("$.promoCode").value("GIAOVIEN"));

        verify(appointmentJpaRepository).save(any(AppointmentEntity.class));
    }
}
