package com.medsched.app.adapter;

import com.medsched.app.adapter.out.ai.RuleBasedAiTriageAdapter;
import com.medsched.app.adapter.out.persistence.AccountPersistenceAdapter;
import com.medsched.app.adapter.out.persistence.AppointmentRepositoryAdapter;
import com.medsched.app.adapter.out.persistence.TimeSlotRepositoryAdapter;
import com.medsched.app.adapter.out.security.SecurityPasswordEncoderAdapter;
import com.medsched.core.domain.model.Appointment;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdaptersTest {

    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UserJpaRepository userRepo;
    @Mock
    private AppointmentJpaRepository appointmentRepo;
    @Mock
    private TimeSlotJpaRepository timeSlotRepo;

    @Test
    @DisplayName("SecurityPasswordEncoderAdapter: kiểm tra mã hóa và khớp mật khẩu")
    void testSecurityPasswordEncoderAdapter() {
        given(passwordEncoder.encode("secret")).willReturn("hash-secret");
        given(passwordEncoder.matches("secret", "hash-secret")).willReturn(true);

        SecurityPasswordEncoderAdapter adapter = new SecurityPasswordEncoderAdapter(passwordEncoder);
        assertThat(adapter.encode("secret")).isEqualTo("hash-secret");
        assertThat(adapter.matches("secret", "hash-secret")).isTrue();
    }

    @Test
    @DisplayName("AccountPersistenceAdapter: lưu mật khẩu và cập nhật hồ sơ người dùng")
    void testAccountPersistenceAdapter() {
        Instant now = Instant.now();
        UserEntity user = new UserEntity(
                "u-1", "u1@test.com", "hash", "User 1", "0900000000", true, now, now
        );

        given(userRepo.findById("u-1")).willReturn(Optional.of(user));
        given(userRepo.save(any())).willAnswer(inv -> inv.getArgument(0));

        AccountPersistenceAdapter adapter = new AccountPersistenceAdapter(userRepo);
        var opt = adapter.findById("u-1");
        assertThat(opt).isPresent();

        var updated = adapter.saveProfile("u-1", "User One", "0909090909");
        assertThat(updated.fullName()).isEqualTo("User One");

        adapter.savePasswordHash("u-1", "new-hash");
        verify(userRepo, times(2)).save(any());
    }

    @Test
    @DisplayName("AppointmentRepositoryAdapter: lưu và tìm kiếm cuộc hẹn")
    void testAppointmentRepositoryAdapter() {
        Instant now = Instant.now();
        AppointmentEntity entity = new AppointmentEntity(
                "app-1", "MED-111", "c-1", "p-1", "doc-1", "slot-1",
                "01", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.CONFIRMED,
                now, now
        );

        given(appointmentRepo.findById("app-1")).willReturn(Optional.of(entity));
        given(appointmentRepo.findByBookingCode("MED-111")).willReturn(Optional.of(entity));
        given(appointmentRepo.findByPatientProfileIdOrderByCreatedAtDesc("p-1")).willReturn(List.of(entity));
        given(appointmentRepo.save(any())).willAnswer(inv -> inv.getArgument(0));

        AppointmentRepositoryAdapter adapter = new AppointmentRepositoryAdapter(appointmentRepo);
        assertThat(adapter.findById("app-1")).isPresent();
        assertThat(adapter.findByBookingCode("MED-111")).isPresent();
        assertThat(adapter.findByPatientProfileId("p-1")).hasSize(1);

        Appointment domain = new Appointment(
                "app-1", "MED-111", "c-1", "p-1", "doc-1", "slot-1", "01",
                "ONLINE_BOOKED", "Dau dau", null, "QR_CODE", "CONFIRMED",
                false, 0, Instant.now(), Instant.now(), Instant.now()
        );
        var saved = adapter.save(domain);
        assertThat(saved.bookingCode()).isEqualTo("MED-111");
    }

    @Test
    @DisplayName("TimeSlotRepositoryAdapter: khóa và nhả time slot")
    void testTimeSlotRepositoryAdapter() {
        Instant now = Instant.now();
        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-1", "sch-1", "doc-1", now, now.plusSeconds(1800),
                SlotStatus.AVAILABLE, now, now
        );

        given(timeSlotRepo.findById("slot-1")).willReturn(Optional.of(slot));
        given(timeSlotRepo.compareAndSetStatus("slot-1", SlotStatus.AVAILABLE, SlotStatus.BOOKED)).willReturn(1);
        given(timeSlotRepo.compareAndSetStatus("slot-1", SlotStatus.BOOKED, SlotStatus.AVAILABLE)).willReturn(1);

        TimeSlotRepositoryAdapter adapter = new TimeSlotRepositoryAdapter(timeSlotRepo);
        assertThat(adapter.findById("slot-1")).isPresent();
        assertThat(adapter.lockSlot("slot-1")).isTrue();
        assertThat(adapter.releaseSlot("slot-1")).isTrue();
    }

    @Test
    @DisplayName("TimeSlotRepositoryAdapter: slot không tồn tại không được tự sinh dữ liệu giả")
    void missingSlotIsNotAutoCreated() {
        given(timeSlotRepo.findById("missing-slot")).willReturn(Optional.empty());

        TimeSlotRepositoryAdapter adapter = new TimeSlotRepositoryAdapter(timeSlotRepo);

        assertThat(adapter.findById("missing-slot")).isEmpty();
    }

    @Test
    @DisplayName("RuleBasedAiTriageAdapter: phân loại chuyên khoa và tóm tắt triệu chứng")
    void testRuleBasedAiTriageAdapter() {
        RuleBasedAiTriageAdapter adapter = new RuleBasedAiTriageAdapter();
        assertThat(adapter.suggestSpecialty("Tôi bị mẩn ngứa và nổi mề đay")).isEqualTo("DERMATOLOGY");
        assertThat(adapter.suggestSpecialty("Đau răng nhức lợi")).isEqualTo("ODONTO_STOMATOLOGY");
        assertThat(adapter.suggestSpecialty("Đau mắt mờ mắt")).isEqualTo("OPHTHALMOLOGY");
        assertThat(adapter.suggestSpecialty("Đau bụng sốt")).isEqualTo("INTERNAL_MEDICINE");

        var eval = adapter.evaluateSymptoms("Đau bụng sốt", "Tiểu đường");
        assertThat(eval.specialtyCode()).isEqualTo("INTERNAL_MEDICINE");
        assertThat(eval.clinicalSummary()).contains("Đau bụng sốt");
    }
}
