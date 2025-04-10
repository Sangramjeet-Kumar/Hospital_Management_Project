package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/models"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// Add a new struct for appointment response
type AppointmentResponse struct {
	AppointmentID   int    `json:"appointment_id"`
	DoctorName      string `json:"doctor_name"`
	PatientName     string `json:"patient_name"`
	AppointmentDate string `json:"appointment_date"`
	AppointmentTime string `json:"appointment_time"`
	Status          string `json:"status"`
	Description     string `json:"description"`
}

type AppointmentWithPatient struct {
	DoctorID        int            `json:"doctor_id"`
	AppointmentDate string         `json:"appointment_date"`
	AppointmentTime string         `json:"appointment_time"`
	Description     string         `json:"description"`
	Patient         models.Patient `json:"patient"`
}

func CreateAppointment(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req AppointmentWithPatient
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("Received appointment request: %+v", req)

	// Start a transaction
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Check if patient already exists based on email
	var patientID int64
	patientCheckQuery := "SELECT PatientID FROM Patients WHERE Email = ?"
	err = tx.QueryRow(patientCheckQuery, req.Patient.Email).Scan(&patientID)

	// If patient doesn't exist, create a new one
	if err != nil {
		log.Printf("Patient not found, creating new patient record: %v", err)
		// Insert patient
		patientQuery := `
			INSERT INTO Patients (FullName, ContactNumber, Email, Address, City, State, PinCode, Gender, Adhar)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

		patientResult, err := tx.Exec(patientQuery,
			req.Patient.FullName,
			req.Patient.ContactNumber,
			req.Patient.Email,
			req.Patient.Address,
			req.Patient.City,
			req.Patient.State,
			req.Patient.PinCode,
			req.Patient.Gender,
			req.Patient.Adhar,
		)
		if err != nil {
			log.Printf("Error inserting patient: %v", err)
			sendJSONError(w, "Error creating patient record", http.StatusInternalServerError)
			return
		}

		patientID, err = patientResult.LastInsertId()
		if err != nil {
			log.Printf("Error getting patient ID: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
			return
		}
	} else {
		log.Printf("Using existing patient with ID: %d", patientID)
	}

	// Parse and format appointment date
	appointmentDate, err := time.Parse("2006-01-02", req.AppointmentDate)
	if err != nil {
		log.Printf("Error parsing date: %v", err)
		sendJSONError(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	// Format date for MySQL
	formattedDate := appointmentDate.Format("2006-01-02")

	// Insert appointment
	appointmentQuery := `
		INSERT INTO Appointment (PatientID, DoctorID, AppointmentDate, AppointmentTime, Description, Status)
		VALUES (?, ?, ?, ?, ?, ?)`

	appointmentResult, err := tx.Exec(appointmentQuery,
		patientID,
		req.DoctorID,
		formattedDate,
		req.AppointmentTime,
		req.Description,
		"scheduled",
	)
	if err != nil {
		log.Printf("Error inserting appointment: %v", err)
		sendJSONError(w, "Error creating appointment record", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	appointmentID, _ := appointmentResult.LastInsertId()
	response := map[string]interface{}{
		"status":         "success",
		"appointment_id": appointmentID,
		"patient_id":     patientID,
		"message":        "Appointment booked successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper function to send JSON error responses
func sendJSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}

func GetDoctors(w http.ResponseWriter, r *http.Request) {
	department := r.URL.Query().Get("department")
	log.Printf("Received request for department: %s", department)

	var query string
	var args []interface{}

	if department != "" {
		query = `SELECT DoctorID, FullName, Description, ContactNumber, Email, Department, Username 
                 FROM Doctors WHERE Department = ?`
		args = []interface{}{department}
	} else {
		query = `SELECT DoctorID, FullName, Description, ContactNumber, Email, Department, Username 
                 FROM Doctors`
	}

	log.Printf("Executing query: %s with args: %v", query, args)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var doctors []models.Doctor
	for rows.Next() {
		var d models.Doctor
		err := rows.Scan(&d.DoctorID, &d.FullName, &d.Description, &d.ContactNumber,
			&d.Email, &d.Department, &d.Username)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			http.Error(w, fmt.Sprintf("Data parsing error: %v", err), http.StatusInternalServerError)
			return
		}
		doctors = append(doctors, d)
	}

	log.Printf("Found %d doctors for department %s", len(doctors), department)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if err := json.NewEncoder(w).Encode(doctors); err != nil {
		log.Printf("JSON encoding error: %v", err)
		http.Error(w, fmt.Sprintf("JSON encoding error: %v", err), http.StatusInternalServerError)
		return
	}
}

// Add a new function to get appointments
func GetAppointments(w http.ResponseWriter, r *http.Request) {
	query := `
        SELECT 
            a.AppointmentID,
            d.FullName as DoctorName,
            p.FullName as PatientName,
            a.AppointmentDate,
            a.AppointmentTime,
            a.Status
        FROM Appointment a
        JOIN Doctors d ON a.DoctorID = d.DoctorID
        JOIN Patients p ON a.PatientID = p.PatientID
        ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC`

	rows, err := database.DB.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var appointments []AppointmentResponse
	for rows.Next() {
		var apt AppointmentResponse
		err := rows.Scan(
			&apt.AppointmentID,
			&apt.DoctorName,
			&apt.PatientName,
			&apt.AppointmentDate,
			&apt.AppointmentTime,
			&apt.Status,
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		appointments = append(appointments, apt)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(appointments)
}

// Add this function to your appointment_handler.go
func GetFilteredAppointments(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get filter parameter
	dateRange := r.URL.Query().Get("range")
	log.Printf("Filtering appointments by range: %s", dateRange)

	// Base query with proper date formatting
	baseQuery := `
        SELECT 
            a.AppointmentID,
            d.FullName as DoctorName,
            p.FullName as PatientName,
            DATE_FORMAT(a.AppointmentDate, '%Y-%m-%d') as AppointmentDate,
            a.AppointmentTime,
            a.Status,
            a.Description
        FROM Appointment a
        JOIN Doctors d ON a.DoctorID = d.DoctorID
        JOIN Patients p ON a.PatientID = p.PatientID`

	var query string
	switch dateRange {
	case "past":
		query = fmt.Sprintf(`%s 
            WHERE DATE(a.AppointmentDate) < CURDATE()
            ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC`, baseQuery)
		log.Printf("Fetching past appointments")

	case "today":
		query = fmt.Sprintf(`%s 
            WHERE DATE(a.AppointmentDate) = CURDATE()
            ORDER BY a.AppointmentTime ASC`, baseQuery)
		log.Printf("Fetching today's appointments")

	case "week":
		query = fmt.Sprintf(`%s 
            WHERE DATE(a.AppointmentDate) >= CURDATE() 
            AND DATE(a.AppointmentDate) <= DATE_ADD(CURDATE(), INTERVAL 6 DAY)
            ORDER BY a.AppointmentDate ASC, a.AppointmentTime ASC`, baseQuery)
		log.Printf("Fetching next 7 days appointments")

	case "month":
		query = fmt.Sprintf(`%s 
            WHERE DATE(a.AppointmentDate) >= CURDATE() 
            AND DATE(a.AppointmentDate) <= DATE_ADD(CURDATE(), INTERVAL 29 DAY)
            ORDER BY a.AppointmentDate ASC, a.AppointmentTime ASC`, baseQuery)
		log.Printf("Fetching next 30 days appointments")

	default:
		query = fmt.Sprintf(`%s 
            ORDER BY 
                CASE 
                    WHEN DATE(a.AppointmentDate) = CURDATE() THEN 0
                    WHEN DATE(a.AppointmentDate) > CURDATE() THEN 1
                    ELSE 2
                END,
                a.AppointmentDate ASC, 
                a.AppointmentTime ASC`, baseQuery)
		log.Printf("Fetching all appointments with default ordering")
	}

	// Execute query
	log.Printf("Executing query: %s", query)
	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("Database error: %v", err)
		sendJSONError(w, fmt.Sprintf("Failed to fetch appointments: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var appointments []AppointmentResponse
	for rows.Next() {
		var apt AppointmentResponse
		err := rows.Scan(
			&apt.AppointmentID,
			&apt.DoctorName,
			&apt.PatientName,
			&apt.AppointmentDate,
			&apt.AppointmentTime,
			&apt.Status,
			&apt.Description,
		)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			continue
		}
		appointments = append(appointments, apt)
	}

	log.Printf("Successfully fetched %d appointments for range: %s", len(appointments), dateRange)

	// Send response
	if err := json.NewEncoder(w).Encode(appointments); err != nil {
		log.Printf("Error encoding response: %v", err)
		sendJSONError(w, fmt.Sprintf("Error encoding response: %v", err), http.StatusInternalServerError)
		return
	}
}

// Add this new handler function
func UpdateAppointmentStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	appointmentID := vars["id"]

	var statusUpdate struct {
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&statusUpdate); err != nil {
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	query := `UPDATE Appointment SET Status = ? WHERE AppointmentID = ?`

	result, err := database.DB.Exec(query, statusUpdate.Status, appointmentID)
	if err != nil {
		log.Printf("Error updating appointment status: %v", err)
		sendJSONError(w, "Failed to update appointment status", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		sendJSONError(w, "Appointment not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Appointment status updated successfully",
	})
}

// GetDoctorAppointments handles requests for a specific doctor's appointments
func GetDoctorAppointments(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get doctor ID from URL parameters
	vars := mux.Vars(r)
	doctorID := vars["doctorID"]
	if doctorID == "" {
		sendJSONError(w, "Doctor ID is required", http.StatusBadRequest)
		return
	}

	// Get status filter from query parameters
	status := r.URL.Query().Get("status")
	var statusFilter string
	if status != "" && status != "all" {
		statusFilter = "AND a.Status = ?"
	}

	query := fmt.Sprintf(`
        SELECT 
            a.AppointmentID,
            d.FullName as DoctorName,
            p.FullName as PatientName,
            a.AppointmentDate,
            a.AppointmentTime,
            a.Status,
            a.Description
        FROM Appointment a
        JOIN Doctors d ON a.DoctorID = d.DoctorID
        JOIN Patients p ON a.PatientID = p.PatientID
        WHERE a.DoctorID = ? %s
        ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC`, statusFilter)

	var rows *sql.Rows
	var err error

	if statusFilter != "" {
		rows, err = database.DB.Query(query, doctorID, status)
	} else {
		rows, err = database.DB.Query(query, doctorID)
	}

	if err != nil {
		log.Printf("Database error: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var appointments []AppointmentResponse
	for rows.Next() {
		var apt AppointmentResponse
		err := rows.Scan(
			&apt.AppointmentID,
			&apt.DoctorName,
			&apt.PatientName,
			&apt.AppointmentDate,
			&apt.AppointmentTime,
			&apt.Status,
			&apt.Description,
		)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			sendJSONError(w, "Data parsing error", http.StatusInternalServerError)
			return
		}
		appointments = append(appointments, apt)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Rows error: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(appointments); err != nil {
		log.Printf("JSON encoding error: %v", err)
		sendJSONError(w, "JSON encoding error", http.StatusInternalServerError)
		return
	}
}
