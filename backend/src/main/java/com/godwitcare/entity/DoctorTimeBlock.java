package com.godwitcare.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "doctor_time_blocks", indexes = @Index(name = "idx_time_block_doctor_time", columnList = "doctor_id,start_time,end_time"))
public class DoctorTimeBlock {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "doctor_id")
    private User doctor;
    @Column(nullable = false) private Instant startTime;
    @Column(nullable = false) private Instant endTime;
    @Column(length = 255) private String reason;

    public Long getId() { return id; }
    public User getDoctor() { return doctor; }
    public void setDoctor(User doctor) { this.doctor = doctor; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
