package handlers

import (
	"database/sql"
	"encoding/json"
	"hospital-management/backend/internal/database"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
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
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for staff profile handled")
		return
	}
	
	log.Printf("GetStaffProfile called with query params: %v", r.URL.Query())
	
	// Get employee ID from the query parameter
	employeeIDStr := r.URL.Query().Get("employeeId")
	if employeeIDStr == "" {
		log.Println("Missing employeeId parameter")
		http.Error(w, "EmployeeID is required", http.StatusBadRequest)
		return
	}

	employeeID, err := strconv.Atoi(employeeIDStr)
	if err != nil {
		log.Printf("Invalid employeeId format: %s - %v", employeeIDStr, err)
		http.Error(w, "Invalid EmployeeID format", http.StatusBadRequest)
		return
	}

	log.Printf("Fetching staff profile for employeeID: %d", employeeID)

	var profile StaffProfile
	// First try to get a staff profile from the HospitalStaff table
	err = database.DB.QueryRow(`
		SELECT 
			e.EmployeeID, 
			e.FullName, 
			e.Email, 
			e.ContactNumber, 
			COALESCE(s.Department, '') as Department, 
			COALESCE(s.Designation, '') as Designation,
			e.Role
		FROM 
			Employees e
		LEFT JOIN 
			HospitalStaff s ON e.EmployeeID = s.EmployeeID
		WHERE 
			e.EmployeeID = ? AND e.Role = 'staff'
	`, employeeID).Scan(
		&profile.EmployeeID,
		&profile.FullName,
		&profile.Email,
		&profile.ContactNumber,
		&profile.Department,
		&profile.Designation,
		&profile.Role,
	)

	// If not found as staff, try to get just the employee record
	if err == sql.ErrNoRows {
		log.Printf("No staff profile found for employee ID %d, checking for employee record", employeeID)
		err = database.DB.QueryRow(`
			SELECT 
				EmployeeID, 
				FullName, 
				Email, 
				ContactNumber, 
				Role
			FROM 
				Employees
			WHERE 
				EmployeeID = ?
		`, employeeID).Scan(
			&profile.EmployeeID,
			&profile.FullName,
			&profile.Email,
			&profile.ContactNumber,
			&profile.Role,
		)
	}

	if err != nil {
		log.Printf("Error fetching staff profile: %v", err)
		sendJSONError(w, "Staff profile not found", http.StatusNotFound)
		return
	}

	// Log the response
	responseBytes, err := json.Marshal(profile)
	if err != nil {
		log.Printf("Error marshalling profile: %v", err)
	} else {
		log.Printf("Staff profile response: %s", string(responseBytes))
	}
	
	json.NewEncoder(w).Encode(profile)
}

// UpdateStaffProfile updates the contact information for a staff member
func UpdateStaffProfile(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for update staff profile handled")
		return
	}
	
	log.Printf("UpdateStaffProfile called with query params: %v, method: %s", r.URL.Query(), r.Method)

	// Get employee ID from the query parameter
	employeeIDStr := r.URL.Query().Get("employeeId")
	if employeeIDStr == "" {
		log.Println("Missing employeeId parameter")
		sendJSONError(w, "EmployeeID is required", http.StatusBadRequest)
		return
	}

	employeeID, err := strconv.Atoi(employeeIDStr)
	if err != nil {
		log.Printf("Invalid employeeId format: %s - %v", employeeIDStr, err)
		sendJSONError(w, "Invalid EmployeeID format", http.StatusBadRequest)
		return
	}

	// Parse request body
	var updateReq struct {
		Email         string `json:"email"`
		ContactNumber string `json:"contactNumber"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&updateReq); err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	log.Printf("Updating staff profile: ID=%d, Email=%s, ContactNumber=%s", 
		employeeID, updateReq.Email, updateReq.ContactNumber)

	// Update the employee record
	result, err := database.DB.Exec(`
		UPDATE Employees 
		SET Email = ?, ContactNumber = ? 
		WHERE EmployeeID = ?
	`, updateReq.Email, updateReq.ContactNumber, employeeID)

	if err != nil {
		log.Printf("Database error updating staff profile: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		log.Printf("No employee record found with ID: %d", employeeID)
		sendJSONError(w, "Employee not found", http.StatusNotFound)
		return
	}

	log.Printf("Successfully updated staff profile for employee ID: %d", employeeID)
	
	// Return success response
	response := struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}{
		Success: true,
		Message: "Profile updated successfully",
	}
	
	json.NewEncoder(w).Encode(response)
}

// GetStaffPatients returns the list of patients for staff view
func GetStaffPatients(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Use the exact query specified in requirements
	rows, err := database.DB.Query(`
		SELECT p.PatientID, p.FullName, p.Email, p.ContactNumber, a.AppointmentID, a.Status, ba.BedID
		FROM patients p
		LEFT JOIN appointment a ON p.PatientID = a.PatientID
		LEFT JOIN bedassignments ba ON p.PatientID = ba.PatientID
		WHERE (ba.DischargeDate IS NULL OR ba.DischargeDate IS NOT NULL)
		ORDER BY p.PatientID DESC
	`)

	if err != nil {
		log.Printf("Error querying patients: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var patients []map[string]interface{}
	for rows.Next() {
		var patientID int
		var fullName, email, contactNumber string
		var appointmentID, bedID sql.NullInt64
		var status sql.NullString

		err := rows.Scan(
			&patientID,
			&fullName,
			&email,
			&contactNumber,
			&appointmentID,
			&status,
			&bedID,
		)

		if err != nil {
			log.Printf("Error scanning patient row: %v", err)
			continue
		}

		patient := map[string]interface{}{
			"id":           patientID,
			"name":         fullName,
			"email":        email,
			"contact":      contactNumber,
			"appointmentID": nil,
			"status":       "new",
			"bedID":        nil,
		}

		// Set appointment info if exists
		if appointmentID.Valid {
			patient["appointmentID"] = appointmentID.Int64
			if status.Valid {
				patient["status"] = status.String
			} else {
				patient["status"] = "scheduled"
			}
		}

		// Set bed info if exists
		if bedID.Valid {
			patient["bedID"] = bedID.Int64
			// If patient has a bed, they're admitted
			patient["status"] = "admitted"
		}

		patients = append(patients, patient)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating patient rows: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(patients)
}

// RegisterPatient handles new patient registration
func RegisterPatient(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for register patient handled")
		return
	}

	// Parse the request body
	var patient struct {
		FullName      string `json:"fullName"`
		ContactNumber string `json:"contactNumber"`
		Email         string `json:"email"`
		Address       string `json:"address"`
		City          string `json:"city"`
		State         string `json:"state"`
		PinCode       string `json:"pinCode"`
		Gender        string `json:"gender"`
		Adhar         string `json:"adhar"`
	}

	if err := json.NewDecoder(r.Body).Decode(&patient); err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if patient.FullName == "" || patient.ContactNumber == "" || patient.Email == "" || patient.Gender == "" {
		log.Printf("Missing required fields for patient registration")
		sendJSONError(w, "Missing required fields: fullName, contactNumber, email, gender", http.StatusBadRequest)
		return
	}

	// Insert patient into database
	result, err := database.DB.Exec(`
		INSERT INTO Patients 
		(FullName, ContactNumber, Email, Address, City, State, PinCode, Gender, Adhar) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, 
	patient.FullName, patient.ContactNumber, patient.Email, patient.Address, 
	patient.City, patient.State, patient.PinCode, patient.Gender, patient.Adhar)

	if err != nil {
		log.Printf("Error inserting patient: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get the ID of the newly inserted patient
	patientID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
	}

	response := map[string]interface{}{
		"success":   true,
		"message":   "Patient registered successfully",
		"patientID": patientID,
	}

	log.Printf("Patient registered successfully: ID=%d, Name=%s", patientID, patient.FullName)
	json.NewEncoder(w).Encode(response)
}

// CheckInPatient handles patient appointment check-in
func CheckInPatient(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for check-in patient handled")
		return
	}

	// Parse the request body
	var checkIn struct {
		AppointmentID int `json:"appointmentId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&checkIn); err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate appointment ID
	if checkIn.AppointmentID <= 0 {
		log.Printf("Invalid appointment ID: %d", checkIn.AppointmentID)
		sendJSONError(w, "Invalid appointment ID", http.StatusBadRequest)
		return
	}

	// Update appointment status to 'Checked-In'
	_, err := database.DB.Exec(`
		UPDATE Appointment 
		SET Status = 'checked-in' 
		WHERE AppointmentID = ?
	`, checkIn.AppointmentID)

	if err != nil {
		log.Printf("Error updating appointment status: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"message": "Patient checked in successfully",
	}

	log.Printf("Patient checked in successfully for appointment ID: %d", checkIn.AppointmentID)
	json.NewEncoder(w).Encode(response)
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
