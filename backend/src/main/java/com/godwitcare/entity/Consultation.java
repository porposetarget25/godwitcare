package com.godwitcare.entity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Entity
public class Consultation {

    // ----- static JSON helpers (no service dependency) -----
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, String>> MAP_STR_STR =
            new TypeReference<>() {};

    private static String toJson(Map<String,String> m) {
        try { return m == null ? null : MAPPER.writeValueAsString(m); }
        catch (Exception e) { throw new IllegalArgumentException("Serialize JSON", e); }
    }
    private static Map<String,String> fromJson(String json) {
        try { return json == null || json.isBlank()
                ? Collections.emptyMap()
                : MAPPER.readValue(json, MAP_STR_STR); }
        catch (Exception e) { throw new IllegalArgumentException("Parse JSON", e); }
    }

    // ----- fields -----
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String currentLocation;

    // Patient Contact & Address
    private String contactName;
    private String contactPhone;   // WhatsApp number
    @Column(length = 2000)
    private String contactAddress;

    // Questionnaire answers (qid -> "Yes"/"No") stored as JSON
    @Column(length = 8000)
    private String answersJson;

    // NEW: Optional free-text notes per question (qid -> note) stored as JSON
    @Column(length = 8000)
    private String detailsByQuestionJson;

    private Instant createdAt = Instant.now();

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    public enum Status { PENDING, IN_PROGRESS, DONE }

    // ----- getters/setters (existing) -----
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getCurrentLocation() { return currentLocation; }
    public void setCurrentLocation(String currentLocation) { this.currentLocation = currentLocation; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getContactAddress() { return contactAddress; }
    public void setContactAddress(String contactAddress) { this.contactAddress = contactAddress; }
    public String getAnswersJson() { return answersJson; }
    public void setAnswersJson(String answersJson) { this.answersJson = answersJson; }

    // ----- NEW: convenience map accessors -----
    /** Get answers as a Map (qid -> "Yes"/"No") */
    @Transient
    public Map<String,String> getAnswers() {
        return fromJson(this.answersJson);
    }
    /** Set answers via Map (will serialize to answersJson) */
    public void setAnswers(Map<String,String> answers) {
        this.answersJson = toJson(answers);
    }

    /** Get per-question notes as a Map (qid -> note) */
    @Transient
    public Map<String,String> getDetailsByQuestion() {
        return fromJson(this.detailsByQuestionJson);
    }
    /** Set per-question notes via Map (will serialize to detailsByQuestionJson) */
    public void setDetailsByQuestion(Map<String,String> details) {
        this.detailsByQuestionJson = toJson(details);
    }

    // direct JSON accessors (if you need them elsewhere)
    public String getDetailsByQuestionJson() { return detailsByQuestionJson; }
    public void setDetailsByQuestionJson(String detailsByQuestionJson) { this.detailsByQuestionJson = detailsByQuestionJson; }

    public Instant getCreatedAt() { return createdAt; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
