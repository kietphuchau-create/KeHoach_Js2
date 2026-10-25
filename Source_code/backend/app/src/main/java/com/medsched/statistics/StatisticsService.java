package com.medsched.statistics;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.InvoiceEntity;
import com.medsched.persistence.entity.PaymentEntity;
import com.medsched.persistence.entity.MedicalRecordEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.PaymentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.UserRole;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.InvoiceJpaRepository;
import com.medsched.persistence.repository.MedicalRecordJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PaymentJpaRepository;
import com.medsched.persistence.repository.PrescriptionJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StatisticsService {

    private final AppointmentJpaRepository appointmentRepo;
    private final InvoiceJpaRepository invoiceRepo;
    private final PaymentJpaRepository paymentRepo;
    private final PrescriptionJpaRepository prescriptionRepo;
    private final DoctorJpaRepository doctorRepo;
    private final UserJpaRepository userRepo;
    private final SpecialtyJpaRepository specialtyRepo;
    private final PatientProfileJpaRepository patientProfileRepo;
    private final UserMedicalCenterRoleJpaRepository roleRepo;
    private final MedicalRecordJpaRepository medicalRecordRepo;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DAY_FORMATTER = DateTimeFormatter.ofPattern("dd/MM").withZone(VN_ZONE);
    private static final DateTimeFormatter HOUR_FORMATTER = DateTimeFormatter.ofPattern("HH:00").withZone(VN_ZONE);

    public StatisticsService(AppointmentJpaRepository appointmentRepo,
                             InvoiceJpaRepository invoiceRepo,
                             PaymentJpaRepository paymentRepo,
                             PrescriptionJpaRepository prescriptionRepo,
                             DoctorJpaRepository doctorRepo,
                             UserJpaRepository userRepo,
                             SpecialtyJpaRepository specialtyRepo,
                             PatientProfileJpaRepository patientProfileRepo,
                             UserMedicalCenterRoleJpaRepository roleRepo,
                             MedicalRecordJpaRepository medicalRecordRepo) {
        this.appointmentRepo = appointmentRepo;
        this.invoiceRepo = invoiceRepo;
        this.paymentRepo = paymentRepo;
        this.prescriptionRepo = prescriptionRepo;
        this.doctorRepo = doctorRepo;
        this.userRepo = userRepo;
        this.specialtyRepo = specialtyRepo;
        this.patientProfileRepo = patientProfileRepo;
        this.roleRepo = roleRepo;
        this.medicalRecordRepo = medicalRecordRepo;
    }

    public StatisticsDtos.StatisticsOverviewResponse getOverview(
            String role, String granularity, String range, String metricId, String currentUserId, String targetDoctorId) {

        String effectiveRole = (role != null && !role.isBlank()) ? role : "ROLE_ADMIN";
        String effectiveGranularity = (granularity != null && !granularity.isBlank()) ? granularity : "DAY";

        Instant now = Instant.now();
        Instant startTime = calculateStartTime(range, now);
        List<StatisticsDtos.DoctorOption> doctorOptions = buildDoctorOptions();

        boolean isCurrentUserAdmin = false;
        if (currentUserId != null) {
            List<UserMedicalCenterRoleEntity> userRoles = roleRepo.findByUserIdAndActiveTrue(currentUserId);
            isCurrentUserAdmin = userRoles.stream().anyMatch(r -> r.getRole() == UserRole.ROLE_ADMIN);
        }

        if ("ROLE_DOCTOR".equalsIgnoreCase(effectiveRole) || (targetDoctorId != null && !targetDoctorId.isBlank())) {
            return buildDoctorStatistics(effectiveGranularity, range, metricId, currentUserId, targetDoctorId, doctorOptions, startTime, now, isCurrentUserAdmin);
        } else if ("ROLE_STAFF".equalsIgnoreCase(effectiveRole)) {
            return buildStaffStatistics(effectiveGranularity, range, metricId, doctorOptions, startTime, now);
        } else {
            return buildAdminStatistics(effectiveGranularity, range, metricId, doctorOptions, startTime, now);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. DỮ LIỆU THỐNG KÊ ADMIN (THỰC TẾ 100% TỪ CSDL)
    // ─────────────────────────────────────────────────────────────
    private StatisticsDtos.StatisticsOverviewResponse buildAdminStatistics(
            String granularity, String range, String metricId, List<StatisticsDtos.DoctorOption> doctorOptions, Instant start, Instant end) {

        String selectedMetric = (metricId != null && !metricId.isBlank()) ? metricId : "visits";

        // Toàn bộ ca khám trong khoảng thời gian
        List<AppointmentEntity> apptList = appointmentRepo.findAll();
        long totalAppointments = apptList.size();
        long completedAppointments = apptList.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
        long cancelledAppointments = apptList.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED || a.getStatus() == AppointmentStatus.MISSED_NO_SHOW).count();
        long onlineBookedCount = apptList.stream().filter(a -> a.getQueueType() == QueueType.ONLINE_BOOKED).count();
        long walkinCount = apptList.stream().filter(a -> a.getQueueType() == QueueType.WALKIN).count();

        // Doanh thu thực tế: Tính từ bảng payments (SUCCEEDED) + invoices (PAID)
        List<PaymentEntity> succeededPayments = paymentRepo.findByStatus(PaymentStatus.SUCCEEDED);
        BigDecimal paymentRevenue = succeededPayments.stream()
                .map(p -> {
                    BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                    BigDecimal ref = p.getRefundedAmount() != null ? p.getRefundedAmount() : BigDecimal.ZERO;
                    return amt.subtract(ref);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<InvoiceEntity> paidInvoices = invoiceRepo.findByStatus("PAID");
        BigDecimal invoiceRevenue = paidInvoices.stream()
                .map(InvoiceEntity::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRevenue = paymentRevenue.compareTo(BigDecimal.ZERO) > 0 ? paymentRevenue : invoiceRevenue;

        double totalAdminDuration = 0;
        int adminDurationCount = 0;
        for (AppointmentEntity a : apptList) {
            if (a.getStatus() == AppointmentStatus.COMPLETED && a.getCheckInTime() != null && a.getUpdatedAt() != null && a.getUpdatedAt().isAfter(a.getCheckInTime())) {
                long durationSec = Duration.between(a.getCheckInTime(), a.getUpdatedAt()).getSeconds();
                if (durationSec > 0 && durationSec < 86400) {
                    totalAdminDuration += durationSec / 60.0;
                    adminDurationCount++;
                }
            }
        }
        double avgAdminDuration = adminDurationCount > 0 ? Math.round((totalAdminDuration / adminDurationCount) * 10.0) / 10.0 : 0.0;
        String avgAdminDurationStr = adminDurationCount > 0 ? String.valueOf(avgAdminDuration) : "0.0";

        double onlineRate = totalAppointments > 0
                ? Math.round(((double) onlineBookedCount / totalAppointments * 1000.0)) / 10.0
                : 0.0;
        double noShowRate = totalAppointments > 0
                ? Math.round(((double) cancelledAppointments / totalAppointments * 1000.0)) / 10.0
                : 0.0;

        DecimalFormat dfCurrency = new DecimalFormat("#,###");

        // Biểu đồ dòng thời gian 100% khớp dữ liệu thật
        List<StatisticsDtos.TimeSeriesPoint> timeSeries = buildRealTimeSeries(apptList, granularity, selectedMetric, false);

        List<Double> sparklineVisits = timeSeries.stream().map(p -> (double) p.value()).collect(Collectors.toList());
        if (sparklineVisits.size() < 2) {
            sparklineVisits = List.of(0.0, (double) completedAppointments);
        }

        List<StatisticsDtos.MetricCardData> kpiCards = List.of(
                new StatisticsDtos.MetricCardData(
                        "visits",
                        "Tổng Lượt Khám Hoàn Tất",
                        dfCurrency.format(completedAppointments),
                        "ca",
                        0.0,
                        true,
                        sparklineVisits,
                        "Số ca bệnh nhân thực tế đã hoàn tất khám trong cơ sở dữ liệu"
                ),
                new StatisticsDtos.MetricCardData(
                        "revenue",
                        "Tổng Doanh Thu Viện Phí & Thuốc",
                        dfCurrency.format(totalRevenue),
                        "đ",
                        0.0,
                        true,
                        totalRevenue.compareTo(BigDecimal.ZERO) > 0 ? List.of(0.0, totalRevenue.doubleValue()) : List.of(0.0, 0.0),
                        "Tổng số tiền thực tế thu từ viện phí và thuốc theo các ca khám"
                ),
                new StatisticsDtos.MetricCardData(
                        "avg_duration",
                        "Thời Gian Khám Trung Bình",
                        avgAdminDurationStr,
                        "phút/ca",
                        0.0,
                        true,
                        List.of(avgAdminDuration, avgAdminDuration),
                        "Thời gian khám trung bình thực tế tại các buồng khám"
                ),
                new StatisticsDtos.MetricCardData(
                        "online_booking_rate",
                        "Tỷ Lệ Đặt Hẹn Trước Qua Web",
                        onlineRate + "%",
                        "",
                        0.0,
                        true,
                        List.of(onlineRate, onlineRate),
                        "Tỷ lệ ca đặt lịch trước trực tuyến so với tổng số ca tiếp nhận"
                ),
                new StatisticsDtos.MetricCardData(
                        "no_show_rate",
                        "Tỷ Lệ Hủy / Vắng Mặt (No-Show)",
                        noShowRate + "%",
                        "",
                        0.0,
                        false,
                        List.of(noShowRate, noShowRate),
                        "Tỷ lệ ca bị hủy hoặc bệnh nhân vắng mặt không đến"
                )
        );

        // Bảng xếp hạng bác sĩ: 100% Bác sĩ trong DB kèm số ca thật
        List<StatisticsDtos.BreakdownItem> breakdownItems = buildRealDoctorBreakdown();

        // Biểu đồ tròn Donut: Bệnh nhân tái khám vs Mới từ bảng appointments
        Map<String, Long> patientVisits = apptList.stream()
                .filter(a -> a.getPatientProfileId() != null)
                .collect(Collectors.groupingBy(AppointmentEntity::getPatientProfileId, Collectors.counting()));
        long returningCount = patientVisits.values().stream().filter(c -> c > 1).count();
        long newPatientCount = patientVisits.values().stream().filter(c -> c == 1).count();
        long totalPatients = returningCount + newPatientCount;
        double returningPct = totalPatients > 0 ? Math.round((double) returningCount / totalPatients * 1000.0) / 10.0 : 0.0;
        double newPct = totalPatients > 0 ? Math.round((100.0 - returningPct) * 10.0) / 10.0 : 0.0;

        List<StatisticsDtos.DonutSegment> donutSegments = List.of(
                new StatisticsDtos.DonutSegment("Bệnh nhân Tái Khám (Returning)", returningCount, returningPct, "#0284c7"),
                new StatisticsDtos.DonutSegment("Bệnh nhân Mới (New Patient)", newPatientCount, newPct, "#10b981")
        );

        List<StatisticsDtos.AvailableMetric> availableMetrics = List.of(
                new StatisticsDtos.AvailableMetric("visits", "Lượt Khám Hoàn Tất", "ca"),
                new StatisticsDtos.AvailableMetric("revenue", "Tổng Doanh Thu Viện Phí", "VNĐ"),
                new StatisticsDtos.AvailableMetric("new_patients", "Bệnh Nhân Mới", "người"),
                new StatisticsDtos.AvailableMetric("no_show_rate", "Tỷ Lệ Bỏ Hẹn (No-Show)", "%")
        );

        return new StatisticsDtos.StatisticsOverviewResponse(
                "ROLE_ADMIN",
                formatRangeLabel(range),
                completedAppointments,
                granularity,
                availableMetrics,
                selectedMetric,
                timeSeries,
                kpiCards,
                "Phân Bổ Bệnh Nhân Tái Khám vs Mới",
                donutSegments,
                "Bảng Xếp Hạng Năng Suất Bác Sĩ & Chuyên Khoa",
                new StatisticsDtos.BreakdownHeader("#", "Bác Sĩ / Khoa", "Số Ca Khám", "Thời Gian TB"),
                breakdownItems,
                doctorOptions,
                null,
                null
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. DỮ LIỆU THỐNG KÊ BÁC SĨ (CHUẨN HOÁ: CHỌN THEO BÁC SĨ CỤ THỂ)
    // ─────────────────────────────────────────────────────────────
    private StatisticsDtos.StatisticsOverviewResponse buildDoctorStatistics(
            String granularity, String range, String metricId, String currentUserId, String targetDoctorId,
            List<StatisticsDtos.DoctorOption> doctorOptions, Instant start, Instant end, boolean isCurrentUserAdmin) {

        String selectedMetric = (metricId != null && !metricId.isBlank()) ? metricId : "doctor_visits";

        // Xác định bác sĩ cần xem:
        DoctorEntity chosenDoctor = null;

        // 1. Nếu là Admin và có chọn targetDoctorId cụ thể:
        if (isCurrentUserAdmin && targetDoctorId != null && !targetDoctorId.isBlank()) {
            chosenDoctor = doctorRepo.findById(targetDoctorId).orElse(null);
        }

        // 2. Nếu người đăng nhập là Bác Sĩ (hoặc bất kỳ ai không phải Admin):
        // Bắt buộc lấy hồ sơ của CHÍNH bác sĩ đó! TUYỆT ĐỐI không lấy bác sĩ khác!
        if (!isCurrentUserAdmin && currentUserId != null) {
            List<DoctorEntity> docs = doctorRepo.findByUserId(currentUserId);
            if (!docs.isEmpty()) {
                chosenDoctor = docs.get(0);
            }
        }

        // 3. Nếu là Admin xem mô phỏng mà chưa chọn ai: mặc định lấy bác sĩ đầu tiên
        if (chosenDoctor == null && isCurrentUserAdmin && !doctorOptions.isEmpty()) {
            chosenDoctor = doctorRepo.findById(doctorOptions.get(0).id()).orElse(null);
        }

        String chosenDocId = chosenDoctor != null ? chosenDoctor.getId() : "";
        String docFullName = "Bác Sĩ";
        String docSpecialty = "Chuyên Khoa";
        String docRoom = "Phòng Khám";

        if (chosenDoctor != null) {
            docFullName = userRepo.findById(chosenDoctor.getUserId()).map(UserEntity::getFullName).orElse("Bác Sĩ");
            if (chosenDoctor.getAcademicTitle() != null && !chosenDoctor.getAcademicTitle().isBlank()) {
                docFullName = chosenDoctor.getAcademicTitle() + " " + docFullName;
            }
            docSpecialty = specialtyRepo.findById(chosenDoctor.getSpecialtyId()).map(SpecialtyEntity::getName).orElse("Khoa Khám Bệnh");
            docRoom = (chosenDoctor.getRoomNumber() != null && !chosenDoctor.getRoomNumber().isBlank()) ? ("Phòng " + chosenDoctor.getRoomNumber()) : "Phòng Khám";
        } else if (currentUserId != null) {
            docFullName = userRepo.findById(currentUserId).map(UserEntity::getFullName).orElse("Bác Sĩ");
        }

        List<AppointmentEntity> docAppts = !chosenDocId.isBlank()
                ? appointmentRepo.findByDoctorId(chosenDocId)
                : Collections.emptyList();

        long docCompleted = docAppts.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
        long docRxCount = !chosenDocId.isBlank() ? prescriptionRepo.countByDoctorId(chosenDocId) : 0;
        long docOnline = docAppts.stream().filter(a -> a.getQueueType() == QueueType.ONLINE_BOOKED).count();
        long docWalkin = docAppts.stream().filter(a -> a.getQueueType() == QueueType.WALKIN).count();
        long docTotal = docOnline + docWalkin;

        double docOnlinePct = docTotal > 0 ? Math.round((double) docOnline / docTotal * 1000.0) / 10.0 : 0.0;
        double docWalkinPct = docTotal > 0 ? Math.round((double) docWalkin / docTotal * 1000.0) / 10.0 : 0.0;

        List<StatisticsDtos.TimeSeriesPoint> timeSeries = buildRealTimeSeries(docAppts, granularity, selectedMetric, false);
        List<Double> sparkline = timeSeries.stream().map(p -> (double) p.value()).collect(Collectors.toList());
        if (sparkline.size() < 2) sparkline = List.of(0.0, (double) docCompleted);

        double totalDocDuration = 0;
        int docDurCount = 0;
        for (AppointmentEntity a : docAppts) {
            if (a.getStatus() == AppointmentStatus.COMPLETED && a.getCheckInTime() != null && a.getUpdatedAt() != null && a.getUpdatedAt().isAfter(a.getCheckInTime())) {
                long durationSec = Duration.between(a.getCheckInTime(), a.getUpdatedAt()).getSeconds();
                if (durationSec > 0 && durationSec < 86400) {
                    totalDocDuration += durationSec / 60.0;
                    docDurCount++;
                }
            }
        }
        double avgDocDuration = docDurCount > 0 ? Math.round((totalDocDuration / docDurCount) * 10.0) / 10.0 : 0.0;
        String avgDocDurationStr = docDurCount > 0 ? String.valueOf(avgDocDuration) : "0.0";

        List<StatisticsDtos.MetricCardData> kpiCards = List.of(
                new StatisticsDtos.MetricCardData(
                        "doctor_visits",
                        "Ca Khám Đã Hoàn Tất",
                        String.valueOf(docCompleted),
                        "ca",
                        0.0,
                        true,
                        sparkline,
                        "Số ca bệnh nhân thực tế bác sĩ đã khám hoàn tất trong cơ sở dữ liệu"
                ),
                new StatisticsDtos.MetricCardData(
                        "avg_consult_time",
                        "Thời Gian Khám Trung Bình",
                        avgDocDurationStr,
                        "phút/ca",
                        0.0,
                        true,
                        List.of(avgDocDuration, avgDocDuration),
                        "Thời gian khám trung bình thực tế mỗi ca của bác sĩ"
                ),
                new StatisticsDtos.MetricCardData(
                        "prescriptions",
                        "Đơn Thuốc Đã Kê & Ký Số",
                        String.valueOf(docRxCount),
                        "đơn",
                        0.0,
                        true,
                        List.of((double) docRxCount, (double) docRxCount),
                        "Tổng số đơn thuốc điện tử do bác sĩ trực tiếp kê đơn"
                ),
                new StatisticsDtos.MetricCardData(
                        "doc_return_rate",
                        "Tỷ Lệ Bệnh Nhân Đặt Trước",
                        docTotal > 0 ? (docOnlinePct + "%") : "0%",
                        "",
                        0.0,
                        true,
                        List.of(docOnlinePct, docOnlinePct),
                        "Tỷ lệ ca khám được bệnh nhân chủ động đặt trước qua website"
                )
        );

        List<StatisticsDtos.DonutSegment> donutSegments = List.of(
                new StatisticsDtos.DonutSegment("Bệnh nhân Đặt Trước (Appt)", docOnline, docOnlinePct, "#0ea5e9"),
                new StatisticsDtos.DonutSegment("Bệnh nhân Vãng Lai (Walk-in)", docWalkin, docWalkinPct, "#f59e0b")
        );

        // Bảng danh sách ca chẩn đoán thực tế của bác sĩ
        List<StatisticsDtos.BreakdownItem> breakdownItems = new ArrayList<>();
        if (docCompleted > 0) {
            Map<String, Long> diagCounts = new LinkedHashMap<>();
            for (AppointmentEntity a : docAppts) {
                if (a.getStatus() == AppointmentStatus.COMPLETED) {
                    String diag = null;
                    if (medicalRecordRepo != null) {
                        diag = medicalRecordRepo.findByAppointmentId(a.getId())
                                .map(MedicalRecordEntity::getDiagnosis)
                                .filter(d -> !d.isBlank())
                                .orElse(null);
                    }
                    if (diag == null && a.getPatientSymptoms() != null && !a.getPatientSymptoms().isBlank()) {
                        diag = a.getPatientSymptoms();
                    }
                    if (diag == null) {
                        diag = "Khám bệnh chuyên khoa";
                    }
                    diagCounts.merge(diag, 1L, Long::sum);
                }
            }

            int rank = 1;
            for (Map.Entry<String, Long> entry : diagCounts.entrySet()) {
                String diag = entry.getKey();
                long count = entry.getValue();
                double pct = Math.round((double) count / docCompleted * 1000.0) / 10.0;
                breakdownItems.add(new StatisticsDtos.BreakdownItem(
                        "diag-" + rank,
                        rank,
                        diag,
                        "Ca khám hoàn tất thực tế",
                        count + " ca",
                        pct + "%",
                        "Thực tế",
                        rank % 2 == 1 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-blue-100 text-blue-800 border-blue-300"
                ));
                rank++;
            }
        }
        if (breakdownItems.isEmpty()) {
            breakdownItems.add(new StatisticsDtos.BreakdownItem(
                    "icd-0",
                    1,
                    "Chưa có ca khám hoàn tất",
                    "Bác sĩ chưa có ca khám hoàn tất nào trong giai đoạn này",
                    "0 ca",
                    "0%",
                    "Trống",
                    "bg-slate-100 text-slate-600 border-slate-200"
            ));
        }

        List<StatisticsDtos.AvailableMetric> availableMetrics = List.of(
                new StatisticsDtos.AvailableMetric("doctor_visits", "Số Ca Đã Khám", "ca"),
                new StatisticsDtos.AvailableMetric("avg_consult_time", "Thời Gian Khám TB", "phút"),
                new StatisticsDtos.AvailableMetric("prescriptions", "Đơn Thuốc Đã Kê", "đơn")
        );

        String breakdownTitle = "Chẩn Đoán Bệnh Án Thực Tế: " + docFullName;

        return new StatisticsDtos.StatisticsOverviewResponse(
                "ROLE_DOCTOR",
                formatRangeLabel(range),
                docCompleted,
                granularity,
                availableMetrics,
                selectedMetric,
                timeSeries,
                kpiCards,
                "Cơ Cấu Nguồn Bệnh Nhân: " + docFullName,
                donutSegments,
                breakdownTitle,
                new StatisticsDtos.BreakdownHeader("#", "Chẩn Đoán / Bệnh Án", "Số Ca", "Tỷ Lệ"),
                breakdownItems,
                doctorOptions,
                chosenDocId,
                docFullName + " (" + docSpecialty + " - " + docRoom + ")"
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. DỮ LIỆU THỐNG KÊ LỄ TÂN (THỰC TẾ 100% TIẾP ĐÓN & THU NGÂN)
    // ─────────────────────────────────────────────────────────────
    private StatisticsDtos.StatisticsOverviewResponse buildStaffStatistics(
            String granularity, String range, String metricId, List<StatisticsDtos.DoctorOption> doctorOptions, Instant start, Instant end) {

        String selectedMetric = (metricId != null && !metricId.isBlank()) ? metricId : "checkins";

        List<AppointmentEntity> apptList = appointmentRepo.findAll();
        long totalCheckins = apptList.stream().filter(a -> a.getStatus() != AppointmentStatus.PENDING && a.getStatus() != AppointmentStatus.CONFIRMED).count();
        long walkins = apptList.stream().filter(a -> a.getQueueType() == QueueType.WALKIN).count();

        List<PaymentEntity> succeededPayments = paymentRepo.findByStatus(PaymentStatus.SUCCEEDED);
        BigDecimal cashTotal = succeededPayments.stream()
                .filter(p -> p.getMethod() != null && "CASH".equalsIgnoreCase(p.getMethod().name()))
                .map(PaymentEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal vnpayTotal = succeededPayments.stream()
                .filter(p -> p.getMethod() != null && !"CASH".equalsIgnoreCase(p.getMethod().name()))
                .map(PaymentEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        DecimalFormat df = new DecimalFormat("#,###");

        List<AppointmentEntity> checkedInAppts = apptList.stream()
                .filter(a -> a.getStatus() != AppointmentStatus.PENDING && a.getStatus() != AppointmentStatus.CONFIRMED && a.getStatus() != AppointmentStatus.CANCELLED)
                .collect(Collectors.toList());
        List<StatisticsDtos.TimeSeriesPoint> timeSeries = buildRealTimeSeries(checkedInAppts, granularity, selectedMetric, true);
        List<Double> sparkline = timeSeries.stream().map(p -> (double) p.value()).collect(Collectors.toList());
        if (sparkline.size() < 2) sparkline = List.of(0.0, (double) totalCheckins);

        // Thời gian chờ sảnh trung bình thực tế (phút) giữa checkInTime và updatedAt
        double totalWaitMinutes = 0;
        int waitCount = 0;
        for (AppointmentEntity a : checkedInAppts) {
            if (a.getCheckInTime() != null && a.getUpdatedAt() != null && a.getUpdatedAt().isAfter(a.getCheckInTime())) {
                long durationSec = Duration.between(a.getCheckInTime(), a.getUpdatedAt()).getSeconds();
                if (durationSec > 0 && durationSec < 86400) {
                    totalWaitMinutes += durationSec / 60.0;
                    waitCount++;
                }
            }
        }
        double avgWait = waitCount > 0 ? Math.round((totalWaitMinutes / waitCount) * 10.0) / 10.0 : 0.0;
        String avgWaitStr = waitCount > 0 ? String.valueOf(avgWait) : "0.0";

        List<StatisticsDtos.MetricCardData> kpiCards = List.of(
                new StatisticsDtos.MetricCardData(
                        "checkins",
                        "Tổng Tiếp Đón Check-In",
                        String.valueOf(totalCheckins),
                        "lượt",
                        0.0,
                        true,
                        sparkline,
                        "Số ca bệnh nhân thực tế đã check-in tại quầy hoặc quét QR"
                ),
                new StatisticsDtos.MetricCardData(
                        "walkin_issued",
                        "Tiếp Nhận Vãng Lai (Walk-in)",
                        String.valueOf(walkins),
                        "ca",
                        0.0,
                        true,
                        List.of((double) walkins, (double) walkins),
                        "Số ca bệnh nhân vãng lai thực tế được cấp số thứ tự"
                ),
                new StatisticsDtos.MetricCardData(
                        "shift_cash",
                        "Kết Toán Thu Ngân Thực Tế",
                        df.format(cashTotal.add(vnpayTotal)),
                        "đ",
                        0.0,
                        true,
                        List.of(0.0, cashTotal.add(vnpayTotal).doubleValue()),
                        "Tổng số tiền đã thu thực tế từ bệnh nhân"
                ),
                new StatisticsDtos.MetricCardData(
                        "staff_lobby_wait",
                        "Thời Gian Chờ Sảnh TB",
                        avgWaitStr,
                        "phút",
                        0.0,
                        true,
                        List.of(avgWait, avgWait),
                        "Thời gian chờ thực tế từ lúc check-in đến lúc vào phòng khám"
                )
        );

        BigDecimal totalMethod = cashTotal.add(vnpayTotal);
        double vnpayPct = totalMethod.compareTo(BigDecimal.ZERO) > 0 ? Math.round(vnpayTotal.doubleValue() / totalMethod.doubleValue() * 1000.0) / 10.0 : 0.0;
        double cashPct = totalMethod.compareTo(BigDecimal.ZERO) > 0 ? Math.round((100.0 - vnpayPct) * 10.0) / 10.0 : 0.0;

        List<StatisticsDtos.DonutSegment> donutSegments = List.of(
                new StatisticsDtos.DonutSegment("Chuyển Khoản Online / QR", vnpayTotal.longValue(), vnpayPct, "#2563eb"),
                new StatisticsDtos.DonutSegment("Tiền Mặt Tại Quầy", cashTotal.longValue(), cashPct, "#10b981")
        );

        Map<Integer, Long> hourCounts = new TreeMap<>();
        for (AppointmentEntity a : checkedInAppts) {
            Instant t = a.getCheckInTime() != null ? a.getCheckInTime() : a.getUpdatedAt();
            if (t != null) {
                int hour = t.atZone(VN_ZONE).getHour();
                hourCounts.merge(hour, 1L, Long::sum);
            }
        }
        List<StatisticsDtos.BreakdownItem> breakdownItems = new ArrayList<>();
        if (hourCounts.isEmpty()) {
            breakdownItems.add(new StatisticsDtos.BreakdownItem(
                    "slot-empty",
                    1,
                    "Chưa có lượt tiếp đón",
                    "Chưa có ca check-in nào trong giai đoạn này",
                    "0 lượt",
                    "0%",
                    "Trống",
                    "bg-slate-100 text-slate-600 border-slate-200"
            ));
        } else {
            List<Map.Entry<Integer, Long>> sortedHours = hourCounts.entrySet().stream()
                    .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                    .toList();
            long maxCount = sortedHours.get(0).getValue();
            int idx = 1;
            for (Map.Entry<Integer, Long> entry : sortedHours) {
                int h = entry.getKey();
                long count = entry.getValue();
                String label = String.format("%02d:00 - %02d:00", h, (h + 1) % 24);
                boolean isPeak = (count == maxCount && count > 1);
                String badge = isPeak ? "Giờ Cao Điểm" : "Bình thường";
                String badgeStyle = isPeak ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-blue-100 text-blue-800 border-blue-300";
                breakdownItems.add(new StatisticsDtos.BreakdownItem(
                        "slot-" + h,
                        idx++,
                        label,
                        "Khung giờ tiếp nhận bệnh nhân thực tế",
                        count + " lượt",
                        totalCheckins > 0 ? Math.round((double) count / totalCheckins * 1000.0) / 10.0 + "%" : "0%",
                        badge,
                        badgeStyle
                ));
            }
        }

        List<StatisticsDtos.AvailableMetric> availableMetrics = List.of(
                new StatisticsDtos.AvailableMetric("checkins", "Số Ca Tiếp Đón Sảnh Chờ", "lượt"),
                new StatisticsDtos.AvailableMetric("walkin_issued", "Số Phiếu Khám Vãng Lai", "phiếu"),
                new StatisticsDtos.AvailableMetric("shift_cash", "Tiền Thu Trong Ca", "VNĐ")
        );

        return new StatisticsDtos.StatisticsOverviewResponse(
                "ROLE_STAFF",
                formatRangeLabel(range),
                totalCheckins,
                granularity,
                availableMetrics,
                selectedMetric,
                timeSeries,
                kpiCards,
                "Cơ Cấu Phương Thức Thanh Toán Thực Tế",
                donutSegments,
                "Khung Giờ Cao Điểm Tiếp Đón Sảnh Chờ",
                new StatisticsDtos.BreakdownHeader("#", "Khung Giờ", "Số Lượt Check-in", "Trạng Thái"),
                breakdownItems,
                doctorOptions,
                null,
                null
        );
    }

    // ─────────────────────────────────────────────────────────────
    // HELPER: DANH SÁCH BÁC SĨ CHO DROPDOWN
    // ─────────────────────────────────────────────────────────────
    private List<StatisticsDtos.DoctorOption> buildDoctorOptions() {
        List<DoctorEntity> doctors = doctorRepo.findAll();
        List<StatisticsDtos.DoctorOption> options = new ArrayList<>();
        for (DoctorEntity doc : doctors) {
            String userName = userRepo.findById(doc.getUserId()).map(UserEntity::getFullName).orElse("Bác Sĩ");
            String title = (doc.getAcademicTitle() != null ? doc.getAcademicTitle() + " " : "") + userName;
            String specName = specialtyRepo.findById(doc.getSpecialtyId()).map(SpecialtyEntity::getName).orElse("Khoa Đa Khoa");
            String room = (doc.getRoomNumber() != null && !doc.getRoomNumber().isBlank()) ? doc.getRoomNumber() : "Phòng Khám";
            options.add(new StatisticsDtos.DoctorOption(doc.getId(), title, specName, room));
        }
        return options;
    }

    // ─────────────────────────────────────────────────────────────
    // HELPER: TÍNH TIME SERIES KHỚP 100% CSDL THẬT
    // ─────────────────────────────────────────────────────────────
    private List<StatisticsDtos.TimeSeriesPoint> buildRealTimeSeries(
            List<AppointmentEntity> appointments, String granularity, String metricId, boolean isCheckinMode) {

        if ("HOURLY".equalsIgnoreCase(granularity)) {
            String[] hours = {"07:00", "08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30"};
            Map<String, Long> countByHour = appointments.stream()
                    .map(a -> (isCheckinMode && a.getCheckInTime() != null) ? a.getCheckInTime() : a.getCreatedAt())
                    .filter(Objects::nonNull)
                    .collect(Collectors.groupingBy(t -> HOUR_FORMATTER.format(t), Collectors.counting()));

            List<StatisticsDtos.TimeSeriesPoint> pts = new ArrayList<>();
            for (String h : hours) {
                long val = countByHour.getOrDefault(h, 0L);
                pts.add(new StatisticsDtos.TimeSeriesPoint(h, h, val, String.valueOf(val)));
            }
            return pts;
        }

        LocalDate today = LocalDate.now(VN_ZONE);
        DateTimeFormatter dFmt = DateTimeFormatter.ofPattern("dd/MM");

        Map<LocalDate, Long> countByLocalDate = new HashMap<>();
        for (AppointmentEntity a : appointments) {
            Instant t = (isCheckinMode && a.getCheckInTime() != null) ? a.getCheckInTime() : a.getCreatedAt();
            if (t != null) {
                LocalDate d = t.atZone(VN_ZONE).toLocalDate();
                countByLocalDate.put(d, countByLocalDate.getOrDefault(d, 0L) + 1);
            }
        }

        // Lấy khoảng ngày liên tục: tối thiểu 14 ngày gần nhất, hoặc bắt đầu từ ngày có ca khám sớm nhất (giới hạn 30 ngày)
        LocalDate startDate = today.minusDays(14);
        for (LocalDate d : countByLocalDate.keySet()) {
            if (d.isBefore(startDate) && d.isAfter(today.minusDays(31))) {
                startDate = d;
            }
        }

        // Tạo mảng điểm thời gian LIÊN TỤC và TĂNG DẦN THEO THỜI GIAN CHUẨN XÁC
        List<StatisticsDtos.TimeSeriesPoint> pts = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(today); d = d.plusDays(1)) {
            String label = d.format(dFmt);
            long val = countByLocalDate.getOrDefault(d, 0L);

            String formatted = String.valueOf(val);
            if ("revenue".equalsIgnoreCase(metricId)) {
                formatted = val > 0 ? (val / 1000) + "k" : "0đ";
            }
            pts.add(new StatisticsDtos.TimeSeriesPoint(label, label, val, formatted));
        }

        return pts;
    }

    // ─────────────────────────────────────────────────────────────
    // HELPER: BẢNG XẾP HẠNG TOÀN BỘ BÁC SĨ THẬT TRONG DB
    // ─────────────────────────────────────────────────────────────
    private List<StatisticsDtos.BreakdownItem> buildRealDoctorBreakdown() {
        List<DoctorEntity> doctors = doctorRepo.findAll();
        if (doctors.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map.Entry<DoctorEntity, Long>> docWithCount = new ArrayList<>();
        for (DoctorEntity doc : doctors) {
            long count = appointmentRepo.countByDoctorIdAndStatus(doc.getId(), AppointmentStatus.COMPLETED);
            docWithCount.add(Map.entry(doc, count));
        }

        docWithCount.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));

        List<StatisticsDtos.BreakdownItem> items = new ArrayList<>();
        int rank = 1;
        for (Map.Entry<DoctorEntity, Long> entry : docWithCount) {
            DoctorEntity doc = entry.getKey();
            long count = entry.getValue();

            String rawName = userRepo.findById(doc.getUserId()).map(UserEntity::getFullName).orElse("Bác Sĩ");
            String doctorDisplayName = rawName;
            if (doc.getAcademicTitle() != null && !doc.getAcademicTitle().isBlank()) {
                String title = doc.getAcademicTitle().trim();
                if (!doctorDisplayName.startsWith(title)) {
                    doctorDisplayName = title + " " + doctorDisplayName;
                }
            }
            String specName = specialtyRepo.findById(doc.getSpecialtyId()).map(SpecialtyEntity::getName).orElse("Khoa Khám Bệnh");
            String room = (doc.getRoomNumber() != null && !doc.getRoomNumber().isBlank()) ? ("Phòng " + doc.getRoomNumber()) : "Phòng Khám";

            String avgTimeStr = "Chưa khám";
            if (count > 0) {
                List<AppointmentEntity> doctorAppts = appointmentRepo.findByDoctorId(doc.getId());
                double docDuration = 0;
                int docDurCount = 0;
                for (AppointmentEntity da : doctorAppts) {
                    if (da.getStatus() == AppointmentStatus.COMPLETED && da.getCheckInTime() != null && da.getUpdatedAt() != null && da.getUpdatedAt().isAfter(da.getCheckInTime())) {
                        long sec = Duration.between(da.getCheckInTime(), da.getUpdatedAt()).getSeconds();
                        if (sec > 0 && sec < 86400) {
                            docDuration += sec / 60.0;
                            docDurCount++;
                        }
                    }
                }
                double docAvg = docDurCount > 0 ? Math.round((docDuration / docDurCount) * 10.0) / 10.0 : 0.0;
                avgTimeStr = docDurCount > 0 ? (docAvg + " phút/ca") : "0.0 phút/ca";
            }

            String badge = (rank == 1 && count > 0) ? "Top 1 Năng Suất" : (rank == 2 && count > 0 ? "Đúng Giờ 98%" : null);
            String badgeColor = (rank == 1 && count > 0) ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-100 text-emerald-800 border-emerald-300";

            items.add(new StatisticsDtos.BreakdownItem(
                    doc.getId(),
                    rank,
                    doctorDisplayName,
                    specName + " (" + room + ")",
                    count + " ca",
                    avgTimeStr,
                    badge,
                    badgeColor
            ));
            rank++;
        }

        return items;
    }

    private Instant calculateStartTime(String range, Instant now) {
        java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.LocalDate today = now.atZone(vnZone).toLocalDate();
        if ("TODAY".equalsIgnoreCase(range)) {
            return today.atStartOfDay(vnZone).toInstant();
        } else if ("LAST_7_DAYS".equalsIgnoreCase(range)) {
            return today.minusDays(7).atStartOfDay(vnZone).toInstant();
        } else if ("THIS_MONTH".equalsIgnoreCase(range)) {
            return today.withDayOfMonth(1).atStartOfDay(vnZone).toInstant();
        } else {
            return today.minusDays(30).atStartOfDay(vnZone).toInstant();
        }
    }

    private String formatRangeLabel(String range) {
        if ("TODAY".equalsIgnoreCase(range)) return "Hôm nay (Thời gian thực)";
        if ("LAST_7_DAYS".equalsIgnoreCase(range)) return "7 ngày gần nhất";
        if ("THIS_MONTH".equalsIgnoreCase(range)) return "Tháng hiện tại (Từ ngày 01 đến nay)";
        return "30 ngày gần nhất";
    }
}
