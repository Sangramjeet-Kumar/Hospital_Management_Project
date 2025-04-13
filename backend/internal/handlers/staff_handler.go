package handlers

import (
	"encoding/json"
	"hospital-management/backend/internal/database"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// StaffStats represents dashboard statistics for staff members
type StaffStats struct {
	TotalPatients     int `json:"totalPatients"`
	AssignedPatients  int `json:"assignedPatients"`
	AvailableBeds     int `json:"availableBeds"`
	TodayAppointments int `json:"todayAppointments"`
}

// StaffProfile represents a staff member's profile
type StaffProfile struct {
	EmployeeID    int    `json:"employeeId"`
	FullName      string `json:"fullName"`
	Email         string `json:"email"`
	ContactNumber string `json:"contactNumber"`
	Department    string `json:"department"`
	Designation   string `json:"designation"`
	Role          string `json:"role"`
}

// PatientData represents patient information for staff view
type PatientData struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Age           int    `json:"age,omitempty"`
	Gender        string `json:"gender"`
	Contact       string `json:"contact"`
	Email         string `json:"email"`
	Doctor        string `json:"doctor,omitempty"`
	Bed           int    `json:"bed"`
	Status        string `json:"status"`
	AdmissionDate string `json:"admissionDate,omitempty"`
}

// GetStaffStats returns dashboard statistics for staff
func GetStaffStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var stats StaffStats

	// Get total patients
	err := database.DB.QueryRow("SELECT COUNT(*) FROM Patients").Scan(&stats.TotalPatients)
	if err != nil {
		log.Printf("Error counting patients: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get assigned patients (patients with bed assignments)
	err = database.DB.QueryRow(`
		SELECT COUNT(DISTINCT PatientID) 
		FROM BedAssignments 
		WHERE DischargeDate IS NULL
	`).Scan(&stats.AssignedPatients)
	if err != nil {
		log.Printf("Error counting assigned patients: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get available beds
	err = database.DB.QueryRow(`
		SELECT SUM(VacantBeds) 
		FROM BedsCount
	`).Scan(&stats.AvailableBeds)
	if err != nil {
		log.Printf("Error counting available beds: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get today's appointments
	today := time.Now().Format("2006-01-02")
	err = database.DB.QueryRow(`
		SELECT COUNT(*) 
		FROM Appointment 
		WHERE AppointmentDate = ?
	`, today).Scan(&stats.TodayAppointments)
	if err != nil {
		log.Printf("Error counting today's appointments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(stats)
}

// GetStaffProfile returns the profile information for a staff member
func GetStaffProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	vars := mux.Vars(r)
	staffIDStr := vars["id"]

	staffID, err := strconv.Atoi(staffIDStr)
	if err != nil {
		log.Printf("Invalid staff ID: %v", err)
		sendJSONError(w, "Invalid staff ID", http.StatusBadRequest)
		return
	}

	var profile StaffProfile
	err = database.DB.QueryRow(`
		SELECT 
			e.EmployeeID, 
			e.FullName, 
			e.Email, 
			e.ContactNumber, 
			s.Department, 
			s.Designation,
			e.Role
		FROM 
			Employees e
		JOIN 
			HospitalStaff s ON e.EmployeeID = s.EmployeeID
		WHERE 
			e.EmployeeID = ? AND e.Role = 'staff'
	`, staffID).Scan(
		&profile.EmployeeID,
		&profile.FullName,
		&profile.Email,
		&profile.ContactNumber,
		&profile.Department,
		&profile.Designation,
		&profile.Role,
	)

	if err != nil {
		log.Printf("Error fetching staff profile: %v", err)
		sendJSONError(w, "Staff profile not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(profile)
}

// UpdateStaffProfile updates the contact information for a staff member
func UpdateStaffProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	staffIDStr := vars["id"]

	staffID, err := strconv.Atoi(staffIDStr)
	if err != nil {
		log.Printf("Invalid staff ID: %v", err)
		sendJSONError(w, "Invalid staff ID", http.StatusBadRequest)
		return
	}

	var updateReq struct {
		Email         string `json:"email"`
		ContactNumber string `json:"contactNumber"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		log.Printf("Error decoding request: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(`
		UPDATE Employees
		SET Email = ?, ContactNumber = ?
		WHERE EmployeeID = ?
	`, updateReq.Email, updateReq.ContactNumber, staffID)

	if err != nil {
		log.Printf("Error updating staff profile: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// GetStaffPatients returns the list of patients for staff view
func GetStaffPatients(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// First, get all patients
	rows, err := database.DB.Query(`
		SELECT 
			p.PatientID,
			p.FullName,
			p.Gender,
			p.ContactNumber,
			p.Email
		FROM 
			Patients p
		ORDER BY 
			p.PatientID DESC
	`)

	if err != nil {
		log.Printf("Error querying patients: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var patients []PatientData
	for rows.Next() {
		var patient PatientData
		err := rows.Scan(
			&patient.ID,
			&patient.Name,
			&patient.Gender,
			&patient.Contact,
			&patient.Email,
		)

		if err != nil {
			log.Printf("Error scanning patient row: %v", err)
			continue
		}

		// Default values
		patient.Status = "new"
		patient.Bed = 0

		patients = append(patients, patient)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating patient rows: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get bed assignments (for admitted patients)
	bedRows, err := database.DB.Query(`
		SELECT 
			ba.PatientID,
			ba.BedID,
			ba.AdmissionDate
		FROM 
			BedAssignments ba
		WHERE 
			ba.DischargeDate IS NULL
	`)

	if err != nil {
		log.Printf("Error querying bed assignments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer bedRows.Close()

	// Create a map for quick patient lookup
	patientMap := make(map[int]*PatientData)
	for i := range patients {
		patientMap[patients[i].ID] = &patients[i]
	}

	// Update admitted patients with bed info
	for bedRows.Next() {
		var patientID, bedID int
		var admissionDate string

		err := bedRows.Scan(&patientID, &bedID, &admissionDate)
		if err != nil {
			log.Printf("Error scanning bed row: %v", err)
			continue
		}

		if patient, exists := patientMap[patientID]; exists {
			patient.Status = "admitted"
			patient.Bed = bedID
			patient.AdmissionDate = admissionDate
		}
	}

	// Get doctor assignments (for patients with appointments)
	apptRows, err := database.DB.Query(`
		SELECT DISTINCT
			a.PatientID,
			d.FullName as DoctorName
		FROM 
			Appointment a
		JOIN 
			Doctors d ON a.DoctorID = d.DoctorID
	`)

	if err != nil {
		log.Printf("Error querying doctor assignments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer apptRows.Close()

	// Update patients with doctor info and registered status
	for apptRows.Next() {
		var patientID int
		var doctorName string

		err := apptRows.Scan(&patientID, &doctorName)
		if err != nil {
			log.Printf("Error scanning appointment row: %v", err)
			continue
		}

		if patient, exists := patientMap[patientID]; exists {
			patient.Doctor = doctorName
			// Only update status if patient is not already admitted
			if patient.Status != "admitted" {
				patient.Status = "registered"
			}
		}
	}

	// Sort patients: admitted first, then registered, then new
	sortedPatients := make([]PatientData, 0, len(patients))

	// First add admitted patients
	for _, p := range patients {
		if p.Status == "admitted" {
			sortedPatients = append(sortedPatients, p)
		}
	}

	// Then add registered patients
	for _, p := range patients {
		if p.Status == "registered" {
			sortedPatients = append(sortedPatients, p)
		}
	}

	// Finally add new patients
	for _, p := range patients {
		if p.Status == "new" {
			sortedPatients = append(sortedPatients, p)
		}
	}

	json.NewEncoder(w).Encode(sortedPatients)
}

// GetBedStatus returns the current bed status information
func GetBedStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	wardFilter := r.URL.Query().Get("ward")
	statusFilter := r.URL.Query().Get("status")

	// Build query with optional filters
	query := `
		SELECT 
			bi.BedID,
			bi.BedType,
			CASE 
				WHEN ba.PatientID IS NULL THEN 'available'
				ELSE 'occupied'
			END as Status,
			IFNULL(p.PatientID, 0) as PatientID,
			IFNULL(p.FullName, '') as PatientName,
			IFNULL(ba.AdmissionDate, '') as AdmissionDate
		FROM 
			BedInventory bi
		LEFT JOIN 
			(SELECT BedID, PatientID, AdmissionDate 
			 FROM BedAssignments 
			 WHERE DischargeDate IS NULL) ba 
			ON bi.BedID = ba.BedID
		LEFT JOIN 
			Patients p ON ba.PatientID = p.PatientID
	`

	var args []interface{}
	var whereConditions []string

	if wardFilter != "" && wardFilter != "all" {
		whereConditions = append(whereConditions, "bi.BedType = ?")
		args = append(args, wardFilter)
	}

	if statusFilter != "" && statusFilter != "all" {
		if statusFilter == "available" {
			whereConditions = append(whereConditions, "ba.PatientID IS NULL")
		} else if statusFilter == "occupied" {
			whereConditions = append(whereConditions, "ba.PatientID IS NOT NULL")
		}
	}

	// Add WHERE clause if we have conditions
	if len(whereConditions) > 0 {
		query += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	query += " ORDER BY bi.BedType, bi.BedID"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying bed status: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var beds []map[string]interface{}
	for rows.Next() {
		var bedID int
		var bedType, status, patientName, admissionDate string
		var patientID int

		err := rows.Scan(
			&bedID,
			&bedType,
			&status,
			&patientID,
			&patientName,
			&admissionDate,
		)

		if err != nil {
			log.Printf("Error scanning bed row: %v", err)
			continue
		}

		bed := map[string]interface{}{
			"bedId":       bedID,
			"type":        bedType,
			"status":      status,
			"patientId":   patientID,
			"patientName": patientName,
		}

		if admissionDate != "" {
			bed["admissionDate"] = admissionDate
		}

		beds = append(beds, bed)
	}

	json.NewEncoder(w).Encode(beds)
}

// GetStaffAppointments returns appointments relevant to staff
func GetStaffAppointments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	doctorFilter := r.URL.Query().Get("doctor")
	departmentFilter := r.URL.Query().Get("department")
	dateFilter := r.URL.Query().Get("date")

	query := `
		SELECT 
			a.AppointmentID,
			d.FullName as DoctorName,
			d.Department,
			p.FullName as PatientName,
			p.ContactNumber,
			DATE_FORMAT(a.AppointmentDate, '%Y-%m-%d') as AppointmentDate,
			a.AppointmentTime,
			a.Status,
			a.Description
		FROM 
			Appointment a
		JOIN 
			Doctors d ON a.DoctorID = d.DoctorID
		JOIN 
			Patients p ON a.PatientID = p.PatientID
		WHERE 1=1
	`

	var args []interface{}

	if doctorFilter != "" && doctorFilter != "all" {
		query += " AND d.DoctorID = ?"
		args = append(args, doctorFilter)
	}

	if departmentFilter != "" && departmentFilter != "all" {
		query += " AND d.Department = ?"
		args = append(args, departmentFilter)
	}

	if dateFilter != "" {
		query += " AND a.AppointmentDate = ?"
		args = append(args, dateFilter)
	} else {
		// Default to show future appointments if no date filter
		query += " AND a.AppointmentDate >= CURDATE()"
	}

	query += " ORDER BY a.AppointmentDate, a.AppointmentTime"

	// Log the final query for debugging
	log.Println("Final appointment query:", query)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying appointments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var appointments []map[string]interface{}
	for rows.Next() {
		var appointmentID int
		var doctorName, department, patientName, contactNumber string
		var appointmentDate, appointmentTime, status, description string

		err := rows.Scan(
			&appointmentID,
			&doctorName,
			&department,
			&patientName,
			&contactNumber,
			&appointmentDate,
			&appointmentTime,
			&status,
			&description,
		)

		if err != nil {
			log.Printf("Error scanning appointment row: %v", err)
			continue
		}

		appointment := map[string]interface{}{
			"id":          appointmentID,
			"doctorName":  doctorName,
			"department":  department,
			"patientName": patientName,
			"contact":     contactNumber,
			"date":        appointmentDate,
			"time":        appointmentTime,
			"status":      status,
			"description": description,
		}

		appointments = append(appointments, appointment)
	}

	json.NewEncoder(w).Encode(appointments)
}
