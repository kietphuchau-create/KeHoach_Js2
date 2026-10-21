package com.medsched.doctor;

import com.medsched.persistence.entity.*;
import com.medsched.persistence.enums.ScheduleStatus;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DoctorScheduleServiceTest {

    private static final java.time.ZoneId VN_ZONE = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private DoctorScheduleJpaRepository doctorScheduleRepository;
    @Mock
    private TimeSlotJpaRepository timeSlotRepository;
    @Mock
    private DoctorJpaRepository doctorRepository;
    @Mock
    private UserJpaRepository userJpaRepository;

    private DoctorScheduleService doctorScheduleService;

    @BeforeEach
    void setUp() {
        doctorScheduleService = new DoctorScheduleService(
                doctorScheduleRepository, timeSlotRepository, doctorRepository, userJpaRepository
        );
    }

    @Test
    @DisplayName("Lấy danh sách ca trực của bác sĩ và tự động tạo lịch hôm nay nếu chưa có")
    void givenDoctor_whenGetDoctorSchedules_thenReturnList() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        LocalDate today = LocalDate.now(VN_ZONE);
        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-1", "doc-1", today, LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorRepository.findByUserId("u-doc-1")).willReturn(List.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-1", today)).willReturn(List.of(sch));
        given(doctorScheduleRepository.findByDoctorIdOrderByWorkDateAscStartTimeAsc("doc-1")).willReturn(List.of(sch));
        given(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc("sch-1")).willReturn(List.of());

        var res = doctorScheduleService.getDoctorSchedules("u-doc-1", null, null, null);

        assertThat(res).hasSize(1);
        assertThat(res.get(0).id()).isEqualTo("sch-1");
    }

    @Test
    @DisplayName("Đăng ký ca trực mới thành công và sinh các time slots")
    void givenValidRequest_whenCreateSchedule_thenSaveScheduleAndSlots() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        LocalDate validWorkDate = LocalDate.now(VN_ZONE).plusDays(1);
        while (validWorkDate.getDayOfWeek() == java.time.DayOfWeek.SATURDAY || validWorkDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            validWorkDate = validWorkDate.plusDays(1);
        }

        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-1", validWorkDate)).willReturn(List.of());
        given(doctorScheduleRepository.findByWorkDate(validWorkDate)).willReturn(List.of());
        given(doctorScheduleRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var req = new DoctorScheduleDtos.CreateScheduleRequest(
                "doc-1",
                validWorkDate,
                LocalTime.of(8, 0),
                LocalTime.of(10, 0),
                30,
                "P.101"
        );

        var res = doctorScheduleService.createSchedule("u-doc-1", req);

        assertThat(res).isNotNull();
        verify(doctorScheduleRepository).save(any());
        verify(timeSlotRepository).saveAll(any());
    }

    @Test
    @DisplayName("Khóa hoặc mở khóa time slot khám")
    void givenSlot_whenToggleSlotStatus_thenStatusChanges() {
        Instant now = Instant.now();
        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-1", "sch-1", "doc-1",
                now.plusSeconds(3600), now.plusSeconds(5400),
                SlotStatus.AVAILABLE, now, now
        );

        given(timeSlotRepository.findById("slot-1")).willReturn(Optional.of(slot));
        given(timeSlotRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var res = doctorScheduleService.toggleSlotStatus("slot-1");

        assertThat(res.status()).isEqualTo("LOCKED");
    }

    @Test
    @DisplayName("Xóa ca trực khi chưa có bệnh nhân nào đặt lịch")
    void givenUnbookedSchedule_whenDeleteSchedule_thenDeleteSuccess() {
        Instant now = Instant.now();
        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-del", "doc-1", LocalDate.now(VN_ZONE), LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorScheduleRepository.findById("sch-del")).willReturn(Optional.of(sch));
        given(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc("sch-del")).willReturn(List.of());

        doctorScheduleService.deleteSchedule("sch-del");

        verify(doctorScheduleRepository).delete(sch);
    }

    @Test
    @DisplayName("CLAB-113: Khóa đổi buồng khám khi đã bước sang ngày khám mới (hôm nay)")
    void givenScheduleToday_whenChangeScheduleRoom_thenThrowsIllegalArgumentException() {
        Instant now = Instant.now();
        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-today", "doc-1", LocalDate.now(VN_ZONE), LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorScheduleRepository.findById("sch-today")).willReturn(Optional.of(sch));

        var req = new DoctorScheduleDtos.ChangeScheduleRoomRequest("P.209");

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> doctorScheduleService.changeScheduleRoom("u-doc-1", "sch-today", req)
        );
    }

    @Test
    @DisplayName("CLAB-113: Đổi buồng khám thành công khi đổi trước 1 ngày (ngày mai trở đi)")
    void givenScheduleTomorrow_whenChangeScheduleRoom_thenSuccess() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                java.math.BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );
        LocalDate tomorrow = LocalDate.now(VN_ZONE).plusDays(1);
        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-tomorrow", "doc-1", tomorrow, LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorScheduleRepository.findById("sch-tomorrow")).willReturn(Optional.of(sch));
        given(doctorRepository.findByUserId("u-doc-1")).willReturn(List.of(doc));
        given(doctorScheduleRepository.findByWorkDate(tomorrow)).willReturn(List.of(sch));
        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc("sch-tomorrow")).willReturn(List.of());

        var req = new DoctorScheduleDtos.ChangeScheduleRoomRequest("P.205");

        var res = doctorScheduleService.changeScheduleRoom("u-doc-1", "sch-tomorrow", req);

        assertThat(res).isNotNull();
        assertThat(res.roomNumber()).isEqualTo("P.205");
        verify(doctorRepository).save(doc);
    }
}
