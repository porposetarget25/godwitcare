// src/main/java/com/godwitcare/entity/ReferralLetter.java
package com.godwitcare.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class ReferralLetter {

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

    // Denormalized doctor fields
    private String doctorName;
    private String doctorReg;
    private String doctorAddress;
    private String doctorPhone;
    private String doctorEmail;

    @Column(length = 10000)
    private String body; // the paragraph block doctor edits

    // Rendered PDF
    @Lob
    @Column(name = "pdf_bytes", columnDefinition = "bytea")
    private byte[] pdfBytes;
    private String fileName = "referral-letter.pdf";
    private String contentType = "application/pdf";
    private long size;

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public Consultation getConsultation() { return consultation; }
    public void setConsultation(Consultation c) { this.consultation = c; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String s) { this.patientId = s; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String s) { this.patientName = s; }
    public String getPatientDob() { return patientDob; }
    public void setPatientDob(String s) { this.patientDob = s; }
    public String getPatientPhone() { return patientPhone; }
    public void setPatientPhone(String s) { this.patientPhone = s; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String s) { this.doctorName = s; }
    public String getDoctorReg() { return doctorReg; }
    public void setDoctorReg(String s) { this.doctorReg = s; }
    public String getDoctorAddress() { return doctorAddress; }
    public void setDoctorAddress(String s) { this.doctorAddress = s; }
    public String getDoctorPhone() { return doctorPhone; }
    public void setDoctorPhone(String s) { this.doctorPhone = s; }
    public String getDoctorEmail() { return doctorEmail; }
    public void setDoctorEmail(String s) { this.doctorEmail = s; }

    public String getBody() { return body; }
    public void setBody(String s) { this.body = s; }

    public byte[] getPdfBytes() { return pdfBytes; }
    public void setPdfBytes(byte[] bytes) { this.pdfBytes = bytes; }
    public String getFileName() { return fileName; }
    public void setFileName(String s) { this.fileName = s; }
    public String getContentType() { return contentType; }
    public void setContentType(String s) { this.contentType = s; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public Instant getCreatedAt() { return createdAt; }
}
