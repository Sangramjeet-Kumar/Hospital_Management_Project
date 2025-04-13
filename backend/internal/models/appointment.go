package models

import (
	"time"
)

type Appointment struct {
	AppointmentID   int       `json:"appointment_id"`
	PatientID       int       `json:"patient_id"`
	DoctorID        int       `json:"doctor_id"`
	AppointmentDate time.Time `json:"appointment_date"`
	AppointmentTime string    `json:"appointment_time"`
	Description     string    `json:"description"`
	Status          string    `json:"status"`
	Patient         Patient   `json:"patient"`
	Doctor          Doctor    `json:"doctor"`
}

type AppointmentRequest struct {
	PatientID       int    `json:"patient_id"`
	DoctorID        int    `json:"doctor_id"`
	AppointmentDate string `json:"appointment_date"`
	AppointmentTime string `json:"appointment_time"`
	Description     string `json:"description"`
}
