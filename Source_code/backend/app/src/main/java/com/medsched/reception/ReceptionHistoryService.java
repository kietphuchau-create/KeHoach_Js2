package com.medsched.reception;

import com.medsched.persistence.entity.*;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.CheckinMethod;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ReceptionHistoryService {

    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;
    private final DoctorJpaRepository doctorJpaRepository;
    private final SpecialtyJpaRepository specialtyJpaRepository;
    private final UserJpaRepository userJpaRepository;

    public ReceptionHistoryService(
            AppointmentJpaRepository appointmentJpaRepository,
            PatientProfileJpaRepository patientProfileJpaRepository,
            DoctorJpaRepository doctorJpaRepository,
            SpecialtyJpaRepository specialtyJpaRepository,
            UserJpaRepository userJpaRepository) {
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.patientProfileJpaRepository = patientProfileJpaRepository;
        this.doctorJpaRepository = doctorJpaRepository;
        this.specialtyJpaRepository = specialtyJpaRepository;
        this.userJpaRepository = userJpaRepository;
    }

    @Transactional(readOnly = true)
    public ReceptionDtos.ReceptionHistoryResponse getReceptionHistory(
            String keyword,
            String checkinMethod,
            String status,
            LocalDate from,
            LocalDate to) {

        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        DateTimeFormatter timeDtf = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy").withZone(vnZone);

        List<AppointmentEntity> allAppointments = appointmentJpaRepository.findAll();

        // 1. Chỉ lấy những ca đã được tiếp đón tại quầy (có checkInTime hoặc status đã qua bước CONFIRMED)
        List<AppointmentEntity> receivedAppointments = allAppointments.stream()
                .filter(a -> a.getCheckInTime() != null || (
                        a.getStatus() != AppointmentStatus.PENDING &&
                        a.getStatus() != AppointmentStatus.CONFIRMED &&
                        a.getStatus() != AppointmentStatus.CANCELLED
                ))
                .toList();

        // 2. Lọc theo khoảng ngày (dựa theo checkInTime hoặc createdAt)
        List<AppointmentEntity> dateFiltered = receivedAppointments.stream()
                .filter(a -> {
                    Instant t = a.getCheckInTime() != null ? a.getCheckInTime() : a.getCreatedAt();
                    if (t == null) return true;
                    LocalDate apptDate = t.atZone(vnZone).toLocalDate();
                    if (from != null && apptDate.isBefore(from)) return false;
                    if (to != null && apptDate.isAfter(to)) return false;
                    return true;
                })
                .toList();

        // 3. Tính toán các chỉ số thống kê tổng hợp (Summary KPIs)
        long totalCheckins = dateFiltered.size();
        long qrCheckins = dateFiltered.stream()
                .filter(a -> a.getCheckinMethod() == CheckinMethod.QR_CODE)
                .count();
        long cccdCheckins = dateFiltered.stream()
                .filter(a -> a.getCheckinMethod() == CheckinMethod.CCCD_QR)
                .count();
        long manualWalkinCheckins = dateFiltered.stream()
                .filter(a -> a.getCheckinMethod() == CheckinMethod.MANUAL || a.getQueueType() == QueueType.WALKIN)
                .count();
        long completedCount = dateFiltered.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .count();
        long waitingCount = dateFiltered.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CHECKED_IN || a.getStatus() == AppointmentStatus.IN_PROGRESS)
                .count();

        ReceptionDtos.ReceptionHistorySummaryDto summary = new ReceptionDtos.ReceptionHistorySummaryDto(
                totalCheckins,
                qrCheckins,
                cccdCheckins,
                manualWalkinCheckins,
                completedCount,
                waitingCount
        );

        // 4. Lọc theo Phương thức tiếp đón
        String methodFilter = checkinMethod != null ? checkinMethod.trim().toUpperCase() : "ALL";
        List<AppointmentEntity> methodFiltered = dateFiltered.stream()
                .filter(a -> {
                    if ("ALL".equals(methodFilter) || methodFilter.isBlank()) return true;
                    if ("QR_CODE".equals(methodFilter)) return a.getCheckinMethod() == CheckinMethod.QR_CODE;
                    if ("CCCD_QR".equals(methodFilter)) return a.getCheckinMethod() == CheckinMethod.CCCD_QR;
                    if ("MANUAL".equals(methodFilter)) {
                        return a.getCheckinMethod() == CheckinMethod.MANUAL || a.getQueueType() == QueueType.WALKIN;
                    }
                    return true;
                })
                .toList();

        // 5. Lọc theo Trạng thái ca khám
        String statusFilter = status != null ? status.trim().toUpperCase() : "ALL";
        List<AppointmentEntity> statusFiltered = methodFiltered.stream()
                .filter(a -> {
                    if ("ALL".equals(statusFilter) || statusFilter.isBlank()) return true;
                    return a.getStatus().name().equalsIgnoreCase(statusFilter);
                })
                .toList();

        // 6. Sắp xếp: Ca mới tiếp đón nhất hiển thị lên đầu
        List<AppointmentEntity> sorted = statusFiltered.stream()
                .sorted((a, b) -> {
                    Instant t1 = a.getCheckInTime() != null ? a.getCheckInTime() : a.getCreatedAt();
                    Instant t2 = b.getCheckInTime() != null ? b.getCheckInTime() : b.getCreatedAt();
                    if (t1 == null || t2 == null) return 0;
                    return t2.compareTo(t1);
                })
                .toList();

        String kw = keyword != null ? keyword.trim().toLowerCase() : "";

        // 7. Chuyển đổi sang DTO và tìm kiếm từ khóa
        List<ReceptionDtos.ReceptionHistoryItemDto> items = sorted.stream()
                .map(a -> {
                    PatientProfileEntity profile = patientProfileJpaRepository.findById(a.getPatientProfileId()).orElse(null);
                    String patientName = profile != null ? profile.getFullName() : "Bệnh nhân";
                    String gender = profile != null && profile.getGender() != null
                            ? (profile.getGender().name().equals("FEMALE") ? "Nữ" : "Nam")
                            : "Nam";
                    int birthYear = profile != null && profile.getDateOfBirth() != null
                            ? profile.getDateOfBirth().getYear()
                            : 1990;
                    String phone = profile != null && profile.getPhone() != null ? profile.getPhone() : "";
                    String cccdNumber = profile != null && profile.getCccdNumber() != null ? profile.getCccdNumber() : "";

                    DoctorEntity doctor = a.getDoctorId() != null ? doctorJpaRepository.findById(a.getDoctorId()).orElse(null) : null;
                    String doctorName = "BS. Chuyên Khoa";
                    String specialtyName = "Khoa Khám Bệnh";
                    String roomNumber = "Phòng Khám";

                    if (doctor != null) {
                        if (doctor.getRoomNumber() != null && !doctor.getRoomNumber().isBlank()) {
                            roomNumber = "Phòng " + doctor.getRoomNumber();
                        }
                        if (doctor.getSpecialtyId() != null) {
                            specialtyName = specialtyJpaRepository.findById(doctor.getSpecialtyId())
                                    .map(SpecialtyEntity::getName)
                                    .orElse("Khoa Khám Bệnh");
                        }
                        if (doctor.getUserId() != null) {
                            var userOpt = userJpaRepository.findById(doctor.getUserId());
                            if (userOpt.isPresent()) {
                                String prefix = (doctor.getAcademicTitle() != null && !doctor.getAcademicTitle().isBlank())
                                        ? doctor.getAcademicTitle() + " "
                                        : "BS. ";
                                doctorName = prefix + userOpt.get().getFullName();
                            }
                        }
                    }

                    String queueNum = a.getQueueNumber() != null ? a.getQueueNumber() : "STT-01";
                    if (a.getQueueType() == QueueType.WALKIN && !queueNum.startsWith("W-")) {
                        queueNum = "W-" + queueNum;
                    } else if (a.getQueueType() == QueueType.ONLINE_BOOKED && !queueNum.startsWith("A-")) {
                        queueNum = "A-" + queueNum;
                    }

                    Instant inTime = a.getCheckInTime() != null ? a.getCheckInTime() : a.getCreatedAt();
                    String formattedInTime = inTime != null ? timeDtf.format(inTime) : "";
                    Instant created = a.getCreatedAt();
                    String formattedCreated = created != null ? timeDtf.format(created) : "";

                    String methodStr = a.getCheckinMethod() != null ? a.getCheckinMethod().name() : "MANUAL";
                    if (a.getQueueType() == QueueType.WALKIN && a.getCheckinMethod() == null) {
                        methodStr = "MANUAL";
                    }

                    return new ReceptionDtos.ReceptionHistoryItemDto(
                            a.getId(),
                            a.getBookingCode(),
                            queueNum,
                            a.getQueueType() != null ? a.getQueueType().name() : "ONLINE_BOOKED",
                            methodStr,
                            patientName,
                            gender,
                            birthYear,
                            phone,
                            cccdNumber,
                            doctorName,
                            specialtyName,
                            roomNumber,
                            a.getPatientSymptoms() != null ? a.getPatientSymptoms() : "",
                            a.getStatus().name(),
                            inTime,
                            formattedInTime,
                            created,
                            formattedCreated
                    );
                })
                .filter(item -> {
                    if (kw.isBlank()) return true;
                    return item.patientName().toLowerCase().contains(kw)
                            || item.bookingCode().toLowerCase().contains(kw)
                            || item.queueNumber().toLowerCase().contains(kw)
                            || item.phone().toLowerCase().contains(kw)
                            || item.cccdNumber().toLowerCase().contains(kw)
                            || item.doctorName().toLowerCase().contains(kw);
                })
                .toList();

        return new ReceptionDtos.ReceptionHistoryResponse(summary, items);
    }
}
