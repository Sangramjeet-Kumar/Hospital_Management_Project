package models

// Bed represents a hospital bed in the inventory
type Bed struct {
	BedID        int    `json:"bedID"`
	HospitalID   int    `json:"hospitalID"`
	BedType      string `json:"bedType"`
	Status       string `json:"status"` // available, occupied, maintenance
	HospitalName string `json:"hospitalName,omitempty"`
}

// BedType represents a type of hospital bed
type BedType struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	Total       int    `json:"total"`
	Occupied    int    `json:"occupied"`
	Vacant      int    `json:"vacant"`
}

// BedAssignment represents a patient's assignment to a bed
type BedAssignment struct {
	AssignmentID  int    `json:"assignmentID"`
	BedID         int    `json:"bedID"`
	PatientID     int    `json:"patientID"`
	PatientName   string `json:"patientName,omitempty"`
	BedType       string `json:"bedType,omitempty"`
	AdmissionDate string `json:"admissionDate"`
	DischargeDate string `json:"dischargeDate,omitempty"`
	Status        string `json:"status"` // current, discharged
	Notes         string `json:"notes,omitempty"`
}

// BedStats represents statistics for bed occupancy
type BedStats struct {
	TotalBeds     int       `json:"totalBeds"`
	OccupiedBeds  int       `json:"occupiedBeds"`
	VacantBeds    int       `json:"vacantBeds"`
	OccupancyRate float64   `json:"occupancyRate"`
	BedTypes      []BedType `json:"bedTypes"`
}
