package com.godwitcare.web;

import com.godwitcare.entity.Registration;
import com.godwitcare.repo.RegistrationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class RegistrationController {

  private final RegistrationRepository repo;
  public RegistrationController(RegistrationRepository repo){ this.repo = repo; }

  @PostMapping("/registrations")
  public Registration create(@RequestBody Registration r){ return repo.save(r); }

  @PutMapping("/registrations/{id}")
  public ResponseEntity<Registration> update(@PathVariable Long id, @RequestBody Registration r){
    Optional<Registration> existing = repo.findById(id);
    if(existing.isEmpty()) return ResponseEntity.notFound().build();
    r.setId(id);
    return ResponseEntity.ok(repo.save(r));
  }

  @GetMapping("/registrations/{id}")
  public ResponseEntity<Registration> get(@PathVariable Long id){
    return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/registrations/{id}/document")
  public ResponseEntity<Registration> upload(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
    Registration r = repo.findById(id).orElse(null);
    if(r == null) return ResponseEntity.notFound().build();
    Path temp = Files.createTempFile("doc_", "_" + file.getOriginalFilename());
    Files.write(temp, file.getBytes());
    r.setDocumentFileName(temp.getFileName().toString());
    repo.save(r);
    return ResponseEntity.ok(r);
  }

  @PostMapping("/auth/login")
  public ResponseEntity<String> login(@RequestParam String email, @RequestParam String password){
    return ResponseEntity.ok("OK");
  }
}
