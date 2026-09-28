package com.medsched.persistence.repository;

import com.medsched.persistence.entity.InvoiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvoiceJpaRepository extends JpaRepository<InvoiceEntity, String> {

    Optional<InvoiceEntity> findByAppointmentId(String appointmentId);

    Optional<InvoiceEntity> findByInvoiceNumber(String invoiceNumber);

}
