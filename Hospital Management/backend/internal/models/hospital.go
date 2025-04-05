package models

// Hospital represents a hospital in the system
type Hospital struct {
	HospitalID int    `json:"hospitalID"`
	Name       string `json:"name"`
	City       string `json:"city"`
	State      string `json:"state"`
}
