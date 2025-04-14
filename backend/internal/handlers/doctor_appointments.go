package handlers

import (
	"database/sql"
	"encoding/json"
	"hospital-management/backend/internal/database"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// GetDoctorAppointments returns appointments for a specific doctor
func GetDoctorAppointments(w http.ResponseWriter, r *http.Request) {
	// Set headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for doctor appointments handled")
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

	// Get status parameter (optional)
	status := r.URL.Query().Get("status")
	log.Printf("Fetching appointments for employeeId: %d, status: %s", employeeID, status)

	// First, we need to get the doctor's ID from the employee ID
	var doctorID int
	err = database.DB.QueryRow("SELECT DoctorID FROM doctoremployee WHERE EmployeeID = ?", employeeID).Scan(&doctorID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No doctor found for employeeId: %d", employeeID)
			sendJSONError(w, "Doctor not found for this employee ID", http.StatusNotFound)
		} else {
			log.Printf("Database error finding doctor: %v", err)
			sendJSONError(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Found doctorID: %d for employeeID: %d", doctorID, employeeID)

	// Build the query based on whether status is provided
	var query string
	var args []interface{}

	query = `
		SELECT 
			a.AppointmentID,
			p.PatientID,
			p.FullName as PatientName,
			DATE_FORMAT(a.AppointmentDate, '%Y-%m-%d') as AppointmentDate,
			a.AppointmentTime,
			a.Status,
			a.Description
		FROM 
			Appointment a
		JOIN 
			Patients p ON a.PatientID = p.PatientID
		WHERE 
			a.DoctorID = ?
	`
	args = append(args, doctorID)

	// Add status filter if provided
	if status != "" && status != "all" {
		query += " AND a.Status = ?"
		// Convert status parameter to match database values (e.g., "checked-in" to "Checked-In")
		formattedStatus := formatStatus(status)
		args = append(args, formattedStatus)
	}

	query += " ORDER BY a.AppointmentDate, a.AppointmentTime"

	log.Printf("Executing appointments query: %s with args: %v", query, args)

	// Execute the query
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying appointments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Process the results
	var appointments []map[string]interface{}
	for rows.Next() {
		var appointmentID, patientID int
		var patientName, appointmentDate, appointmentTime, appointmentStatus, description string

		err := rows.Scan(
			&appointmentID,
			&patientID,
			&patientName,
			&appointmentDate,
			&appointmentTime,
			&appointmentStatus,
			&description,
		)

		if err != nil {
			log.Printf("Error scanning appointment row: %v", err)
			continue
		}

		// Format the status for frontend consistency
		normalizedStatus := normalizeStatus(appointmentStatus)

		appointment := map[string]interface{}{
			"id":          appointmentID,
			"patientId":   "P-" + strconv.Itoa(patientID), // Format as P-123 for frontend
			"patientName": patientName,
			"date":        appointmentDate,
			"time":        appointmentTime,
			"status":      normalizedStatus,
			"reason":      description,
		}

		appointments = append(appointments, appointment)
	}

	if appointments == nil {
		// Initialize as empty array instead of null for better frontend handling
		appointments = []map[string]interface{}{}
	}

	log.Printf("Found %d appointments for doctorID %d with status %s", len(appointments), doctorID, status)
	
	// Log the response
	responseBytes, _ := json.Marshal(appointments)
	log.Printf("Appointments response: %s", string(responseBytes))
	
	// Send the response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(appointments)
}

// Helper function to format status parameter to database format
func formatStatus(status string) string {
	// Convert status like "checked-in" to "Checked-In"
	parts := strings.Split(status, "-")
	for i, part := range parts {
		if len(part) > 0 {
			parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
		}
	}
	return strings.Join(parts, "-")
}

// Helper function to normalize status for frontend consistency
func normalizeStatus(status string) string {
	// Convert database status to frontend format
	// e.g., "Checked-In" to "checked-in"
	return strings.ToLower(status)
}

// Removed duplicate sendJSONError function to resolve conflict
