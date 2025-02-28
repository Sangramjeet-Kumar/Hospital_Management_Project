package models

type Doctor struct {
	DoctorID      int    `json:"doctor_id"`
	FullName      string `json:"full_name"`
	Description   string `json:"description"`
	ContactNumber string `json:"contact_number"`
	Email         string `json:"email"`
	Department    string `json:"department"`
	Username      string `json:"username"`
}
