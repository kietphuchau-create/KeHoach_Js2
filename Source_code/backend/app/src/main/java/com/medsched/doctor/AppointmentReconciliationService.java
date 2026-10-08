package com.medsched.doctor;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Dịch vụ Tự Động Kết Toán Hàng Đợi Ca Khám (End-of-Day Reconciliation).
 * Giải quyết triệt để lỗi logic: Bệnh nhân check-in nhưng hết ca trực / qua ngày mới
 * bị treo vĩnh viễn ở trạng thái CHECKED_IN hoặc IN_PROGRESS.
 *
 * Tự động chuyển các ca khám dở dang của các ngày trước sang MISSED_NO_SHOW (Bỏ hẹn/Hết ca trực),
 * đảm bảo CSDL sạch sẽ, hàng đợi hôm nay không bị lẫn ca cũ, và phân hệ Thống kê phản ánh đúng tỷ lệ no-show.
 */
@Service
public class AppointmentReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentReconciliationService.class);
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AppointmentJpaRepository appointmentRepo;

    public AppointmentReconciliationService(AppointmentJpaRepository appointmentRepo) {
        this.appointmentRepo = appointmentRepo;
    }

    /**
     * Chạy ngay khi ứng dụng khởi động để dọn dẹp các ca cũ bị treo từ trước.
     */
    @PostConstruct
    public void onStartup() {
        log.info("Khởi động AppointmentReconciliationService: Rà soát ca khám dở dang từ các ngày trước...");
        reconcileStaleAppointments();
    }

    /**
     * Tự động chạy mỗi đêm lúc 23:59:00 để đóng các ca khám chưa hoàn tất của ngày hôm đó.
     */
    @Scheduled(cron = "0 59 23 * * *", zone = "Asia/Ho_Chi_Minh")
    public void scheduleDailyReconciliation() {
        log.info("Chạy tác vụ định kỳ 23:59 kết toán ca khám cuối ngày...");
        reconcileStaleAppointments();
    }

    /**
     * Tự động chạy mỗi 15 phút để kiểm tra định kỳ trong ngày.
     */
    @Scheduled(fixedDelay = 900000)
    public void schedulePeriodicCheck() {
        reconcileStaleAppointments();
    }

    /**
     * Logic kết toán: Quét tất cả ca CHECKED_IN, IN_PROGRESS, WAITING_FOR_LAB_RESULTS
     * có thời gian diễn ra TRƯỚC ngày hôm nay -> Chuyển sang MISSED_NO_SHOW.
     */
    @Transactional
    public int reconcileStaleAppointments() {
        LocalDate today = LocalDate.now(VN_ZONE);
        Instant startOfToday = today.atStartOfDay(VN_ZONE).toInstant();

        List<AppointmentEntity> staleAppointments = appointmentRepo.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CHECKED_IN
                        || a.getStatus() == AppointmentStatus.IN_PROGRESS
                        || a.getStatus() == AppointmentStatus.WAITING_FOR_LAB_RESULTS
                        || a.getStatus() == AppointmentStatus.CONFIRMED)
                .filter(a -> {
                    Instant apptTime = a.getCheckInTime() != null ? a.getCheckInTime() : a.getCreatedAt();
                    return apptTime != null && apptTime.isBefore(startOfToday);
                })
                .toList();

        if (staleAppointments.isEmpty()) {
            return 0;
        }

        int count = 0;
        Instant now = Instant.now();
        for (AppointmentEntity appt : staleAppointments) {
            log.info("Tự động đóng ca khám quá hạn [Mã: {}, Bác sĩ: {}] từ {} sang MISSED_NO_SHOW",
                    appt.getBookingCode(), appt.getDoctorId(), appt.getStatus());
            appt.setStatus(AppointmentStatus.MISSED_NO_SHOW);
            appt.setUpdatedAt(now);
            appointmentRepo.save(appt);
            count++;
        }

        log.info("Đã hoàn tất tự động kết toán {} ca khám quá hạn từ các ca trực trước.", count);
        return count;
    }
}
