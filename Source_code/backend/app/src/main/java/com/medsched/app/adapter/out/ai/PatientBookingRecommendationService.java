package com.medsched.app.adapter.out.ai;

import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.SpecialtyEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.SpecialtyJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Builds actionable booking choices from real MedSched specialty, doctor and slot data. */
@Service
public class PatientBookingRecommendationService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter SLOT_FORMAT = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");

    private final SpecialtyJpaRepository specialties;
    private final DoctorJpaRepository doctors;
    private final UserJpaRepository users;
    private final TimeSlotJpaRepository timeSlots;

    public PatientBookingRecommendationService(SpecialtyJpaRepository specialties,
                                               DoctorJpaRepository doctors,
                                               UserJpaRepository users,
                                               TimeSlotJpaRepository timeSlots) {
        this.specialties = specialties;
        this.doctors = doctors;
        this.users = users;
        this.timeSlots = timeSlots;
    }

    public Optional<BookingRecommendation> recommend(String specialtyCode) {
        if (specialtyCode == null || specialtyCode.isBlank() || "EMERGENCY".equalsIgnoreCase(specialtyCode)) {
            return Optional.empty();
        }
        List<SpecialtyEntity> matchingSpecialties = specialties.findByCodeIgnoreCase(specialtyCode);
        if (matchingSpecialties.isEmpty()) return Optional.empty();

        List<DoctorOption> options = new ArrayList<>();
        Instant now = Instant.now();
        for (SpecialtyEntity specialty : matchingSpecialties) {
            for (DoctorEntity doctor : doctors.findBySpecialtyId(specialty.getId())) {
                String doctorName = users.findById(doctor.getUserId())
                        .map(user -> user.getFullName())
                        .orElse("Bác sĩ chuyên khoa");
                List<SlotOption> slots = timeSlots
                        .findByDoctorIdAndStatusOrderByStartTimeAsc(doctor.getId(), SlotStatus.AVAILABLE)
                        .stream()
                        .filter(slot -> slot.getStartTime() != null && slot.getStartTime().isAfter(now))
                        .limit(3)
                        .map(this::toSlot)
                        .toList();
                options.add(new DoctorOption(
                        doctor.getId(), doctorName, doctor.getAcademicTitle(), doctor.getRoomNumber(),
                        doctor.getConsultationFee() != null ? doctor.getConsultationFee().longValue() : null,
                        specialty.getId(), specialty.getMedicalCenterId(), slots
                ));
            }
        }

        SpecialtyEntity first = matchingSpecialties.get(0);
        return Optional.of(new BookingRecommendation(
                specialtyCode.toUpperCase(), first.getName(), first.getId(), List.copyOf(options)
        ));
    }

    private SlotOption toSlot(TimeSlotEntity slot) {
        return new SlotOption(slot.getId(), slot.getStartTime(), slot.getEndTime(),
                SLOT_FORMAT.format(slot.getStartTime().atZone(VN_ZONE)));
    }

    public record BookingRecommendation(String specialtyCode, String specialtyName,
                                        String specialtyId, List<DoctorOption> doctors) {}

    public record DoctorOption(String doctorId, String doctorName, String academicTitle,
                               String roomNumber, Long consultationFee, String specialtyId,
                               String medicalCenterId, List<SlotOption> availableSlots) {}

    public record SlotOption(String slotId, Instant startTime, Instant endTime, String displayTime) {}
}
