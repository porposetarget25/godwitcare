// src/main/java/com/godwitcare/service/PrescriptionPdfService.java
package com.godwitcare.service;

import com.godwitcare.util.PdfMaker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PrescriptionPdfService {

    private final byte[] logoBytes;
    private final byte[] signatureBytes;

    public PrescriptionPdfService(
            @Value("classpath:/static/branding/logo.jpg") Resource logoRes,
            @Value("classpath:/static/branding/doctor_signature.jpg") Resource signRes
    ) throws IOException {
        this.logoBytes = safeRead(logoRes);        // may be null if file missing
        this.signatureBytes = safeRead(signRes);   // may be null if file missing
    }

    private static byte[] safeRead(Resource r) throws IOException {
        if (r == null || !r.exists()) return null;
        try (InputStream in = r.getInputStream()) { return in.readAllBytes(); }
    }

    // Call this from controller after you load your domain objects.
    public byte[] buildPrescriptionPdf(
            // patient
            String patientName, LocalDate dob, String phone, String patientId,String patientAddress,
            // consultation/prescription
            String diagnosis, String history, List<String> meds,String recommendations,
            // doctor block
            String doctorName, String doctorReg, String doctorAddress, String doctorPhone, String doctorEmail
    ) throws Exception {
        String dobStr = (dob != null) ? dob.format(DateTimeFormatter.ISO_LOCAL_DATE) : "—";
        return PdfMaker.makePrescriptionPdfV2(
                logoBytes, signatureBytes,
                patientName, dobStr, phone, patientId,patientAddress,
                diagnosis, history, meds,recommendations,
                doctorName, doctorReg, doctorAddress, doctorPhone, doctorEmail
        );
    }
}
