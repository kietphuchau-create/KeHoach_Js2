package com.medsched.persistence.entity;

import com.medsched.persistence.enums.AppointmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "appointment_status_logs")
public class AppointmentStatusLogEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "appointment_id", nullable = false, length = 36)
    private String appointmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private AppointmentStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 30)
    private AppointmentStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_by", length = 36)
    private String changedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AppointmentStatusLogEntity() {
    }

    public AppointmentStatusLogEntity(String id, String appointmentId, AppointmentStatus fromStatus,
                                      AppointmentStatus toStatus, String reason, String changedBy,
                                      Instant createdAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.reason = reason;
        this.changedBy = changedBy;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public AppointmentStatus getFromStatus() {
        return fromStatus;
    }

    public AppointmentStatus getToStatus() {
        return toStatus;
    }

    public String getReason() {
        return reason;
    }

    public String getChangedBy() {
        return changedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

}
