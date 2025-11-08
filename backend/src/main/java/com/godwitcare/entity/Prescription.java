package com.godwitcare.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Prescription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    private Consultation consultation;

    // Denormalized patient fields
    private String patientId;
    private String patientName;
    private String patientDob;
    private String patientPhone;

    // Free text
    @Column(length = 4000)
    private String historyOfPresentingComplaint;
    @Column(length = 4000)
    private String diagnosis;
    @Column(length = 8000)
    private String medicines;
    @Column(length = 4000)
    private String recommendations;

    // Current prod columns
    @Lob
    @Column(name = "pdf_bytes2")
    private byte[] pdfBytes;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    // Legacy NOT NULL column in prod
    @Basic(optional = false)
    @Column(name = "size", nullable = false)
    private Long size = 0L;

    private String fileName = "prescription.pdf";
    private String contentType = "application/pdf";

    private Instant createdAt = Instant.now();

    @PrePersist
    @PreUpdate
    private void syncSizes() {
        long len = (pdfBytes != null) ? pdfBytes.length : 0L;
        if (sizeBytes == null || sizeBytes == 0L) sizeBytes = len;
        if (size == null || size == 0L) size = sizeBytes;
    }

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
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Instant getCreatedAt() { return createdAt; }
}
