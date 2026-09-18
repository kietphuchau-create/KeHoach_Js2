package com.medsched.app.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.security.JwtAuthenticationFilter;
import com.medsched.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AppointmentController.class, ReceptionController.class})
@AutoConfigureMockMvc(addFilters = false) // Tắt security filters để tập trung test logic controller
class AppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BookAppointmentUseCase bookAppointmentUseCase;

    @MockBean
    private CheckinUseCase checkinUseCase;

    @MockBean
    private AppointmentRepositoryPort appointmentRepositoryPort;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("POST /api/v1/appointments: Đặt lịch thành công trả về HTTP 201 Created")
    void testBookAppointmentSuccess() throws Exception {
        Appointment mockApp = Appointment.createNew(
                "app-1", "MED269780", "center-1", "pat-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Tóm tắt AI"
        );
        given(bookAppointmentUseCase.book(any())).willReturn(mockApp);

        AppointmentController.BookRequest request = new AppointmentController.BookRequest(
                "center-1", "pat-1", "doc-1", "slot-1", "Đau họng", "Không"
        );

        mockMvc.perform(post("/api/v1/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("app-1"))
                .andExpect(jsonPath("$.bookingCode").value("MED269780"))
                .andExpect(jsonPath("$.queueNumber").value("APP-1001"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("POST /api/appointments: Hỗ trợ URL gốc không có /v1")
    void testBookAppointmentWithoutV1() throws Exception {
        Appointment mockApp = Appointment.createNew(
                "app-1", "MED269780", "center-1", "pat-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Tóm tắt AI"
        );
        given(bookAppointmentUseCase.book(any())).willReturn(mockApp);

        AppointmentController.BookRequest request = new AppointmentController.BookRequest(
                "center-1", "pat-1", "doc-1", "slot-1", "Đau họng", "Không"
        );

        mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingCode").value("MED269780"));
    }

    @Test
    @DisplayName("POST /api/v1/appointments/check-in: Tiếp đón qua mã QR")
    void testCheckinEndpoint() throws Exception {
        Appointment mockApp = Appointment.createNew(
                "app-1", "MED269780", "center-1", "pat-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Tóm tắt AI"
        ).checkIn("QR_CODE", Instant.now());

        CheckinUseCase.CheckinResult checkinResult = CheckinUseCase.CheckinResult.of(
                mockApp, "APP-1001", "Tiếp đón thành công"
        );
        given(checkinUseCase.checkinByQrCode("MED269780")).willReturn(checkinResult);

        AppointmentController.CheckinApiRequest request = new AppointmentController.CheckinApiRequest(
                "MED269780", null, null, "QR_CODE"
        );

        mockMvc.perform(post("/api/v1/appointments/check-in")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingCode").value("MED269780"))
                .andExpect(jsonPath("$.queueNumber").value("APP-1001"))
                .andExpect(jsonPath("$.status").value("CHECKED_IN"));
    }

    @Test
    @DisplayName("POST /api/v1/reception/checkin/qr: Tiếp đón qua QR trên ReceptionController")
    void testReceptionQrCheckin() throws Exception {
        Appointment mockApp = Appointment.createNew(
                "app-1", "MED269780", "center-1", "pat-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Tóm tắt AI"
        ).checkIn("QR_CODE", Instant.now());

        CheckinUseCase.CheckinResult checkinResult = CheckinUseCase.CheckinResult.of(
                mockApp, "APP-1001", "Tiếp đón thành công"
        );
        given(checkinUseCase.checkinByQrCode("MED269780")).willReturn(checkinResult);

        ReceptionController.QrCheckinRequest request = new ReceptionController.QrCheckinRequest("MED269780");

        mockMvc.perform(post("/api/v1/reception/checkin/qr")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.queueNumber").value("APP-1001"));
    }

    @Test
    @DisplayName("GET /api/v1/appointments/booking-code/{code}: Tra cứu vé hẹn thành công")
    void testGetByBookingCode() throws Exception {
        Appointment mockApp = Appointment.createNew(
                "app-1", "MED269780", "center-1", "pat-1", "doc-1",
                "slot-1", "APP-1001", "Đau họng", "Tóm tắt AI"
        );
        given(appointmentRepositoryPort.findByBookingCode("MED269780")).willReturn(Optional.of(mockApp));

        mockMvc.perform(get("/api/v1/appointments/booking-code/MED269780"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingCode").value("MED269780"));
    }
}
