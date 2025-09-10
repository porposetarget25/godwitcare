package com.godwitcare.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

@Entity
public class Registration {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String firstName;
  private String middleName;
  private String lastName;
  private LocalDate dateOfBirth;
  private String gender;
  private String primaryWhatsAppNumber;
  private String carerSecondaryWhatsAppNumber;

    @NotBlank
    @Email
    @Column(name = "email_address", nullable = false)
  private String emailAddress;

  private Boolean longTermMedication;
  private Boolean healthCondition;
  private Boolean allergies;
  private Boolean fitToFlyCertificate;

  private String travellingFrom;
  private String travellingTo;
  private LocalDate travelStartDate;
  private LocalDate travelEndDate;
  private Integer packageDays;
  private String documentFileName;

  public Long getId(){ return id; } public void setId(Long id){ this.id=id; }
  public String getFirstName(){ return firstName; } public void setFirstName(String v){ this.firstName=v; }
  public String getMiddleName(){ return middleName; } public void setMiddleName(String v){ this.middleName=v; }
  public String getLastName(){ return lastName; } public void setLastName(String v){ this.lastName=v; }
  public LocalDate getDateOfBirth(){ return dateOfBirth; } public void setDateOfBirth(LocalDate v){ this.dateOfBirth=v; }
  public String getGender(){ return gender; } public void setGender(String v){ this.gender=v; }
  public String getPrimaryWhatsAppNumber(){ return primaryWhatsAppNumber; } public void setPrimaryWhatsAppNumber(String v){ this.primaryWhatsAppNumber=v; }
  public String getCarerSecondaryWhatsAppNumber(){ return carerSecondaryWhatsAppNumber; } public void setCarerSecondaryWhatsAppNumber(String v){ this.carerSecondaryWhatsAppNumber=v; }
  public String getEmailAddress(){ return emailAddress; } public void setEmailAddress(String v){ this.emailAddress=v; }
  public Boolean getLongTermMedication(){ return longTermMedication; } public void setLongTermMedication(Boolean v){ this.longTermMedication=v; }
  public Boolean getHealthCondition(){ return healthCondition; } public void setHealthCondition(Boolean v){ this.healthCondition=v; }
  public Boolean getAllergies(){ return allergies; } public void setAllergies(Boolean v){ this.allergies=v; }
  public Boolean getFitToFlyCertificate(){ return fitToFlyCertificate; } public void setFitToFlyCertificate(Boolean v){ this.fitToFlyCertificate=v; }
  public String getTravellingFrom(){ return travellingFrom; } public void setTravellingFrom(String v){ this.travellingFrom=v; }
  public String getTravellingTo(){ return travellingTo; } public void setTravellingTo(String v){ this.travellingTo=v; }
  public LocalDate getTravelStartDate(){ return travelStartDate; } public void setTravelStartDate(LocalDate v){ this.travelStartDate=v; }
  public LocalDate getTravelEndDate(){ return travelEndDate; } public void setTravelEndDate(LocalDate v){ this.travelEndDate=v; }
  public Integer getPackageDays(){ return packageDays; } public void setPackageDays(Integer v){ this.packageDays=v; }
  public String getDocumentFileName(){ return documentFileName; } public void setDocumentFileName(String v){ this.documentFileName=v; }
}
