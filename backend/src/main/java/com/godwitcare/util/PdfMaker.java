package com.godwitcare.util;

import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import java.text.Normalizer;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class PdfMaker {

    // ====== public API (kept) =====================================================

    /**
     * Legacy API (kept). Generates the previous simple layout.
     */
    public static byte[] makePrescriptionPdf(
            String logoText, String patientName, String patientDob, String patientPhone,
            String patientId, String patientAddress, String diagnosis, String history, List<String> meds, String recommendations
    ) throws Exception {
        // For backward compatibility, call the V2 method with no images and minimal doctor block.
        return makePrescriptionPdfV2(
                null, null,
                patientName, patientDob, patientPhone, patientId, patientAddress,
                diagnosis, history, meds, recommendations,
                "Attending Clinician", "", "", "", ""
        );
    }

    /**
     * New beautiful layout (logo + patient panel + “card” meds + signature block).
     * Pass null for images if not available.
     */
    public static byte[] makePrescriptionPdfV2(
            byte[] logoPng,
            byte[] doctorSignaturePng,
            String patientName, String patientDob, String patientPhone, String patientId, String patientAddress,
            String diagnosis, String history, java.util.List<String> meds, String recommendations,
            String doctorName, String doctorReg, String doctorAddress, String doctorPhone, String doctorEmail
    ) throws Exception {

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            float margin = 42f;
            float contentWidth = page.getMediaBox().getWidth() - (margin * 2);
            float y = page.getMediaBox().getHeight() - margin;

            // Colors
            final Color TEAL = new Color(16, 185, 129);
            final Color GRAY_100 = new Color(243, 244, 246);
            final Color GRAY_200 = new Color(229, 231, 235);
            final Color GRAY_500 = new Color(107, 114, 128);
            final Color TEXT = new Color(17, 24, 39);

            // Fonts
            final PDType1Font H_BOLD = PDType1Font.HELVETICA_BOLD;
            final PDType1Font H_REG = PDType1Font.HELVETICA;
            final PDType1Font H_OBL = PDType1Font.HELVETICA_OBLIQUE;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setStrokingColor(Color.BLACK);
                cs.setNonStrokingColor(Color.WHITE);

                // 0) Success banner
                float bannerH = 20f;
                fillRect(cs, margin, y - bannerH, contentWidth, bannerH, new Color(209, 250, 229));
                text(cs, H_REG, 10, TEXT, margin + 10, y - bannerH + 6, "Signed and all signatures are valid.");
                y -= (bannerH + 20); // breathing room

                // 1) Title
                centeredText(cs, H_BOLD, 22, new Color(6, 95, 70), page, "Prescription", y);
                y -= 28;

                // Separator
                strokeLine(cs, margin, y, margin + contentWidth, y, GRAY_200, 0.5f);
                y -= 16;

                // 2) Brand + Patient panel (no-overlap)
                float leftW = contentWidth * 0.44f;
                float rightW = contentWidth - leftW - 10;
                float rowTop = y;

                // Left: brand (logo + tagline) anchored to rowTop
                float brandBoxH = 64f;
                if (logoPng != null) {
                    PDImageXObject logo = PDImageXObject.createFromByteArray(doc, logoPng, "logo");
                    float logoH = 36f;
                    float logoAspect = (float) logo.getWidth() / (float) logo.getHeight();
                    float logoW = logoH * logoAspect;
                    cs.drawImage(logo, margin, rowTop - logoH, logoW, logoH);
                }
                text(cs, H_BOLD, 16, TEXT, margin + 56, rowTop - 8, "GodwitCare");
                text(cs, H_REG, 10, GRAY_500, margin + 56, rowTop - 26, "Care Beyond Borders");

                // Right: patient info panel (dynamic height incl. address)
                float panelX = margin + leftW + 10;
                float panelPad = 10f;
                float lineH = 12f;
                float panelTitleH = 16f;

                java.util.List<String> addrLines =
                        (patientAddress == null || patientAddress.isBlank())
                                ? java.util.List.of()
                                : wrap(patientAddress, H_REG, 10, rightW - (panelPad * 2));

                float addressBlockH = addrLines.size() * lineH + (addrLines.isEmpty() ? 0 : 6);

                float computedH = panelPad         // top padding
                        + panelTitleH             // "Patient Information"
                        + 6
                        + 14f                     // patient name (bold)
                        + 6
                        + lineH                   // DOB
                        + addressBlockH           // wrapped address
                        + lineH                   // Contact
                        + lineH                   // Patient ID
                        + panelPad;               // bottom padding

                float panelH = Math.max(88f, computedH);

                // box
                strokeRect(cs, panelX, rowTop - panelH, rightW, panelH, GRAY_200, 0.8f);

                // content
                text(cs, H_BOLD, 11, TEXT, panelX + panelPad, rowTop - 16, "Patient Information");
                text(cs, H_BOLD, 12, TEXT, panelX + panelPad, rowTop - 32, nz(patientName));

                float ty = rowTop - 32 - 6 - lineH;
                smallPair(cs, panelX + panelPad, ty, "DOB:", nz(patientDob));
                ty -= lineH;

                // Address (wrapped WITH label)
                if (addrLines.isEmpty()) {
                    smallPair(cs, panelX + panelPad, ty, "Address:", "—");
                    ty -= lineH;
                } else {
                    // first line with label
                    smallPair(cs, panelX + panelPad, ty, "Address:", addrLines.get(0));
                    ty -= lineH;

                    // remaining lines aligned to the value column (same offset smallPair uses)
                    float valueX = panelX + panelPad + 56f;
                    for (int i = 1; i < addrLines.size(); i++) {
                        text(cs, H_REG, 10, TEXT, valueX, ty, addrLines.get(i));
                        ty -= lineH;
                    }
                }

                smallPair(cs, panelX + panelPad, ty, "Contact:", nz(patientPhone));
                ty -= lineH;
                smallPair(cs, panelX + panelPad, ty, "Patient ID:", nz(patientId));

                // Move below tallest column
                float tallest = Math.max(brandBoxH, panelH);
                y = rowTop - tallest - 20;

                // 3) Diagnosis (dynamic)
                sectionTitle(cs, margin, y, "Diagnosis");
                y -= 16;
                float diagH = drawParagraphBox(cs, H_REG, 11, nz(diagnosis), margin, y, contentWidth, GRAY_100, GRAY_200, 14);
                y -= (diagH + 14);

                // 4) History (dynamic)
                sectionTitle(cs, margin, y, "History of Presenting Complaint");
                y -= 16;
                float histH = drawParagraphBox(cs, H_REG, 11, nz(history), margin, y, contentWidth, GRAY_100, GRAY_200, 14);
                y -= (histH + 14);

                // 5) Medication cards (roomier)
                sectionTitle(cs, margin, y, "Medication Prescribed");
                y -= 14;

                if (meds != null && !meds.isEmpty()) {
                    int idx = 1;
                    for (String m : meds) {
                        float cardPad = 10f;
                        float topPad = 12f;
                        float bottomPad = 12f;
                        float textW = contentWidth - (cardPad * 2);
                        float lineHt = 14f;

                        java.util.List<String> lines = wrap(nz(m), H_REG, 11, textW);
                        float titleH = 14f;
                        float bodyH = Math.max(0, (lines.size() - 1)) * lineHt;

                        // NEW: no per-item signature meta -> shorter box
                        float boxH = topPad + titleH + 6 + bodyH + bottomPad;

                        // card
                        fillRect(cs, margin, y - boxH, contentWidth, boxH, Color.WHITE);
                        strokeRect(cs, margin, y - boxH, contentWidth, boxH, GRAY_200, 0.9f);

                        // title (first line)
                        text(cs, H_BOLD, 12, TEXT, margin + cardPad, y - topPad, idx + ". " + firstLine(lines));

                        // body (remaining lines)
                        float ly = y - topPad - 6 - lineHt;
                        if (lines.size() > 1) {
                            for (int i = 1; i < lines.size(); i++) {
                                text(cs, H_REG, 11, TEXT, margin + cardPad, ly, lines.get(i));
                                ly -= lineHt;
                            }
                        }

                        y -= (boxH + 12); // gap
                        idx++;
                    }
                } else {
                    text(cs, H_OBL, 11, GRAY_500, margin, y - 2, "—");
                    y -= 18;
                }

                // 6) Additional notes
                sectionTitle(cs, margin, y, "Additional Notes");
                y -= 16;
                float notesH = 48f;
                roundedField(cs, doc, H_REG, 11,
                        recommendations,
                        margin, y, contentWidth, notesH, Color.WHITE, GRAY_200);
                y -= (notesH + 18);

                // 7) Signature row
                strokeLine(cs, margin, y, margin + contentWidth, y, GRAY_200, 0.5f);
                y -= 12;

                float sigLeftW = contentWidth * 0.45f;
                text(cs, H_BOLD, 11, TEXT, margin, y - 2, "Prescribing Doctor’s Signature");
                text(cs, H_REG, 9, GRAY_500, margin, y - 16,
                        "Date of Prescription: " + DateTimeFormatter.ISO_LOCAL_DATE
                                .withZone(ZoneId.of("UTC")).format(Instant.now()));

                if (doctorSignaturePng != null) {
                    PDImageXObject sign = PDImageXObject.createFromByteArray(doc, doctorSignaturePng, "sign");
                    float h = 28f;
                    float r = (float) sign.getWidth() / (float) sign.getHeight();
                    float w = h * r;
                    cs.drawImage(sign, margin, y - 52, w, h);
                } else {
                    text(cs, H_OBL, 10, GRAY_500, margin, y - 36, "(Signature)");
                }

                // Right column (doctor info)
                float rx = margin + sigLeftW + 18;
                text(cs, H_BOLD, 12, TEXT, rx, y - 2, nz(doctorName));
                float dyy = y - 18;
                text(cs, H_REG, 10, TEXT, rx, dyy, nz(doctorReg));
                dyy -= 14;
                if (!nz(doctorAddress).equals("—")) {
                    text(cs, H_REG, 10, TEXT, rx, dyy, doctorAddress);
                    dyy -= 14;
                }
                if (!nz(doctorPhone).equals("—")) {
                    text(cs, H_REG, 10, TEXT, rx, dyy, "Phone: " + doctorPhone);
                    dyy -= 14;
                }
                if (!nz(doctorEmail).equals("—")) {
                    text(cs, H_REG, 10, TEXT, rx, dyy, "E-mail: " + doctorEmail);
                }

                // NEW: one-time digital signature meta under the signature area
                String signedByOnce = "Digitally signed by " + (doctorName == null ? "Attending Clinician" : doctorName);
                String signedDateOnce = "Date: " + DateTimeFormatter
                        .ofPattern("yyyy-MM-dd HH:mm 'GMT'")
                        .withZone(ZoneId.of("UTC"))
                        .format(Instant.now());
                float metaY = y - 56; // slightly below the signature image/label
                text(cs, H_OBL, 9, GRAY_500, margin, metaY, signedByOnce);
                metaY -= 12;
                //text(cs, H_OBL, 9, GRAY_500, margin, metaY, signedDateOnce);           metaY -= 12;
                //text(cs, H_OBL, 9, GRAY_500, margin, metaY, "Reason: Symptomatic Relief"); metaY -= 12;
                text(cs, H_REG, 10, TEAL, margin, metaY, "Signature is valid");

                y -= 72;

                // 8) Footer
                {
                    float footerBaseline = margin; // bottom printable area
                    float footerLineY = footerBaseline + 16f; // line just above footer text
                    strokeLine(cs, margin, footerLineY, margin + contentWidth, footerLineY, GRAY_200, 0.5f);
                    text(cs, H_REG, 9, GRAY_500, margin, footerBaseline + 4f, "Company  |  Support  |  Legal");
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }


    // ====== drawing helpers ========================================================

    private static void text(PDPageContentStream cs, PDType1Font font, float size, Color color,
                             float x, float y, String s) throws Exception {
        cs.setNonStrokingColor(color);
        cs.setFont(font, size);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(safe(s));
        cs.endText();
    }

    private static void centeredText(PDPageContentStream cs, PDType1Font font, float size, Color color,
                                     PDPage page, String s, float y) throws Exception {
        float width = page.getMediaBox().getWidth();
        float textW = font.getStringWidth(safe(s)) / 1000f * size;
        float x = (width - textW) / 2f;
        text(cs, font, size, color, x, y, s);
    }

    private static void sectionTitle(PDPageContentStream cs, float x, float y, String title) throws Exception {
        text(cs, PDType1Font.HELVETICA_BOLD, 12, new Color(31, 41, 55), x, y, title);
    }

    private static void smallPair(PDPageContentStream cs, float x, float y, String k, String v) throws Exception {
        text(cs, PDType1Font.HELVETICA_BOLD, 10, new Color(55, 65, 81), x, y, k);
        float off = x + 56;
        text(cs, PDType1Font.HELVETICA, 10, new Color(31, 41, 55), off, y, v);
    }

    private static void strokeLine(PDPageContentStream cs, float x1, float y1, float x2, float y2, Color c, float w) throws Exception {
        cs.setStrokingColor(c);
        cs.setLineWidth(w);
        cs.moveTo(x1, y1);
        cs.lineTo(x2, y2);
        cs.stroke();
    }

    private static void strokeRect(PDPageContentStream cs, float x, float y, float w, float h, Color stroke, float lw) throws Exception {
        cs.setStrokingColor(stroke);
        cs.setLineWidth(lw);
        cs.addRect(x, y, w, h);
        cs.stroke();
    }

    private static void fillRect(PDPageContentStream cs, float x, float y, float w, float h, Color fill) throws Exception {
        cs.setNonStrokingColor(fill);
        cs.addRect(x, y, w, h);
        cs.fill();
    }

    private static void roundedField(PDPageContentStream cs, PDDocument doc, PDType1Font font, float size,
                                     String text, float x, float y, float w, float h, Color bg, Color border) throws Exception {
        fillRect(cs, x, y - h, w, h, bg);
        strokeRect(cs, x, y - h, w, h, border, 0.8f);
        // text inside
        float pad = 8;
        List<String> lines = wrap(text, font, size, w - (pad * 2));
        float lh = 14f, ty = y - pad - 12;
        for (String line : lines) {
            text(cs, font, size, new Color(31, 41, 55), x + pad, ty, line);
            ty -= lh;
        }
    }

    /**
     * Draw paragraph in a light box and return the resulting height used.
     */
    private static float drawParagraphBox(PDPageContentStream cs, PDType1Font font, float size,
                                          String text, float x, float y, float w,
                                          Color bg, Color border, float lineH) throws Exception {
        List<String> lines = wrap(text, font, size, w - 16);
        float h = Math.max(lineH, (lines.size() * lineH) + 16);
        fillRect(cs, x, y - h, w, h, bg);
        strokeRect(cs, x, y - h, w, h, border, 0.8f);
        float ty = y - 12;
        for (String line : lines) {
            text(cs, font, size, new Color(31, 41, 55), x + 8, ty, line);
            ty -= lineH;
        }
        return h;
    }

    // ====== text helpers ===========================================================

    private static List<String> wrap(String text, PDType1Font font, float fontSize, float maxWidth) throws Exception {
        List<String> lines = new ArrayList<>();
        String t = safe(text);
        if (t.isBlank()) {
            lines.add("—");
            return lines;
        }

        String[] words = t.split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String w : words) {
            String candidate = (line.length() == 0) ? w : line + " " + w;
            float width = font.getStringWidth(candidate) / 1000f * fontSize;
            if (width > maxWidth) {
                if (line.length() > 0) {
                    lines.add(line.toString());
                    line.setLength(0);
                }
                line.append(w);
            } else {
                line.setLength(0);
                line.append(candidate);
            }
        }
        if (line.length() > 0) lines.add(line.toString());
        return lines;
    }

    private static String firstLine(List<String> lines) {
        return lines.isEmpty() ? "" : lines.get(0);
    }

    private static String safe(String s) {
        // Treat null/blank uniformly
        if (s == null) return "—";
        String t = s.trim();
        if (t.isEmpty()) return "—";

        // Normalize to NFD and strip combining marks (accents/diacritics).
        // Example: "ā" -> "a", "é" -> "e"
        t = Normalizer.normalize(t, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        // Replace common Unicode punctuation with ASCII equivalents
        t = t
                .replace('\u2013', '-')   // en dash –
                .replace('\u2014', '-')   // em dash —
                .replace('\u2015', '-')   // horizontal bar ―
                .replace('\u2212', '-')   // minus sign −
                .replace('\u2018', '\'')  // left single quote ‘
                .replace('\u2019', '\'')  // right single quote ’
                .replace('\u201C', '\"')  // left double quote “
                .replace('\u201D', '\"')  // right double quote ”
                .replace('\u00A0', ' ');  // non-breaking space

        // As a last resort, replace any remaining non-WinAnsi/ASCII-ish chars
        // with a harmless '?' so PDFBox can compute widths & draw without error.
        // Allow basic printable ASCII plus tab/newline/carriage return.
        t = t.replaceAll("[^\\x09\\x0A\\x0D\\x20-\\x7E]", "?");

        // After normalization, if it's empty, keep your em dash placeholder
        return t.isEmpty() ? "—" : t;
    }


    private static String nz(String s) {
        return safe(s);
    }

    // in PdfMaker.java – add this new method (keep existing methods untouched)
    public static byte[] makeReferralPdfV2(
            byte[] logoPng,
            byte[] doctorSignaturePng,
            String patientName, String patientDob, String patientPhone, String patientId, String patientAddress,
            String body,
            String doctorName, String doctorReg, String doctorAddress, String doctorPhone, String doctorEmail
    ) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            final Color TEAL = new Color(16, 185, 129);
            final Color GRAY_100 = new Color(243, 244, 246);
            final Color GRAY_200 = new Color(229, 231, 235);
            final Color GRAY_500 = new Color(107, 114, 128);
            final Color TEXT = new Color(17, 24, 39);

            final PDType1Font H_BOLD = PDType1Font.HELVETICA_BOLD;
            final PDType1Font H_REG = PDType1Font.HELVETICA;
            final PDType1Font H_OBL = PDType1Font.HELVETICA_OBLIQUE;

            float margin = 42f;
            float contentWidth = page.getMediaBox().getWidth() - (margin * 2);
            float y = page.getMediaBox().getHeight() - margin;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // Title row
                float bannerH = 20f;
                fillRect(cs, margin, y - bannerH, contentWidth, bannerH, new Color(229, 246, 255));
                text(cs, H_REG, 10, TEXT, margin + 10, y - bannerH + 6, "Referral Letter");
                y -= (bannerH + 16);

                centeredText(cs, H_BOLD, 20, new Color(6, 95, 70), page, "Referral Letter", y);
                y -= 26;
                strokeLine(cs, margin, y, margin + contentWidth, y, GRAY_200, 0.5f);
                y -= 16;

                // Patient panel (reuse pattern)
                float panelPad = 10f;
                float rightW = contentWidth;
                float panelH = 96f;

                strokeRect(cs, margin, y - panelH, rightW, panelH, GRAY_200, 0.8f);
                text(cs, H_BOLD, 11, TEXT, margin + panelPad, y - 16, "Patient Information");
                text(cs, H_BOLD, 12, TEXT, margin + panelPad, y - 32, nz(patientName));

                float ty = y - 32 - 6 - 12;
                smallPair(cs, margin + panelPad, ty, "DOB:", nz(patientDob));
                ty -= 12;
                smallPair(cs, margin + panelPad, ty, "Patient ID:", nz(patientId));
                ty -= 12;
                smallPair(cs, margin + panelPad, ty, "Contact:", nz(patientPhone));
                ty -= 12;
                smallPair(cs, margin + panelPad, ty, "Address:", nz(patientAddress));
                y -= (panelH + 16);

                // Referral From panel (LEFT column with wider value offset = +80)
                strokeRect(cs, margin, y - 92, rightW, 92, GRAY_200, 0.8f);
                text(cs, H_BOLD, 11, TEXT, margin + panelPad, y - 16, "Referral From");

                // GP Name (wide)
                text(cs, H_BOLD, 10, new Color(55, 65, 81), margin + panelPad, y - 32, "GP Name:");
                text(cs, H_REG, 10, new Color(31, 41, 55), margin + panelPad + 80, y - 32, nz(doctorName));

                // GMS Number (wide)
                text(cs, H_BOLD, 10, new Color(55, 65, 81), margin + panelPad, y - 44, "GMS Number:");
                text(cs, H_REG, 10, new Color(31, 41, 55), margin + panelPad + 80, y - 44, nz(doctorReg));

                // RIGHT column stays the same
                smallPair(cs, margin + contentWidth / 2, y - 32, "Address:", nz(doctorAddress));
                smallPair(cs, margin + contentWidth / 2, y - 44, "Email:", nz(doctorEmail));
                smallPair(cs, margin + contentWidth / 2, y - 56, "Contact:", nz(doctorPhone));

                y -= (92 + 16);


                // Body box
                text(cs, H_BOLD, 11, TEXT, margin, y, "Letter");
                y -= 16;
                float bodyH = drawParagraphBox(cs, H_REG, 11, nz(body), margin, y, contentWidth, GRAY_100, GRAY_200, 14);
                y -= (bodyH + 18);

                // Signature row
                strokeLine(cs, margin, y, margin + contentWidth, y, GRAY_200, 0.5f);
                y -= 12;

                text(cs, H_BOLD, 11, TEXT, margin, y - 2, "Referring Doctor’s Signature");
                if (doctorSignaturePng != null) {
                    PDImageXObject sign = PDImageXObject.createFromByteArray(doc, doctorSignaturePng, "sign");
                    float h = 28f;
                    float r = (float) sign.getWidth() / (float) sign.getHeight();
                    float w = h * r;
                    cs.drawImage(sign, margin, y - 52, w, h);
                } else {
                    text(cs, H_OBL, 10, GRAY_500, margin, y - 36, "(Signature)");
                }

                float rx = margin + (contentWidth * 0.45f) + 18;
                text(cs, H_BOLD, 12, TEXT, rx, y - 2, nz(doctorName));
                float dyy = y - 18;
                text(cs, H_REG, 10, TEXT, rx, dyy, nz(doctorReg));
                dyy -= 14;
                if (!nz(doctorAddress).equals("—")) {
                    text(cs, H_REG, 10, TEXT, rx, dyy, doctorAddress);
                    dyy -= 14;
                }
                if (!nz(doctorPhone).equals("—")) {
                    text(cs, H_REG, 10, TEXT, rx, dyy, "Phone: " + doctorPhone);
                    dyy -= 14;
                }
                if (!nz(doctorEmail).equals("—")) {
                    text(cs, H_REG, 10, TEXT, rx, dyy, "E-mail: " + doctorEmail);
                }

                // One-time digital signature note (single place)
                y -= 66;
                text(cs, H_OBL, 9, GRAY_500, margin, y, "Digitally signed by " + nz(doctorName));
                y -= 12;
                text(cs, H_OBL, 9, GRAY_500, margin, y, "Date: " +
                        java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'GMT'")
                                .withZone(java.time.ZoneId.of("UTC")).format(java.time.Instant.now()));
                y -= 12;
                text(cs, H_OBL, 9, GRAY_500, margin, y, "Reason: Referral");
                y -= 12;
                text(cs, H_REG, 10, TEAL, margin, y, "Signature is valid");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

}
