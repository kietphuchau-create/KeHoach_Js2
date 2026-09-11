package com.medsched.persistence.entity;

import com.medsched.persistence.enums.SlotStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

/**
 * `version` là cột Optimistic Locking thật của JPA/Hibernate: khi 2 request cùng
 * load 1 slot rồi save(), request lưu sau sẽ nhận OptimisticLockException thay vì
 * âm thầm ghi đè (xem kịch bản 7.6 trong Luong_Nghiep_Vu_Chinh.md). Với thao tác
 * "đặt slot" tần suất cao, có thể dùng TimeSlotJpaRepository#compareAndSetStatus
 * (UPDATE ... WHERE status = :expected) để tránh phải load cả entity trước.
 */
@Entity
@Table(name = "time_slots")
public class TimeSlotEntity {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "schedule_id", nullable = false, length = 36)
    private String scheduleId;

    @Column(name = "doctor_id", nullable = false, length = 36)
    private String doctorId;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SlotStatus status;

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    protected TimeSlotEntity() {
    }

    public TimeSlotEntity(String id, String scheduleId, String doctorId, Instant startTime, Instant endTime,
                          SlotStatus status, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.scheduleId = scheduleId;
        this.doctorId = doctorId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getScheduleId() {
        return scheduleId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public Instant getStartTime() {
        return startTime;
    }

    public Instant getEndTime() {
        return endTime;
    }

    public SlotStatus getStatus() {
        return status;
    }

    public void setStatus(SlotStatus status) {
        this.status = status;
    }

    public int getVersion() {
        return version;
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
