package com.medsched.app.adapter.in.web;

import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/appointments", "/api/v1/appointments"})
public class AppointmentController {

    private final BookAppointmentUseCase bookAppointmentUseCase;
    private final CheckinUseCase checkinUseCase;
    private final AppointmentRepositoryPort appointmentRepositoryPort;

    public AppointmentController(
            BookAppointmentUseCase bookAppointmentUseCase,
            CheckinUseCase checkinUseCase,
            AppointmentRepositoryPort appointmentRepositoryPort
    ) {
        this.bookAppointmentUseCase = bookAppointmentUseCase;
        this.checkinUseCase = checkinUseCase;
        this.appointmentRepositoryPort = appointmentRepositoryPort;
    }

    public record BookRequest(
            @NotBlank String medicalCenterId,
            @NotBlank String patientProfileId,
            @NotBlank String doctorId,
            @NotBlank String slotId,
            String symptoms,
            String medicalHistory
    ) {}

    public record CheckinApiRequest(
            String bookingCode,
            String cccdNumber,
            String fullName,
            String method
    ) {}

    @PostMapping
    public ResponseEntity<Appointment> bookAppointment(@Valid @RequestBody BookRequest request) {
        BookAppointmentUseCase.Command command = new BookAppointmentUseCase.Command(
                request.medicalCenterId(),
                request.patientProfileId(),
                request.doctorId(),
                request.slotId(),
                request.symptoms(),
                request.medicalHistory()
        );
        Appointment result = bookAppointmentUseCase.book(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/check-in")
    public ResponseEntity<CheckinUseCase.CheckinResult> checkIn(@RequestBody CheckinApiRequest request) {
        if (request.bookingCode() != null && !request.bookingCode().isBlank()) {
            return ResponseEntity.ok(checkinUseCase.checkinByQrCode(request.bookingCode().trim()));
        } else if (request.cccdNumber() != null && !request.cccdNumber().isBlank()) {
            return ResponseEntity.ok(checkinUseCase.checkinByCccd(request.cccdNumber().trim(), request.fullName()));
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointment(@PathVariable String id) {
        return appointmentRepositoryPort.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/booking-code/{code}")
    public ResponseEntity<Appointment> getByBookingCode(@PathVariable String code) {
        return appointmentRepositoryPort.findByBookingCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientProfileId}")
    public ResponseEntity<List<Appointment>> getByPatient(@PathVariable String patientProfileId) {
        return ResponseEntity.ok(appointmentRepositoryPort.findByPatientProfileId(patientProfileId));
    }
}
