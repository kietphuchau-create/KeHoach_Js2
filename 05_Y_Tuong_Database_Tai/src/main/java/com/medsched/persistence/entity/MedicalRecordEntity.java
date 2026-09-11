package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "medical_records")
public class MedicalRecordEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "appointment_id", nullable = false, unique = true, length = 36)
    private String appointmentId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "doctor_notes", columnDefinition = "TEXT")
    private String doctorNotes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected MedicalRecordEntity() {
    }

    public MedicalRecordEntity(String id, String appointmentId, String diagnosis, String doctorNotes,
                               Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.diagnosis = diagnosis;
        this.doctorNotes = doctorNotes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public String getDoctorNotes() {
        return doctorNotes;
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

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

}
