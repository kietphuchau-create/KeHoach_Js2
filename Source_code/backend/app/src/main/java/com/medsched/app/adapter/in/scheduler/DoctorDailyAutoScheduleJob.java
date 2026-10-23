package com.medsched.app.adapter.in.scheduler;

import com.medsched.doctor.DoctorScheduleDtos;
import com.medsched.doctor.DoctorScheduleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tác vụ định kỳ tự động xếp lịch trực cho toàn bộ Bác sĩ 7 ngày (1 tuần) tới lúc 17:00:00 hằng ngày.
 * Logic: Tự động đảm bảo 7 ngày tới luôn có đầy đủ ca trực chuẩn cho toàn bộ Bác sĩ.
 */
@Component
public class DoctorDailyAutoScheduleJob {

    private static final Logger log = LoggerFactory.getLogger(DoctorDailyAutoScheduleJob.class);

    private final DoctorScheduleService doctorScheduleService;

    public DoctorDailyAutoScheduleJob(DoctorScheduleService doctorScheduleService) {
        this.doctorScheduleService = doctorScheduleService;
    }

    /**
     * Tự động chạy đúng 17:00:00 hằng ngày (Múi giờ Asia/Ho_Chi_Minh).
     * Tự động quét và đảm bảo lịch trực cho toàn bộ Bác sĩ trong 7 ngày (1 tuần) tới.
     */
    @Scheduled(cron = "0 0 17 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDailyAutoScheduleAt17h() {
        if (!doctorScheduleService.isAutoScheduleEnabled()) {
            log.info("ℹ️ [CRON 17:00] Chế độ Bác Sĩ Tự Đặt Lịch Thủ Công đang BẬT. Bỏ qua tác vụ tự động sinh lịch.");
            return;
        }
        log.info("⏰ [CRON 17:00] Bắt đầu kích hoạt tự động xếp lịch trực 7 ngày (1 tuần) tới cho toàn bộ Bác sĩ...");
        try {
            DoctorScheduleDtos.AutoScheduleResultDto result =
                    doctorScheduleService.autoGenerateScheduleForNextNDays(7);
            log.info("✅ [CRON 17:00] Hoàn tất tự động xếp lịch 7 ngày tới: {}", result.message());
        } catch (Exception e) {
            log.error("❌ [CRON 17:00] Lỗi khi tự động xếp lịch 7 ngày tới:", e);
        }
    }

    /**
     * Tự động kiểm tra ngay khi ứng dụng khởi động (ApplicationReadyEvent).
     * Đảm bảo toàn bộ 7 ngày tới luôn có lịch trực đầy đủ cho toàn bộ Bác sĩ trong viện.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onStartupCheckAutoSchedule() {
        if (!doctorScheduleService.isAutoScheduleEnabled()) {
            log.info("ℹ️ [STARTUP CHECK] Chế độ Bác Sĩ Tự Đặt Lịch Thủ Công đang BẬT. Bỏ qua tự động sinh lịch lúc khởi động.");
            return;
        }
        log.info("🚀 [STARTUP CHECK] Tự động rà soát và sinh lịch trực 7 ngày (1 tuần) tới cho toàn bộ Bác sĩ...");
        try {
            DoctorScheduleDtos.AutoScheduleResultDto result =
                    doctorScheduleService.autoGenerateScheduleForNextNDays(7);
            log.info("✅ [STARTUP CHECK] Hoàn tất rà soát lịch trực 7 ngày tới: {}", result.message());
        } catch (Exception e) {
            log.error("❌ [STARTUP CHECK] Lỗi khi tự động xếp lịch 7 ngày tới:", e);
        }
    }
}
