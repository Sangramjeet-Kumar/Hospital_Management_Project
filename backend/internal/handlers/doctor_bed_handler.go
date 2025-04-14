package handlers

import (
	"database/sql"
	"encoding/json"
	"hospital-management/backend/internal/database"
	"log"
	"net/http"
	"strconv"
	"time"
)

// GetDoctorBeds handles GET requests to fetch bed data for the logged-in doctor
func GetDoctorBeds(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get employee ID from the query parameters
	employeeIDStr := r.URL.Query().Get("employeeId")
	if employeeIDStr == "" {
		log.Println("Missing employeeId parameter")
		sendJSONError(w, "Employee ID is required", http.StatusBadRequest)
		return
	}

	employeeID, err := strconv.Atoi(employeeIDStr)
	if err != nil {
		log.Printf("Invalid employeeId format: %s - %v", employeeIDStr, err)
		sendJSONError(w, "Invalid EmployeeID format", http.StatusBadRequest)
		return
	}

	// Get the doctor's hospital ID
	var hospitalID int
	err = database.DB.QueryRow("SELECT HospitalID FROM employees WHERE EmployeeID = ?", employeeID).Scan(&hospitalID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No employee found with ID: %d", employeeID)
			sendJSONError(w, "Employee not found", http.StatusNotFound)
		} else {
			log.Printf("Error fetching employee hospital ID: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Fetching bed data for hospitalID: %d", hospitalID)

	// Query to get bed assignments along with bed details and vacancy counts
	query := `
	SELECT 
		ba.AssignmentID,
		ba.PatientID,
		p.FullName as PatientName,
		bi.BedID,
		bi.BedType,
		DATE_FORMAT(ba.AdmissionDate, '%Y-%m-%d') as AdmissionDate,
		DATE_FORMAT(ba.DischargeDate, '%Y-%m-%d') as DischargeDate,
		CASE 
			WHEN ba.DischargeDate IS NULL THEN 'current' 
			WHEN ba.DischargeDate < CURDATE() THEN 'discharged'
			ELSE 'scheduled'
		END AS Status,
		bc.VacantBeds
	FROM 
		bedassignments ba
	JOIN 
		bedinventory bi ON ba.BedID = bi.BedID
	JOIN 
		bedscount bc ON bi.BedType = bc.BedType AND bi.HospitalID = bc.HospitalID
	JOIN 
		patients p ON ba.PatientID = p.PatientID
	WHERE 
		bi.HospitalID = ? AND (ba.DischargeDate IS NULL OR ba.DischargeDate >= CURDATE())
	ORDER BY 
		ba.AdmissionDate DESC
	`

	rows, err := database.DB.Query(query, hospitalID)
	if err != nil {
		log.Printf("Error querying bed assignments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Process the results
	var bedAssignments []map[string]interface{}
	for rows.Next() {
		var assignment struct {
			AssignmentID  int
			PatientID     int
			PatientName   string
			BedID         int
			BedType       string
			AdmissionDate string
			DischargeDate sql.NullString
			Status        string
			VacantBeds    int
		}

		err := rows.Scan(
			&assignment.AssignmentID,
			&assignment.PatientID,
			&assignment.PatientName,
			&assignment.BedID,
			&assignment.BedType,
			&assignment.AdmissionDate,
			&assignment.DischargeDate,
			&assignment.Status,
			&assignment.VacantBeds,
		)

		if err != nil {
			log.Printf("Error scanning bed assignment row: %v", err)
			continue
		}

		// Convert to map for JSON response
		assignmentMap := map[string]interface{}{
			"assignmentId":  assignment.AssignmentID,
			"patientId":     assignment.PatientID,
			"patientName":   assignment.PatientName,
			"bedId":         assignment.BedID,
			"bedType":       assignment.BedType,
			"admissionDate": assignment.AdmissionDate,
			"status":        assignment.Status,
			"vacantBeds":    assignment.VacantBeds,
		}

		// Add discharge date if not null
		if assignment.DischargeDate.Valid {
			assignmentMap["dischargeDate"] = assignment.DischargeDate.String
		}

		bedAssignments = append(bedAssignments, assignmentMap)
	}

	// Get available beds for potential assignments or transfers
	availableBedsQuery := `
	SELECT 
		bi.BedID,
		bi.BedType,
		bt.Description,
		bc.VacantBeds
	FROM 
		bedinventory bi
	JOIN 
		bedtypes bt ON bi.BedType = bt.BedType
	JOIN 
		bedscount bc ON bi.BedType = bc.BedType AND bi.HospitalID = bc.HospitalID
	LEFT JOIN 
		(SELECT BedID FROM bedassignments WHERE DischargeDate IS NULL) ba ON bi.BedID = ba.BedID
	WHERE 
		bi.HospitalID = ? AND ba.BedID IS NULL
	ORDER BY 
		bi.BedType, bi.BedID
	`

	availableRows, err := database.DB.Query(availableBedsQuery, hospitalID)
	if err != nil {
		log.Printf("Error querying available beds: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer availableRows.Close()

	var availableBeds []map[string]interface{}
	for availableRows.Next() {
		var bed struct {
			BedID       int
			BedType     string
			Description string
			VacantBeds  int
		}

		err := availableRows.Scan(&bed.BedID, &bed.BedType, &bed.Description, &bed.VacantBeds)
		if err != nil {
			log.Printf("Error scanning available bed row: %v", err)
			continue
		}

		availableBeds = append(availableBeds, map[string]interface{}{
			"bedId":       bed.BedID,
			"bedType":     bed.BedType,
			"description": bed.Description,
			"vacantBeds":  bed.VacantBeds,
		})
	}

	// Combine both datasets in the response
	response := map[string]interface{}{
		"assignments":    bedAssignments,
		"availableBeds":  availableBeds,
		"hospitalId":     hospitalID,
	}

	log.Printf("Returning bed data with %d assignments and %d available beds", 
		len(bedAssignments), len(availableBeds))
	json.NewEncoder(w).Encode(response)
}

// AssignBed handles POST requests to assign a bed to a patient
func AssignBed(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Parse the request body
	var request struct {
		EmployeeID    int    `json:"employeeId"`
		PatientID     int    `json:"patientId"`
		BedID         int    `json:"bedId"`
		AdmissionDate string `json:"admissionDate"`
		Notes         string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if request.PatientID == 0 || request.BedID == 0 {
		sendJSONError(w, "Patient ID and Bed ID are required", http.StatusBadRequest)
		return
	}

	// Use current date if admission date not provided
	if request.AdmissionDate == "" {
		request.AdmissionDate = time.Now().Format("2006-01-02")
	}

	// Verify employee exists
	var hospitalID int
	err := database.DB.QueryRow("SELECT HospitalID FROM employees WHERE EmployeeID = ?", request.EmployeeID).Scan(&hospitalID)
	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONError(w, "Employee not found", http.StatusNotFound)
		} else {
			log.Printf("Error verifying employee: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	// Check if patient already has an active bed assignment
	var hasExistingAssignment bool
	err = database.DB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM bedassignments 
			WHERE PatientID = ? 
			AND DischargeDate IS NULL
		)
	`, request.PatientID).Scan(&hasExistingAssignment)

	if err != nil {
		log.Printf("Error checking existing patient assignments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if hasExistingAssignment {
		sendJSONError(w, "Patient already has an active bed assignment", http.StatusConflict)
		return
	}

	// Check if bed exists and is available
	var bedType string
	var isBedAvailable bool
	err = database.DB.QueryRow(`
		SELECT 
			bi.BedType,
			NOT EXISTS (
				SELECT 1 FROM bedassignments ba 
				WHERE ba.BedID = ? AND ba.DischargeDate IS NULL
			) AS IsAvailable
		FROM bedinventory bi
		WHERE bi.BedID = ?
	`, request.BedID, request.BedID).Scan(&bedType, &isBedAvailable)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONError(w, "Bed not found", http.StatusNotFound)
		} else {
			log.Printf("Error checking bed availability: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	if !isBedAvailable {
		sendJSONError(w, "Bed is not available", http.StatusConflict)
		return
	}

	// Begin transaction for bed assignment and count updates
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Insert new assignment
	result, err := tx.Exec(
		"INSERT INTO bedassignments (BedID, PatientID, AdmissionDate, DischargeDate) VALUES (?, ?, ?, NULL)",
		request.BedID, request.PatientID, request.AdmissionDate)
	if err != nil {
		log.Printf("Error inserting bed assignment: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get the new assignment ID
	assignmentID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update the BedsCount table
	_, err = tx.Exec(
		`UPDATE bedscount 
		 SET OccupiedBeds = OccupiedBeds + 1, VacantBeds = VacantBeds - 1
		 WHERE HospitalID = ? AND BedType = ?`,
		hospitalID, bedType)
	if err != nil {
		log.Printf("Error updating BedsCount: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get patient name for response
	var patientName string
	database.DB.QueryRow("SELECT FullName FROM patients WHERE PatientID = ?", request.PatientID).Scan(&patientName)

	// Return success response
	response := map[string]interface{}{
		"success":      true,
		"message":      "Bed assigned successfully",
		"assignmentId": assignmentID,
		"patientId":    request.PatientID,
		"patientName":  patientName,
		"bedId":        request.BedID,
		"bedType":      bedType,
		"admissionDate": request.AdmissionDate,
		"status":       "current",
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// TransferBed handles POST requests to transfer a patient to a different bed
func TransferBed(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Parse the request body
	var request struct {
		EmployeeID int `json:"employeeId"`
		PatientID  int `json:"patientId"`
		NewBedID   int `json:"newBedId"`
		Notes      string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if request.PatientID == 0 || request.NewBedID == 0 {
		sendJSONError(w, "Patient ID and new Bed ID are required", http.StatusBadRequest)
		return
	}

	// Verify employee exists
	var hospitalID int
	err := database.DB.QueryRow("SELECT HospitalID FROM employees WHERE EmployeeID = ?", request.EmployeeID).Scan(&hospitalID)
	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONError(w, "Employee not found", http.StatusNotFound)
		} else {
			log.Printf("Error verifying employee: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	// Get the current bed assignment for the patient
	var currentAssignment struct {
		AssignmentID int
		BedID        int
		BedType      string
	}
	err = database.DB.QueryRow(`
		SELECT 
			ba.AssignmentID, 
			ba.BedID,
			bi.BedType
		FROM bedassignments ba
		JOIN bedinventory bi ON ba.BedID = bi.BedID
		WHERE ba.PatientID = ? AND ba.DischargeDate IS NULL
	`, request.PatientID).Scan(&currentAssignment.AssignmentID, &currentAssignment.BedID, &currentAssignment.BedType)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONError(w, "No active bed assignment found for this patient", http.StatusNotFound)
		} else {
			log.Printf("Error finding current assignment: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	// Check if new bed exists and is available
	var newBedType string
	var isBedAvailable bool
	err = database.DB.QueryRow(`
		SELECT 
			bi.BedType,
			NOT EXISTS (
				SELECT 1 FROM bedassignments ba 
				WHERE ba.BedID = ? AND ba.DischargeDate IS NULL
			) AS IsAvailable
		FROM bedinventory bi
		WHERE bi.BedID = ?
	`, request.NewBedID, request.NewBedID).Scan(&newBedType, &isBedAvailable)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONError(w, "New bed not found", http.StatusNotFound)
		} else {
			log.Printf("Error checking bed availability: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	if !isBedAvailable {
		sendJSONError(w, "New bed is not available", http.StatusConflict)
		return
	}

	// Begin transaction for bed transfer
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get the current admission date to preserve it
	var admissionDate string
	err = tx.QueryRow(
		"SELECT DATE_FORMAT(AdmissionDate, '%Y-%m-%d') FROM bedassignments WHERE AssignmentID = ?",
		currentAssignment.AssignmentID).Scan(&admissionDate)
	if err != nil {
		log.Printf("Error getting admission date: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Discharge from current bed
	_, err = tx.Exec(
		"UPDATE bedassignments SET DischargeDate = CURRENT_DATE() WHERE AssignmentID = ?",
		currentAssignment.AssignmentID)
	if err != nil {
		log.Printf("Error discharging from current bed: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Create new assignment for the new bed
	result, err := tx.Exec(
		"INSERT INTO bedassignments (BedID, PatientID, AdmissionDate, DischargeDate) VALUES (?, ?, ?, NULL)",
		request.NewBedID, request.PatientID, admissionDate)
	if err != nil {
		log.Printf("Error creating new bed assignment: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get the new assignment ID
	newAssignmentID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update BedsCount if bed types differ
	if currentAssignment.BedType != newBedType {
		// Decrement count for old bed type
		_, err = tx.Exec(
			`UPDATE bedscount 
			 SET OccupiedBeds = OccupiedBeds - 1, VacantBeds = VacantBeds + 1
			 WHERE HospitalID = ? AND BedType = ?`,
			hospitalID, currentAssignment.BedType)
		if err != nil {
			log.Printf("Error updating old bed type count: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
			return
		}

		// Increment count for new bed type
		_, err = tx.Exec(
			`UPDATE bedscount 
			 SET OccupiedBeds = OccupiedBeds + 1, VacantBeds = VacantBeds - 1
			 WHERE HospitalID = ? AND BedType = ?`,
			hospitalID, newBedType)
		if err != nil {
			log.Printf("Error updating new bed type count: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get patient name for response
	var patientName string
	database.DB.QueryRow("SELECT FullName FROM patients WHERE PatientID = ?", request.PatientID).Scan(&patientName)

	// Return success response
	response := map[string]interface{}{
		"success":        true,
		"message":        "Patient transferred successfully",
		"assignmentId":   newAssignmentID,
		"patientId":      request.PatientID,
		"patientName":    patientName,
		"oldBedId":       currentAssignment.BedID,
		"newBedId":       request.NewBedID,
		"newBedType":     newBedType,
		"admissionDate":  admissionDate,
		"transferDate":   time.Now().Format("2006-01-02"),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// AssignBedFromAppointment handles POST requests to assign a bed to a patient with a completed appointment
func AssignBedFromAppointment(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Parse the request body
	var request struct {
		EmployeeID int `json:"employeeId"`
		PatientID  int `json:"patientId"`
		BedID      int `json:"bedId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if request.PatientID == 0 || request.BedID == 0 || request.EmployeeID == 0 {
		sendJSONError(w, "Employee ID, Patient ID, and Bed ID are required", http.StatusBadRequest)
		return
	}

	// Begin transaction for multiple database operations
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. Get employee and doctor information
	var (
		hospitalID int
		doctorID   int
	)
	
	err = tx.QueryRow(`
		SELECT e.HospitalID, d.DoctorID 
		FROM employees e
		JOIN doctors d ON e.EmployeeID = d.EmployeeID
		WHERE e.EmployeeID = ?
	`, request.EmployeeID).Scan(&hospitalID, &doctorID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No doctor found with employee ID: %d", request.EmployeeID)
			sendJSONError(w, "Doctor not found", http.StatusNotFound)
		} else {
			log.Printf("Error fetching doctor information: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	// 2. Verify that the patient has a completed appointment with this doctor
	var appointmentExists bool
	err = tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM appointment a
			WHERE a.PatientID = ? 
			AND a.DoctorID = ? 
			AND a.Status = 'Completed'
		)
	`, request.PatientID, doctorID).Scan(&appointmentExists)

	if err != nil {
		log.Printf("Error checking patient appointment status: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if !appointmentExists {
		log.Printf("No completed appointment found for Patient ID %d with Doctor ID %d", request.PatientID, doctorID)
		sendJSONError(w, "Patient does not have a completed appointment with this doctor", http.StatusBadRequest)
		return
	}

	// 3. Check if patient already has an active bed assignment
	var hasExistingAssignment bool
	err = tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM bedassignments 
			WHERE PatientID = ? 
			AND DischargeDate IS NULL
		)
	`, request.PatientID).Scan(&hasExistingAssignment)

	if err != nil {
		log.Printf("Error checking existing patient assignments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if hasExistingAssignment {
		sendJSONError(w, "Patient already has an active bed assignment", http.StatusConflict)
		return
	}

	// 4. Check if bed exists and is available
	var bedType string
	var isBedAvailable bool
	err = tx.QueryRow(`
		SELECT 
			bi.BedType,
			NOT EXISTS (
				SELECT 1 FROM bedassignments ba 
				WHERE ba.BedID = ? AND ba.DischargeDate IS NULL
			) AS IsAvailable
		FROM bedinventory bi
		WHERE bi.BedID = ?
	`, request.BedID, request.BedID).Scan(&bedType, &isBedAvailable)

	if err != nil {
		if err == sql.ErrNoRows {
			sendJSONError(w, "Bed not found", http.StatusNotFound)
		} else {
			log.Printf("Error checking bed availability: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	if !isBedAvailable {
		sendJSONError(w, "Bed is not available", http.StatusConflict)
		return
	}

	// 5. Create the bed assignment
	currentDate := time.Now().Format("2006-01-02")
	result, err := tx.Exec(
		"INSERT INTO bedassignments (BedID, PatientID, AdmissionDate, DischargeDate) VALUES (?, ?, ?, NULL)",
		request.BedID, request.PatientID, currentDate)
	
	if err != nil {
		log.Printf("Error inserting bed assignment: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get the new assignment ID
	assignmentID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// 6. Update the BedsCount table
	_, err = tx.Exec(
		`UPDATE bedscount 
		 SET OccupiedBeds = OccupiedBeds + 1, VacantBeds = VacantBeds - 1
		 WHERE HospitalID = ? AND BedType = ?`,
		hospitalID, bedType)
	
	if err != nil {
		log.Printf("Error updating BedsCount: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// 7. Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get patient name for response
	var patientName string
	database.DB.QueryRow("SELECT FullName FROM patients WHERE PatientID = ?", request.PatientID).Scan(&patientName)

	// Return success response
	response := map[string]interface{}{
		"success":       true,
		"message":       "Bed assigned successfully from completed appointment",
		"assignmentId":  assignmentID,
		"patientId":     request.PatientID,
		"patientName":   patientName,
		"bedId":         request.BedID,
		"bedType":       bedType,
		"admissionDate": currentDate,
		"status":        "current",
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
} 