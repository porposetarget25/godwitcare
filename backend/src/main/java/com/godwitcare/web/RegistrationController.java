package com.godwitcare.web;

import com.godwitcare.entity.Registration;
import com.godwitcare.entity.RegistrationDocument;
import com.godwitcare.repo.RegistrationRepository;
import com.godwitcare.repo.RegistrationDocumentRepository;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api")
public class RegistrationController {

    private final RegistrationRepository repo;
    private final RegistrationDocumentRepository docs;

    public RegistrationController(RegistrationRepository repo, RegistrationDocumentRepository docs) {
        this.repo = repo;
        this.docs = docs;
    }

    @PostMapping("/registrations")
    public ResponseEntity<Registration> create(@Valid @RequestBody Registration r){
        Registration saved = repo.save(r);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/registrations/{id}")
    public ResponseEntity<Registration> update(@PathVariable("id") Long id, @Valid @RequestBody Registration r){
        return repo.findById(id)
                .map(existing -> {
                    r.setId(id);
                    return ResponseEntity.ok(repo.save(r));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/registrations/{id}")
    public ResponseEntity<Registration> get(@PathVariable("id") Long id){
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // ---- Document APIs ----

    @PostMapping(value = "/registrations/{id}/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        Registration r = repo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (file.isEmpty()) return ResponseEntity.badRequest().build();

        RegistrationDocument d = new RegistrationDocument();
        d.setRegistration(r);
        d.setOriginalFileName(
                Optional.ofNullable(file.getOriginalFilename()).orElse("upload.bin"));
        d.setContentType(
                Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
        d.setSizeBytes(file.getSize());
        d.setData(file.getBytes());
        d = docs.save(d);

        Map<String, Object> body = new HashMap<>();
        body.put("id", d.getId());
        body.put("fileName", d.getOriginalFileName());
        body.put("sizeBytes", d.getSizeBytes());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/registrations/{id}/documents")
    public ResponseEntity<List<Map<String, Object>>> listDocs(@PathVariable("id") Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        var list = docs.findByRegistrationIdOrderByCreatedAtDesc(id).stream().map(d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("fileName", d.getOriginalFileName());
            m.put("sizeBytes", d.getSizeBytes());
            m.put("createdAt", d.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping(value = "/registrations/{regId}/documents/{docId}")
    public ResponseEntity<byte[]> download(
            @PathVariable("regId") Long regId,
            @PathVariable("docId") Long docId
    ) {
        return docs.findById(docId)
                .filter(d -> Objects.equals(d.getRegistration().getId(), regId))
                .map(d -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(d.getContentType()))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + d.getOriginalFileName() + "\"")
                        .body(d.getData()))
                .orElse(ResponseEntity.notFound().build());
    }
}

