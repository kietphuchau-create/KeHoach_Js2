package com.medsched.core.usecase;

import com.medsched.core.domain.exception.DomainException;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

class CheckinServiceTest {

    private InMemoryAppointmentRepo repo;
    private CheckinService service;

    @BeforeEach
    void setUp() {
        repo = new InMemoryAppointmentRepo();
        service = new CheckinService(repo);
    }

    @Test
    @DisplayName("Check-in QR thành công: Đổi status sang CHECKED_IN và ghi nhận checkInTime")
    void testCheckinQrSuccess() {
        Appointment app = Appointment.createNew(
                "app-1", "MED123456", "center-1", "patient-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Viêm họng cấp"
        );
        repo.save(app);

        CheckinUseCase.CheckinResult result = service.checkinByQrCode("MED123456");

        assertThat(result).isNotNull();
        assertThat(result.queueNumber()).isEqualTo("APP-1001");
        assertThat(result.status()).isEqualTo("CHECKED_IN");
        assertThat(result.message()).contains("Tiếp đón thành công");
        assertThat(result.checkInTime()).isNotNull();

        // Kiểm tra trong repo đã đổi status và method
        Appointment saved = repo.findByBookingCode("MED123456").orElseThrow();
        assertThat(saved.status()).isEqualTo("CHECKED_IN");
        assertThat(saved.checkinMethod()).isEqualTo("QR_CODE");
        assertThat(saved.checkInTime()).isNotNull();
    }

    @Test
    @DisplayName("Check-in QR idempotent: Quét lại mã đã check-in vẫn thành công và không ném lỗi")
    void testCheckinQrIdempotent() {
        Appointment app = Appointment.createNew(
                "app-1", "MED123456", "center-1", "patient-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Viêm họng cấp"
        ).checkIn("QR_CODE", Instant.now());
        repo.save(app);

        CheckinUseCase.CheckinResult result = service.checkinByQrCode("MED123456");

        assertThat(result).isNotNull();
        assertThat(result.queueNumber()).isEqualTo("APP-1001");
        assertThat(result.message()).contains("đã được tiếp đón trước đó");
    }

    @Test
    @DisplayName("Check-in QR thất bại khi không tìm thấy bookingCode -> ném ResourceNotFoundException")
    void testCheckinQrNotFound() {
        assertThatThrownBy(() -> service.checkinByQrCode("NON_EXISTENT_CODE"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("NON_EXISTENT_CODE");
    }

    @Test
    @DisplayName("Check-in QR thất bại khi bookingCode rỗng -> ném DomainException")
    void testCheckinQrEmptyCode() {
        assertThatThrownBy(() -> service.checkinByQrCode(""))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Mã đặt lịch không được để trống");
    }

    @Test
    @DisplayName("Check-in CCCD thành công cho khách vãng lai: Cấp số thứ tự dạng WLK-xxx")
    void testCheckinCccdSuccess() {
        CheckinUseCase.CheckinResult result = service.checkinByCccd("079201008899", "Nguyễn Văn A");

        assertThat(result).isNotNull();
        assertThat(result.queueNumber()).startsWith("WLK-");
        assertThat(result.status()).isEqualTo("WAITING");
        assertThat(result.message()).contains("Nguyễn Văn A", "079201008899");
    }

    @Test
    @DisplayName("Check-in CCCD thất bại khi thiếu số CCCD -> ném DomainException")
    void testCheckinCccdMissingNumber() {
        assertThatThrownBy(() -> service.checkinByCccd("", "Nguyễn Văn B"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Số thẻ CCCD không được để trống");
    }

    static class InMemoryAppointmentRepo implements AppointmentRepositoryPort {
        private final List<Appointment> list = new ArrayList<>();

        @Override
        public Appointment save(Appointment a) {
            list.removeIf(item -> item.id().equals(a.id()));
            list.add(a);
            return a;
        }

        @Override
        public Optional<Appointment> findById(String id) {
            return list.stream().filter(a -> a.id().equals(id)).findFirst();
        }

        @Override
        public Optional<Appointment> findByBookingCode(String bookingCode) {
            return list.stream().filter(a -> a.bookingCode().equalsIgnoreCase(bookingCode)).findFirst();
        }

        @Override
        public List<Appointment> findByPatientProfileId(String patientProfileId) {
            return list.stream().filter(a -> a.patientProfileId().equals(patientProfileId)).toList();
        }
    }
}
