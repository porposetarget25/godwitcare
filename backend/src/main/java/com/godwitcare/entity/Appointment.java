package com.godwitcare.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "appointments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_appointment_doctor_start", columnNames = {"doctor_id", "start_time"}),
                @UniqueConstraint(name = "uk_appointment_consultation", columnNames = {"consultation_id"})
        },
        indexes = {
                @Index(name = "idx_appointment_patient", columnList = "patient_id"),
                @Index(name = "idx_appointment_doctor_time", columnList = "doctor_id,start_time")
        }
)
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private User patient;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private User doctor;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    private Consultation consultation;

    @Column(nullable = false)
    private Instant startTime;

    @Column(nullable = false)
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Status status = Status.SCHEDULED;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public enum Status { SCHEDULED, COMPLETED, CANCELLED }

    public Long getId() { return id; }
    public User getPatient() { return patient; }
    public void setPatient(User patient) { this.patient = patient; }
    public User getDoctor() { return doctor; }
    public void setDoctor(User doctor) { this.doctor = doctor; }
    public Consultation getConsultation() { return consultation; }
    public void setConsultation(Consultation consultation) { this.consultation = consultation; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
