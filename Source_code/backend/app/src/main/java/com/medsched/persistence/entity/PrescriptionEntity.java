package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * CLAB-107: Quản lý thông tin đơn thuốc điện tử của ca khám bệnh.
 */
@Entity
@Table(name = "prescriptions")
public class PrescriptionEntity {

    @Id
    @Column(nullable = false, length = 64)
    private String id;

    @Column(name = "appointment_id", nullable = false, length = 36)
    private String appointmentId;

    @Column(name = "medical_record_id", length = 36)
    private String medicalRecordId;

    @Column(name = "doctor_id", length = 36)
    private String doctorId;

    @Column(name = "doctor_name", length = 255)
    private String doctorName;

    @Column(name = "total_medicine_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalMedicineAmount;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PrescriptionEntity() {
    }

    public PrescriptionEntity(String id, String appointmentId, String medicalRecordId, String doctorId,
                              String doctorName, BigDecimal totalMedicineAmount, String status,
                              Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.medicalRecordId = medicalRecordId;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.totalMedicineAmount = totalMedicineAmount;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public String getMedicalRecordId() {
        return medicalRecordId;
    }

    public void setMedicalRecordId(String medicalRecordId) {
        this.medicalRecordId = medicalRecordId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public BigDecimal getTotalMedicineAmount() {
        return totalMedicineAmount;
    }

    public void setTotalMedicineAmount(BigDecimal totalMedicineAmount) {
        this.totalMedicineAmount = totalMedicineAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
