package com.medsched.app.adapter.in.web;

import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final BookAppointmentUseCase bookAppointmentUseCase;
    private final AppointmentRepositoryPort appointmentRepositoryPort;

    public AppointmentController(
            BookAppointmentUseCase bookAppointmentUseCase,
            AppointmentRepositoryPort appointmentRepositoryPort
    ) {
        this.bookAppointmentUseCase = bookAppointmentUseCase;
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
