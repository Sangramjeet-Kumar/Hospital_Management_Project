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

// DoctorProfile represents a doctor's profile with employee information
type DoctorProfile struct {
	DoctorID      int    `json:"doctor_id"`
	EmployeeID    int    `json:"employee_id"`
	FullName      string `json:"full_name"`
	Description   string `json:"description"`
	ContactNumber string `json:"contact_number"`
	Email         string `json:"email"`
	Department    string `json:"department"`
}

// DoctorProfileUpdate represents the updateable fields for a doctor's profile
type DoctorProfileUpdate struct {
	ContactNumber string `json:"contact_number"`
	Email         string `json:"email"`
}
