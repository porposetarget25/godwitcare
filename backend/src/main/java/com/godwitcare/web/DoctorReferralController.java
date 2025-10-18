// src/main/java/com/godwitcare/web/DoctorReferralController.java
package com.godwitcare.web;

import com.godwitcare.entity.Consultation;
import com.godwitcare.entity.ReferralLetter;
import com.godwitcare.repo.ConsultationRepository;
import com.godwitcare.repo.ReferralLetterRepo;
import com.godwitcare.util.PdfMaker;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/doctor")
public class DoctorReferralController {

    private final ConsultationRepository consultations;
    private final ReferralLetterRepo referrals;

    public DoctorReferralController(ConsultationRepository consultations,
                                    ReferralLetterRepo referrals) {
        this.consultations = consultations;
        this.referrals = referrals;
    }

    // Quick safety for PDFBox Latin-1: strip diacritics (optional if you embed a Unicode font)
    private static String ascii(String s) {
        if (s == null || s.isBlank()) return "—";
        String n = Normalizer.normalize(s, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^\\x20-\\x7E\\n\\r\\t]", "");
        return n.isBlank() ? "—" : n;
    }

    // Request DTO
    public record CreateReferralDto(String paragraph) {}

    @PostMapping(
            value = "/consultations/{id}/referrals",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String,Object>> createReferral(
            @PathVariable("id") Long consultationId,
            @RequestBody CreateReferralDto body
    ) throws Exception {

        Consultation c = consultations.findById(consultationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consultation not found"));

        // ----- Patient info from consultation -----
        String patientName = (c.getContactName() != null && !c.getContactName().isBlank())
                ? c.getContactName()
                : Optional.ofNullable(c.getUser())
                .map(u -> String.join(" ",
                        Optional.ofNullable(u.getFirstName()).orElse(""),
                        Optional.ofNullable(u.getLastName()).orElse("")))
                .orElse("—");
        String patientId    = Optional.ofNullable(c.getPatientId()).orElse("—");
        String patientDob   = Optional.ofNullable(c.getDob())
                .map(d -> d.format(DateTimeFormatter.ISO_LOCAL_DATE)).orElse("—");
        String patientPhone = Optional.ofNullable(c.getContactPhone()).orElse("—");
        String patientAddr  = Optional.ofNullable(c.getContactAddress()).orElse("");

        // ----- Hardcoded doctor info (per your note) -----
        String doctorName  = "Dr. Dimitris–Christos Zachariades";
        String doctorReg   = "GMS101Z";
        String doctorAddr  = "GodwitCare Clinic, Healthville, HV5 9XY";
        String doctorPhone = "godwitcare whatsapp";
        String doctorEmail = "godwitcare@gmail.com";

        // Editable paragraph body
        String narrative = Optional.ofNullable(body.paragraph()).orElse("").trim();

        // ===== IMPORTANT FIX: use the REFERRAL PDF builder (not prescription) =====
        byte[] pdf = PdfMaker.makeReferralPdfV2(
                null,                       // logo (optional)
                null,                       // doctor signature image (optional)
                ascii(patientName),
                ascii(patientDob),
                ascii(patientPhone),
                ascii(patientId),
                ascii(patientAddr),
                ascii(narrative.isBlank() ? "—" : narrative), // main referral text
                ascii(doctorName),
                ascii(doctorReg),
                ascii(doctorAddr),
                ascii(doctorPhone),
                ascii(doctorEmail)
        );

        // Persist referral meta + bytes
        ReferralLetter ref = new ReferralLetter();
        ref.setConsultation(c);
        ref.setPatientName(patientName);
        ref.setPatientDob(patientDob);
        ref.setPatientId(patientId);
        ref.setPatientPhone(patientPhone);
        ref.setDoctorName(doctorName);
        ref.setDoctorReg(doctorReg);
        ref.setDoctorAddress(doctorAddr);
        ref.setDoctorPhone(doctorPhone);
        ref.setDoctorEmail(doctorEmail);
        ref.setBody(narrative);
        ref.setPdfBytes(pdf);
        ref.setFileName("referral.pdf");
        ref.setContentType("application/pdf");
        ref.setSize(pdf.length);
        ref = referrals.save(ref);

        Map<String,Object> resp = new HashMap<>();
        resp.put("id", ref.getId());
        resp.put("pdfUrl", "/api/doctor/referrals/" + ref.getId() + "/pdf");

        return ResponseEntity.created(URI.create((String) resp.get("pdfUrl"))).body(resp);
    }

    @GetMapping(value = "/referrals/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getReferralPdf(@PathVariable("id") Long id) {
        ReferralLetter ref = referrals.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Referral not found"));

        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.setContentDisposition(ContentDisposition.inline()
                .filename(Optional.ofNullable(ref.getFileName()).orElse("referral.pdf"), StandardCharsets.UTF_8)
                .build());

        return new ResponseEntity<>(ref.getPdfBytes(), h, HttpStatus.OK);
    }
}
