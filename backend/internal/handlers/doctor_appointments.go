package handlers

import (
	"encoding/json"
	"hospital-management/backend/internal/database"
	"log"
	"net/http"
)

// GetDoctorAppointments returns appointments for a specific doctor
func GetDoctorAppointments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	doctorID := r.URL.Query().Get("doctor_id")
	if doctorID == "" {
		sendJSONError(w, "Doctor ID is required", http.StatusBadRequest)
		return
	}

	// Log the query for debugging
	log.Printf("Getting appointments for doctor ID: %s", doctorID)

	// Use a safe query without GROUP BY that could cause issues
	query := `
		SELECT DISTINCT
			a.AppointmentID,
			d.FullName as DoctorName,
			p.FullName as PatientName,
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
		WHERE 
			a.DoctorID = ?
		ORDER BY 
			a.AppointmentDate, a.AppointmentTime
	`

	log.Printf("Executing doctor appointments query: %s", query)
	rows, err := database.DB.Query(query, doctorID)
	if err != nil {
		log.Printf("Error querying doctor appointments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var appointments []map[string]interface{}
	for rows.Next() {
		var appointmentID int
		var doctorName, patientName, appointmentDate, appointmentTime, status, description string

		err := rows.Scan(
			&appointmentID,
			&doctorName,
			&patientName,
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
			"patientName": patientName,
			"date":        appointmentDate,
			"time":        appointmentTime,
			"status":      status,
			"description": description,
		}

		appointments = append(appointments, appointment)
	}

	log.Printf("Found %d appointments for doctor ID %s", len(appointments), doctorID)
	json.NewEncoder(w).Encode(appointments)
}
