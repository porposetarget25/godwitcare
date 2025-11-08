// src/main/java/com/godwitcare/entity/Prescription.java
package com.godwitcare.entity;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
public class Prescription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    private Consultation consultation;

    // copied denormalized for convenience / quick rendering
    private String patientId;     // e.g. PV-987654321
    private String patientName;   // "First Last"
    private String patientDob;    // yyyy-MM-dd (or ISO string)
    private String patientPhone;  // WhatsApp

    // Free text fields from doctor
    @Column(length = 4000)
    private String historyOfPresentingComplaint;
    @Column(length = 4000)
    private String diagnosis;
    @Column(length = 8000)
    private String medicines; // simple newline-separated list, or JSON if you prefer
    @Column(length = 4000)
    private String recommendations;

    // ===== Rendered PDF (NEW columns to avoid the broken existing ones) =====
    @Lob
    @JdbcTypeCode(SqlTypes.BINARY)             // portable for H2 + Postgres
    @Column(name = "pdf_bytes2")               // NEW column name
    private byte[] pdfBytes;

    @Column(name = "size_bytes")               // NEW column name
    private Long sizeBytes;

    private String fileName = "prescription.pdf";
    private String contentType = "application/pdf";

    private Instant createdAt = Instant.now();

    // getters/setters
    public Long getId() { return id; }

    public Consultation getConsultation() { return consultation; }
    public void setConsultation(Consultation consultation) { this.consultation = consultation; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientDob() { return patientDob; }
    public void setPatientDob(String patientDob) { this.patientDob = patientDob; }

    public String getPatientPhone() { return patientPhone; }
    public void setPatientPhone(String patientPhone) { this.patientPhone = patientPhone; }

    public String getHistoryOfPresentingComplaint() { return historyOfPresentingComplaint; }
    public void setHistoryOfPresentingComplaint(String s) { this.historyOfPresentingComplaint = s; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getMedicines() { return medicines; }
    public void setMedicines(String medicines) { this.medicines = medicines; }

    public String getRecommendations() { return recommendations; }
    public void setRecommendations(String recommendations) { this.recommendations = recommendations; }

    public byte[] getPdfBytes() { return pdfBytes; }
    public void setPdfBytes(byte[] pdfBytes) { this.pdfBytes = pdfBytes; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Instant getCreatedAt() { return createdAt; }

    // -------- compatibility accessors for old 'size' field --------
    @Transient
    public long getSize() { return sizeBytes == null ? 0L : sizeBytes; }
    public void setSize(long size) { this.sizeBytes = size; }

    // Preferred explicit accessors
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
}
