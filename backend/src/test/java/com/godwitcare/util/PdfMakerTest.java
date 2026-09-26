package com.godwitcare.util;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PdfMakerTest {
    private static final String LONG_ALLERGIES =
            "Penicillin (anaphylaxis), peanuts and tree nuts, ibuprofen, shellfish, latex, " +
            "adhesive dressings, chlorhexidine and macrolide antibiotics";

    @Test
    void prescriptionContainsAndWrapsAllergies() throws Exception {
        byte[] pdf = PdfMaker.makePrescriptionPdfV2(
                null, null, "Secondary Traveller", "1990-01-01", "+441234", "P-2",
                "10 Example Street", LONG_ALLERGIES, "Diagnosis", "History",
                List.of("Medicine 10 mg once daily"), "Notes",
                "Doctor", "Registration", "Clinic", "Phone", "doctor@example.com");

        String text = extract(pdf);
        assertTrue(text.contains("Allergies:"));
        assertTrue(text.contains("Penicillin (anaphylaxis)"));
        assertTrue(text.contains("macrolide antibiotics"));
        assertTrue(text.indexOf("macrolide antibiotics") < text.indexOf("Diagnosis"));
    }

    @Test
    void referralContainsAndWrapsAllergiesBeforeLetter() throws Exception {
        byte[] pdf = PdfMaker.makeReferralPdfV2(
                null, null, "Secondary Traveller", "1990-01-01", "+441234", "P-2",
                "10 Example Street", LONG_ALLERGIES, "Please assess this patient.",
                "Doctor", "Registration", "Clinic", "Phone", "doctor@example.com");

        String text = extract(pdf);
        assertTrue(text.contains("Allergies:"));
        assertTrue(text.contains("Penicillin (anaphylaxis)"));
        assertTrue(text.contains("macrolide antibiotics"));
        assertTrue(text.indexOf("macrolide antibiotics") < text.indexOf("Letter"));
    }

    private String extract(byte[] pdf) throws Exception {
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            return new PDFTextStripper().getText(document);
        }
    }
}
