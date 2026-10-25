package com.medsched.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "dev_mode_sessions")
public class DevModeSessionEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "activated_by", length = 100)
    private String activatedBy;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "cleaned_schedules_count", nullable = false)
    private int cleanedSchedulesCount = 0;

    @Column(name = "cleaned_appointments_count", nullable = false)
    private int cleanedAppointmentsCount = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected DevModeSessionEntity() {
    }

    public DevModeSessionEntity(String id, boolean isActive, Instant startedAt, Instant endedAt,
                                String activatedBy, String notes, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.isActive = isActive;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
        this.activatedBy = activatedBy;
        this.notes = notes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public String getActivatedBy() {
        return activatedBy;
    }

    public void setActivatedBy(String activatedBy) {
        this.activatedBy = activatedBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public int getCleanedSchedulesCount() {
        return cleanedSchedulesCount;
    }

    public void setCleanedSchedulesCount(int cleanedSchedulesCount) {
        this.cleanedSchedulesCount = cleanedSchedulesCount;
    }

    public int getCleanedAppointmentsCount() {
        return cleanedAppointmentsCount;
    }

    public void setCleanedAppointmentsCount(int cleanedAppointmentsCount) {
        this.cleanedAppointmentsCount = cleanedAppointmentsCount;
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
