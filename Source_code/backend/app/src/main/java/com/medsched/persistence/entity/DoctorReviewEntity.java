package com.medsched.persistence.entity;

import com.medsched.persistence.enums.SentimentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "doctor_reviews")
public class DoctorReviewEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "appointment_id", nullable = false, unique = true, length = 36)
    private String appointmentId;

    @Column(name = "patient_profile_id", nullable = false, length = 36)
    private String patientProfileId;

    @Column(name = "doctor_id", nullable = false, length = 36)
    private String doctorId;

    @Column(nullable = false)
    private int rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_sentiment", length = 20)
    private SentimentType aiSentiment;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected DoctorReviewEntity() {
    }

    public DoctorReviewEntity(String id, String appointmentId, String patientProfileId, String doctorId, int rating,
                              String comment, boolean anonymous, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.patientProfileId = patientProfileId;
        this.doctorId = doctorId;
        this.rating = rating;
        this.comment = comment;
        this.anonymous = anonymous;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public String getPatientProfileId() {
        return patientProfileId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public SentimentType getAiSentiment() {
        return aiSentiment;
    }

    public void setAiSentiment(SentimentType aiSentiment) {
        this.aiSentiment = aiSentiment;
    }

    public boolean isAnonymous() {
        return anonymous;
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
