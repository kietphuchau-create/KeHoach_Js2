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
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
    @Mock
    private SpecialtyJpaRepository specialtyJpaRepository;

    private DoctorScheduleService doctorScheduleService;

    @BeforeEach
    void setUp() {
        doctorScheduleService = new DoctorScheduleService(
                doctorScheduleRepository, timeSlotRepository, doctorRepository, userJpaRepository
        );
        doctorScheduleService.setSpecialtyJpaRepository(specialtyJpaRepository);
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
        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorScheduleRepository.findByDoctorIdInAndWorkDateBetween(List.of("doc-1"), today, today)).willReturn(List.of(sch));
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

    @Test
    @DisplayName("Buồng khám cùng tên P.101 ở 2 chi nhánh khác nhau không bị xung đột")
    void crossBranch_sameRoomNumber_noConflict() {
        Instant now = Instant.now();
        DoctorEntity docBranch1 = new DoctorEntity(
                "doc-b1", "u-doc-1", "spec-b1", "BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );
        DoctorEntity docBranch2 = new DoctorEntity(
                "doc-b2", "u-doc-2", "spec-b2", "BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        LocalDate validWorkDate = LocalDate.now(VN_ZONE).plusDays(1);
        while (validWorkDate.getDayOfWeek() == java.time.DayOfWeek.SATURDAY || validWorkDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            validWorkDate = validWorkDate.plusDays(1);
        }

        SpecialtyEntity spec1 = new SpecialtyEntity("spec-b1", "branch-01", "Nội", "NOI", null, null, now, now);
        SpecialtyEntity spec2 = new SpecialtyEntity("spec-b2", "branch-02", "Ngoại", "NGOAI", null, null, now, now);

        given(specialtyJpaRepository.findById("spec-b1")).willReturn(Optional.of(spec1));
        given(specialtyJpaRepository.findById("spec-b2")).willReturn(Optional.of(spec2));

        DoctorScheduleEntity existingSchBranch2 = new DoctorScheduleEntity(
                "sch-b2", "doc-b2", validWorkDate, LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorRepository.findById("doc-b1")).willReturn(Optional.of(docBranch1));
        given(doctorRepository.findById("doc-b2")).willReturn(Optional.of(docBranch2));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-b1", validWorkDate)).willReturn(List.of());
        given(doctorScheduleRepository.findByWorkDate(validWorkDate)).willReturn(List.of(existingSchBranch2));
        given(doctorScheduleRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var req = new DoctorScheduleDtos.CreateScheduleRequest(
                "doc-b1",
                validWorkDate,
                LocalTime.of(8, 0),
                LocalTime.of(10, 0),
                30,
                "P.101"
        );

        var res = doctorScheduleService.createSchedule("u-doc-1", req);
        assertThat(res).isNotNull();
        verify(doctorScheduleRepository).save(any());
    }

    @Test
    @DisplayName("Quản trị viên (Admin) có thẩm quyền phân công ca trực trong ngày hôm nay")
    void givenAdminUser_whenCreateScheduleToday_thenSuccess() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );

        LocalDate today = LocalDate.now(VN_ZONE);
        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-1", today)).willReturn(List.of());
        given(doctorScheduleRepository.findByWorkDate(today)).willReturn(List.of());
        given(doctorScheduleRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var req = new DoctorScheduleDtos.CreateScheduleRequest(
                "doc-1",
                today,
                LocalTime.of(8, 0),
                LocalTime.of(12, 0),
                30,
                "P.101"
        );

        var res = doctorScheduleService.createSchedule("u-admin-1", req);

        assertThat(res).isNotNull();
        assertThat(res.workDate()).isEqualTo(today);
    }

    @Test
    @DisplayName("Hỗ trợ đăng ký ca tối (17:30 - 20:30) cho Bác sĩ")
    void givenEveningShift_whenCreateSchedule_thenSuccess() {
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
                LocalTime.of(17, 30),
                LocalTime.of(20, 30),
                30,
                "P.101"
        );

        var res = doctorScheduleService.createSchedule("u-doc-1", req);

        assertThat(res).isNotNull();
        assertThat(res.startTime()).isEqualTo("17:30");
        assertThat(res.endTime()).isEqualTo("20:30");
    }

    @Test
    @DisplayName("Admin có quyền điều phối đổi buồng khám khẩn cấp ngay trong ngày hôm nay")
    void givenAdminUser_whenEmergencyChangeScheduleRoomToday_thenSuccess() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );
        LocalDate today = LocalDate.now(VN_ZONE);
        DoctorScheduleEntity sch = new DoctorScheduleEntity(
                "sch-emergency", "doc-1", today, LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorScheduleRepository.findById("sch-emergency")).willReturn(Optional.of(sch));
        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorScheduleRepository.findByWorkDate(today)).willReturn(List.of(sch));
        given(doctorRepository.save(any())).willAnswer(inv -> inv.getArgument(0));
        given(timeSlotRepository.findByScheduleIdOrderByStartTimeAsc("sch-emergency")).willReturn(List.of());

        var req = new DoctorScheduleDtos.ChangeScheduleRoomRequest("P.205");

        var res = doctorScheduleService.changeScheduleRoom("u-admin-1", "sch-emergency", req);

        assertThat(res).isNotNull();
        assertThat(res.roomNumber()).isEqualTo("P.205");
        verify(doctorRepository).save(doc);
    }

    @Test
    @DisplayName("Bác sĩ không được chuyển sang đăng ký ngày tiếp theo nếu ngày trước đó chưa đạt tối thiểu 6 tiếng")
    void givenDoctorUser_whenCreateScheduleOnDay2WhileDay1Under6Hours_thenThrowException() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );
        LocalDate today = LocalDate.now(VN_ZONE);
        LocalDate day1 = today.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDate day2 = day1.plusDays(1); // Tuesday

        // Ngày 1 mới có 4 tiếng (08:00 - 12:00 = 240 phút)
        DoctorScheduleEntity day1Schedule = new DoctorScheduleEntity(
                "sch-day1", "doc-1", day1, LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(
                eq("doc-1"), any(), any()
        )).willReturn(List.of(day1Schedule));

        var reqDay2 = new DoctorScheduleDtos.CreateScheduleRequest(
                "doc-1", day2, LocalTime.of(8, 0), LocalTime.of(12, 0), 30, "P.101"
        );

        assertThatThrownBy(() -> doctorScheduleService.createSchedule("u-doc-1", reqDay2))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tối thiểu 6 tiếng làm việc")
                .hasMessageContaining("mới đạt 4.0 tiếng, còn thiếu 2.0 tiếng");
    }

    @Test
    @DisplayName("Bác sĩ được phép đăng ký ngày tiếp theo khi các ngày trước đó đã hoàn thành tối thiểu 6 tiếng")
    void givenDoctorUser_whenCreateScheduleOnDay2WhileDay1Has6Hours_thenSuccess() {
        Instant now = Instant.now();
        DoctorEntity doc = new DoctorEntity(
                "doc-1", "u-doc-1", "spec-1", "ThS.BS",
                BigDecimal.valueOf(300000), "P.101", "Bio", null, now, now
        );
        LocalDate today = LocalDate.now(VN_ZONE);
        LocalDate day1 = today.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDate day2 = day1.plusDays(1); // Tuesday

        // Ngày 1 đã có 7.5 tiếng (08:00 - 12:00 = 4h và 13:30 - 17:00 = 3.5h)
        DoctorScheduleEntity day1Morning = new DoctorScheduleEntity(
                "sch-m", "doc-1", day1, LocalTime.of(8, 0),
                LocalTime.of(12, 0), 30, ScheduleStatus.ACTIVE, now, now
        );
        DoctorScheduleEntity day1Afternoon = new DoctorScheduleEntity(
                "sch-a", "doc-1", day1, LocalTime.of(13, 30),
                LocalTime.of(17, 0), 30, ScheduleStatus.ACTIVE, now, now
        );

        given(doctorRepository.findById("doc-1")).willReturn(Optional.of(doc));
        given(doctorRepository.findByUserId("u-doc-1")).willReturn(List.of(doc));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(
                eq("doc-1"), any(), any()
        )).willReturn(List.of(day1Morning, day1Afternoon));
        given(doctorScheduleRepository.findByDoctorIdAndWorkDate("doc-1", day2)).willReturn(List.of());
        given(doctorScheduleRepository.findByWorkDate(day2)).willReturn(List.of());
        given(doctorScheduleRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

        var reqDay2 = new DoctorScheduleDtos.CreateScheduleRequest(
                "doc-1", day2, LocalTime.of(8, 0), LocalTime.of(12, 0), 30, "P.101"
        );

        var res = doctorScheduleService.createSchedule("u-doc-1", reqDay2);
        assertThat(res).isNotNull();
        assertThat(res.workDate()).isEqualTo(day2.toString());
    }
}
