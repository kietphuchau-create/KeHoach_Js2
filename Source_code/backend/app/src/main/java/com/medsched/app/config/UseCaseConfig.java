package com.medsched.app.config;

import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import com.medsched.core.usecase.BookAppointmentService;
import com.medsched.core.usecase.CheckinService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UseCaseConfig {

    @Bean
    public BookAppointmentUseCase bookAppointmentUseCase(
            AppointmentRepositoryPort appointmentRepositoryPort,
            TimeSlotRepositoryPort timeSlotRepositoryPort,
            AiTriagePort aiTriagePort
    ) {
        return new BookAppointmentService(appointmentRepositoryPort, timeSlotRepositoryPort, aiTriagePort);
    }

    @Bean
    public CheckinUseCase checkinUseCase(AppointmentRepositoryPort appointmentRepositoryPort) {
        return new CheckinService(appointmentRepositoryPort);
    }
}
