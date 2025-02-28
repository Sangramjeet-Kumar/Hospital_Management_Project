package models

type Patient struct {
    PatientID     int    `json:"patient_id"`
    FullName      string `json:"full_name"`
    ContactNumber string `json:"contact_number"`
    Email        string `json:"email"`
    Address      string `json:"address"`
    City         string `json:"city"`
    State        string `json:"state"`
    PinCode      string `json:"pin_code"`
    Gender       string `json:"gender"`
    Adhar        string `json:"adhar"`
} 