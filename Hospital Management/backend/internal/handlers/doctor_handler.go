package handlers

import (
	"encoding/json"
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// GetDoctorProfile retrieves the profile information for a specific doctor
func GetDoctorProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get doctorID from request params
	vars := mux.Vars(r)
	doctorID, err := strconv.Atoi(vars["doctorID"])
	if err != nil {
		log.Printf("Invalid doctor ID: %v", err)
		sendJSONError(w, "Invalid doctor ID", http.StatusBadRequest)
		return
	}

	// Query for doctor profile
	query := `
		SELECT 
			DoctorID, 
			FullName, 
			Description, 
			ContactNumber, 
			Email, 
			Department, 
			Username
		FROM Doctors
		WHERE DoctorID = ?
	`

	var doctor models.Doctor
	err = database.DB.QueryRow(query, doctorID).Scan(
		&doctor.DoctorID,
		&doctor.FullName,
		&doctor.Description,
		&doctor.ContactNumber,
		&doctor.Email,
		&doctor.Department,
		&doctor.Username,
	)
	if err != nil {
		log.Printf("Error querying doctor profile: %v", err)
		sendJSONError(w, "Doctor not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(doctor)
}

// UpdateDoctorProfile updates the profile information for a specific doctor
func UpdateDoctorProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get doctorID from request params
	vars := mux.Vars(r)
	doctorID, err := strconv.Atoi(vars["doctorID"])
	if err != nil {
		log.Printf("Invalid doctor ID: %v", err)
		sendJSONError(w, "Invalid doctor ID", http.StatusBadRequest)
		return
	}

	// Decode request body
	var doctor models.Doctor
	err = json.NewDecoder(r.Body).Decode(&doctor)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update doctor profile
	query := `
		UPDATE Doctors
		SET FullName = ?, 
			Description = ?, 
			ContactNumber = ?, 
			Email = ?
		WHERE DoctorID = ?
	`

	_, err = database.DB.Exec(query,
		doctor.FullName,
		doctor.Description,
		doctor.ContactNumber,
		doctor.Email,
		doctorID,
	)
	if err != nil {
		log.Printf("Error updating doctor profile: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Doctor profile updated successfully",
	})
}

// GetDoctorBeds retrieves all beds assigned to a specific doctor's patients
func GetDoctorBeds(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get doctorID from request params
	vars := mux.Vars(r)
	doctorID, err := strconv.Atoi(vars["doctorID"])
	if err != nil {
		log.Printf("Invalid doctor ID: %v", err)
		sendJSONError(w, "Invalid doctor ID", http.StatusBadRequest)
		return
	}

	// Get status filter (if present)
	status := r.URL.Query().Get("status")
	var statusFilter string
	if status != "" && status != "all" {
		if status == "occupied" {
			statusFilter = " AND (ba.DischargeDate IS NULL AND ba.BedID IS NOT NULL)"
		} else if status == "available" {
			statusFilter = " AND (ba.BedID IS NULL OR ba.DischargeDate IS NOT NULL)"
		}
	}

	// Query for beds - join with Appointment table to get only beds assigned to patients under this doctor's care
	query := `
		SELECT DISTINCT
			bi.BedID, 
			bi.HospitalID, 
			h.Address as HospitalName,
			bi.BedType, 
			CASE 
				WHEN ba.DischargeDate IS NULL AND ba.BedID IS NOT NULL THEN 'occupied' 
				ELSE 'available'
			END AS Status,
			COALESCE(p.PatientID, 0) as PatientID,
			COALESCE(p.FullName, '') as PatientName,
			COALESCE(ba.AdmissionDate, '') as AdmissionDate
		FROM BedInventory bi
		JOIN Hospital h ON bi.HospitalID = h.HospitalID
		LEFT JOIN BedAssignments ba ON bi.BedID = ba.BedID AND (ba.DischargeDate IS NULL OR ba.DischargeDate > CURDATE())
		LEFT JOIN Patients p ON ba.PatientID = p.PatientID
		LEFT JOIN Appointment a ON p.PatientID = a.PatientID AND a.DoctorID = ?
		WHERE a.DoctorID = ?` + statusFilter + `
		ORDER BY bi.BedID
	`

	log.Printf("Executing query: %s with doctorID: %d", query, doctorID)
	rows, err := database.DB.Query(query, doctorID, doctorID)
	if err != nil {
		log.Printf("Error querying beds: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var beds []map[string]interface{}
	for rows.Next() {
		var bed models.Bed
		var patientID int
		var patientName, admissionDate string

		err := rows.Scan(
			&bed.BedID, 
			&bed.HospitalID, 
			&bed.HospitalName, 
			&bed.BedType, 
			&bed.Status,
			&patientID,
			&patientName,
			&admissionDate,
		)
		if err != nil {
			log.Printf("Error scanning bed: %v", err)
			continue
		}

		bedMap := map[string]interface{}{
			"bedID":        bed.BedID,
			"hospitalID":   bed.HospitalID,
			"hospitalName": bed.HospitalName,
			"bedType":      bed.BedType,
			"status":       bed.Status,
		}

		if patientID > 0 {
			bedMap["patientID"] = patientID
			bedMap["patientName"] = patientName
			bedMap["admissionDate"] = admissionDate
		}

		beds = append(beds, bedMap)
	}

	json.NewEncoder(w).Encode(beds)
}

// AllocateBed assigns a bed to a patient under a doctor's care
func AllocateBed(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Decode request body
	var assignment models.BedAssignment
	err := json.NewDecoder(r.Body).Decode(&assignment)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Check if bed is available
	var bedStatus string
	err = tx.QueryRow("SELECT CASE WHEN EXISTS (SELECT 1 FROM BedAssignments WHERE BedID = ? AND DischargeDate IS NULL) THEN 'occupied' ELSE 'available' END", assignment.BedID).Scan(&bedStatus)
	if err != nil {
		log.Printf("Error checking bed status: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if bedStatus == "occupied" {
		sendJSONError(w, "Bed is already occupied", http.StatusBadRequest)
		return
	}

	// Get bed type
	var bedType string
	err = tx.QueryRow("SELECT BedType FROM BedInventory WHERE BedID = ?", assignment.BedID).Scan(&bedType)
	if err != nil {
		log.Printf("Error getting bed type: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Insert bed assignment
	result, err := tx.Exec(
		"INSERT INTO BedAssignments (BedID, PatientID, AdmissionDate) VALUES (?, ?, CURDATE())",
		assignment.BedID,
		assignment.PatientID,
	)
	if err != nil {
		log.Printf("Error allocating bed: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update beds count
	_, err = tx.Exec(
		"UPDATE BedsCount SET OccupiedBeds = OccupiedBeds + 1, VacantBeds = VacantBeds - 1 WHERE BedType = ?",
		bedType,
	)
	if err != nil {
		log.Printf("Error updating bed count: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get assignment ID
	assignmentID, _ := result.LastInsertId()

	// Send success response
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "success",
		"assignmentID": assignmentID,
		"message":      "Bed allocated successfully",
	})
}

// GetDoctorPatients retrieves all patients assigned to a specific doctor
func GetDoctorPatients(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get doctorID from request params
	vars := mux.Vars(r)
	doctorID, err := strconv.Atoi(vars["doctorID"])
	if err != nil {
		log.Printf("Invalid doctor ID: %v", err)
		sendJSONError(w, "Invalid doctor ID", http.StatusBadRequest)
		return
	}

	// Query for patients
	query := `
		SELECT DISTINCT
			p.PatientID,
			p.FullName,
			p.ContactNumber,
			p.Email,
			p.Gender,
			MAX(a.AppointmentDate) as LastVisit
		FROM Patients p
		JOIN Appointment a ON p.PatientID = a.PatientID
		WHERE a.DoctorID = ?
		GROUP BY p.PatientID
		ORDER BY LastVisit DESC
	`

	rows, err := database.DB.Query(query, doctorID)
	if err != nil {
		log.Printf("Error querying patients: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var patients []map[string]interface{}
	for rows.Next() {
		var patient struct {
			PatientID     int         `json:"patient_id"`
			FullName      string      `json:"full_name"`
			ContactNumber string      `json:"contact_number"`
			Email         string      `json:"email"`
			Gender        string      `json:"gender"`
			LastVisit     interface{} `json:"last_visit"`
		}

		err := rows.Scan(
			&patient.PatientID,
			&patient.FullName,
			&patient.ContactNumber,
			&patient.Email,
			&patient.Gender,
			&patient.LastVisit,
		)
		if err != nil {
			log.Printf("Error scanning patient row: %v", err)
			continue
		}

		patientMap := map[string]interface{}{
			"patient_id":     patient.PatientID,
			"full_name":      patient.FullName,
			"contact_number": patient.ContactNumber,
			"email":          patient.Email,
			"gender":         patient.Gender,
		}

		if patient.LastVisit != nil {
			if lastVisit, ok := patient.LastVisit.(time.Time); ok {
				patientMap["last_visit"] = lastVisit.Format("2006-01-02")
			} else {
				patientMap["last_visit"] = patient.LastVisit
			}
		} else {
			patientMap["last_visit"] = nil
		}

		patients = append(patients, patientMap)
	}

	json.NewEncoder(w).Encode(patients)
} 