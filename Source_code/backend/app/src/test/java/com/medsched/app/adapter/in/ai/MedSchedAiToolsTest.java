package com.medsched.app.adapter.in.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MedSchedAiToolsTest {

    @Mock
    private AiTriagePort aiTriagePort;

    @Mock
    private DoctorJpaRepository doctorRepository;

    @Mock
    private TimeSlotJpaRepository timeSlotRepository;

    @Mock
    private AppointmentJpaRepository appointmentRepository;

    @Mock
    private com.medsched.persistence.repository.PatientProfileJpaRepository patientProfileRepository;

    @Mock
    private com.medsched.persistence.repository.UserJpaRepository userRepository;

    @Mock
    private com.medsched.persistence.repository.MedicineJpaRepository medicineRepository;

    @Mock
    private com.medsched.persistence.repository.PaymentJpaRepository paymentRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MedSchedAiTools aiTools;

    @Test
    @DisplayName("triagePatientSymptoms() calls AiTriagePort and returns JSON")
    void triagePatientSymptoms_success() {
        TriageEvaluation eval = new TriageEvaluation(
                "CARDIO",
                "Khoa Tim Mạch",
                "Khám Tim Chuyên Sâu",
                "500,000 VND",
                "Triệu chứng đau thắt ngực",
                "Nghỉ ngơi trước khi đo",
                false,
                "Không có",
                "Chỉ mang tính tham khảo"
        );
        given(aiTriagePort.evaluateSymptoms("Đau ngực", "")).willReturn(eval);

        String json = aiTools.triagePatientSymptoms("Đau ngực", "");

        assertThat(json).contains("CARDIO");
        assertThat(json).contains("Khoa Tim Mạch");
        assertThat(json).contains("500,000 VND");
    }

    @Test
    @DisplayName("lookupDoctorDirectory() without specialtyId returns all doctors")
    void lookupDoctorDirectory_allDoctors() {
        DoctorEntity doc = new DoctorEntity(
                "DOC-01", "USER-01", "SPEC-01", "Tiến sĩ, Bác sĩ",
                new BigDecimal("300000"), "P.201", "Chuyên gia tim mạch", null,
                Instant.now(), Instant.now()
        );

        given(doctorRepository.findAll()).willReturn(List.of(doc));

        String json = aiTools.lookupDoctorDirectory(null);

        assertThat(json).contains("DOC-01");
        assertThat(json).contains("P.201");
    }

    @Test
    @DisplayName("lookupDoctorDirectory() with specialtyId filters by specialty")
    void lookupDoctorDirectory_bySpecialty() {
        DoctorEntity doc = new DoctorEntity(
                "DOC-02", "USER-02", "SPEC-02", "Thạc sĩ, Bác sĩ",
                new BigDecimal("250000"), "P.302", "Chuyên gia da liễu", null,
                Instant.now(), Instant.now()
        );

        given(doctorRepository.findBySpecialtyId("SPEC-02")).willReturn(List.of(doc));

        String json = aiTools.lookupDoctorDirectory("SPEC-02");

        assertThat(json).contains("DOC-02");
        assertThat(json).contains("P.302");
    }

    @Test
    @DisplayName("getAvailableTimeSlots() returns slots for valid doctorId")
    void getAvailableTimeSlots_success() {
        TimeSlotEntity slot = new TimeSlotEntity(
                "SLOT-101", "SCHED-01", "DOC-01",
                Instant.parse("2026-10-15T08:00:00Z"),
                Instant.parse("2026-10-15T08:30:00Z"),
                SlotStatus.AVAILABLE,
                Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findByDoctorIdAndStatusOrderByStartTimeAsc("DOC-01", SlotStatus.AVAILABLE))
                .willReturn(List.of(slot));

        String json = aiTools.getAvailableTimeSlots("DOC-01");

        assertThat(json).contains("SLOT-101");
        assertThat(json).contains("2026-10-15T08:00:00Z");
    }

    @Test
    @DisplayName("getAvailableTimeSlots() with empty doctorId returns validation message")
    void getAvailableTimeSlots_emptyDoctor() {
        String res = aiTools.getAvailableTimeSlots("");
        assertThat(res).contains("Lỗi: Cần cung cấp doctorId");
    }

    @Test
    @DisplayName("verifyBookingCode() returns appointment details when found")
    void verifyBookingCode_found() {
        AppointmentEntity apt = new AppointmentEntity(
                "APT-01", "MED-123456", "MC-01", "PAT-01",
                "DOC-01", "SLOT-01", "A-01", QueueType.ONLINE_BOOKED,
                "Đau đầu", AppointmentStatus.CONFIRMED,
                Instant.now(), Instant.now()
        );

        given(appointmentRepository.findByBookingCode("MED-123456")).willReturn(Optional.of(apt));

        String json = aiTools.verifyBookingCode("med-123456");

        assertThat(json).contains("MED-123456");
        assertThat(json).contains("A-01");
        assertThat(json).contains("CONFIRMED");
    }

    @Test
    @DisplayName("verifyBookingCode() returns not found message when missing")
    void verifyBookingCode_notFound() {
        given(appointmentRepository.findByBookingCode("UNKNOWN")).willReturn(Optional.empty());

        String res = aiTools.verifyBookingCode("UNKNOWN");

        assertThat(res).contains("Không tìm thấy lịch hẹn với mã: UNKNOWN");
    }

    @Test
    @DisplayName("getToolDefinitions() returns all 9 medical tool schemas")
    void getToolDefinitions_returnsDefinitions() {
        List<Map<String, Object>> defs = aiTools.getToolDefinitions();

        assertThat(defs).hasSize(9);
        assertThat(defs).extracting(m -> m.get("name"))
                .contains(
                        "triage_patient_symptoms",
                        "lookup_doctor_directory",
                        "get_available_time_slots",
                        "verify_booking_code",
                        "reception_checkin",
                        "search_patient",
                        "doctor_summarize_patient",
                        "doctor_consult_medicines",
                        "get_admin_statistics"
                );
    }

    @Test
    @DisplayName("executeTool() dispatches correctly to tools")
    void executeTool_dispatches() {
        TriageEvaluation eval = new TriageEvaluation(
                "DERMA", "Da Liễu", "Khám da", "200k",
                "Mụn", "Không", false, "Không", "Tham khảo"
        );
        given(aiTriagePort.evaluateSymptoms("Mụn", "")).willReturn(eval);

        String res = aiTools.executeTool("triage_patient_symptoms", Map.of("symptoms", "Mụn"));

        assertThat(res).contains("DERMA");
    }

    @Test
    @DisplayName("executeTool() with unknown tool returns error message")
    void executeTool_unknownTool() {
        String res = aiTools.executeTool("invalid_tool", Map.of());
        assertThat(res).contains("Lỗi: Không tìm thấy tool 'invalid_tool'");
    }

    @Test
    @DisplayName("safely() catches exceptions and returns friendly error message")
    void safely_catchesException() {
        given(doctorRepository.findAll()).willThrow(new RuntimeException("Database timeout"));

        String res = aiTools.lookupDoctorDirectory(null);

        assertThat(res).contains("Thao tác thất bại: Database timeout");
    }
}
