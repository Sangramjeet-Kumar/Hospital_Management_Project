package models

// Employee represents a hospital employee (admin, doctor, or staff)
type Employee struct {
	EmployeeID    int    `json:"employeeId"`
	HospitalID    int    `json:"hospitalId"`
	Password      string `json:"-"` // Never expose password in JSON responses
	FullName      string `json:"fullName"`
	Email         string `json:"email"`
	ContactNumber string `json:"contactNumber"`
	Role          string `json:"role"` // "admin", "staff", or "doctor"
}

// LoginRequest represents the login credentials sent by the user
type LoginRequest struct {
	EmployeeID string `json:"employeeId"`
	Password   string `json:"password"`
	Role       string `json:"role"`
}

// LoginResponse represents the response sent after successful authentication
type LoginResponse struct {
	Success     bool   `json:"success"`
	EmployeeID  int    `json:"employeeId"`
	FullName    string `json:"fullName"`
	Role        string `json:"role"`
	RedirectURL string `json:"redirectUrl"`
}
