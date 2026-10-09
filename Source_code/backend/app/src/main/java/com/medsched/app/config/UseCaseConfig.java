package com.medsched.app.config;

import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.in.CancelAppointmentUseCase;
import com.medsched.core.port.in.ChangePasswordUseCase;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.in.UpdateProfileUseCase;
import com.medsched.core.port.out.AccountRepositoryPort;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.PasswordEncoderPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import com.medsched.core.usecase.BookAppointmentService;
import com.medsched.core.usecase.CancelAppointmentService;
import com.medsched.core.usecase.ChangePasswordService;
import com.medsched.core.usecase.CheckinService;
import com.medsched.core.usecase.UpdateProfileService;
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

    @Bean
    public CancelAppointmentUseCase cancelAppointmentUseCase(
            AppointmentRepositoryPort appointmentRepositoryPort,
            TimeSlotRepositoryPort timeSlotRepositoryPort
    ) {
        return new CancelAppointmentService(appointmentRepositoryPort, timeSlotRepositoryPort);
    }

    @Bean
    public ChangePasswordUseCase changePasswordUseCase(
            AccountRepositoryPort accountRepositoryPort,
            PasswordEncoderPort passwordEncoderPort
    ) {
        return new ChangePasswordService(accountRepositoryPort, passwordEncoderPort);
    }

    @Bean
    public UpdateProfileUseCase updateProfileUseCase(
            AccountRepositoryPort accountRepositoryPort
    ) {
        return new UpdateProfileService(accountRepositoryPort);
    }

}
