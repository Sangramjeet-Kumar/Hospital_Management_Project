package handlers

import (
	"encoding/json"
	"hospital-management/backend/internal/database"
	"log"
	"net/http"
	"time"
)

type DashboardStats struct {
	TotalAppointments     int `json:"totalAppointments"`
	TotalPatients         int `json:"totalPatients"`
	TotalDoctors          int `json:"totalDoctors"`
	CompletedAppointments int `json:"completedAppointments"`
}

type Activity struct {
	ID          int       `json:"id"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
}

func GetAdminStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var stats DashboardStats

	// Get total appointments
	err := database.DB.QueryRow("SELECT COUNT(*) FROM Appointment").Scan(&stats.TotalAppointments)
	if err != nil {
		log.Printf("Error counting appointments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get total patients
	err = database.DB.QueryRow("SELECT COUNT(*) FROM Patients").Scan(&stats.TotalPatients)
	if err != nil {
		log.Printf("Error counting patients: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get total doctors
	err = database.DB.QueryRow("SELECT COUNT(*) FROM Doctors").Scan(&stats.TotalDoctors)
	if err != nil {
		log.Printf("Error counting doctors: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get completed appointments
	err = database.DB.QueryRow("SELECT COUNT(*) FROM Appointment WHERE Status = 'completed'").Scan(&stats.CompletedAppointments)
	if err != nil {
		log.Printf("Error counting completed appointments: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(stats)
}

func GetPatients(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rows, err := database.DB.Query(`
		SELECT 
			p.PatientID,
			p.FullName,
			p.ContactNumber,
			p.Email,
			p.Gender,
			MAX(a.AppointmentDate) as LastVisit
		FROM Patients p
		LEFT JOIN Appointment a ON p.PatientID = a.PatientID
		GROUP BY p.PatientID
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

func GetRecentActivity(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get recent appointments and status changes
	rows, err := database.DB.Query(`
		SELECT 
			'appointment' as type,
			CONCAT(p.FullName, ' has an appointment with Dr. ', d.FullName) as description,
			a.AppointmentDate as timestamp
		FROM Appointment a
		JOIN Patients p ON a.PatientID = p.PatientID
		JOIN Doctors d ON a.DoctorID = d.DoctorID
		WHERE a.AppointmentDate >= CURDATE()
		ORDER BY a.AppointmentDate DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("Error querying recent activity: %v", err)
		sendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var activities []Activity
	for rows.Next() {
		var activity Activity
		err := rows.Scan(&activity.Type, &activity.Description, &activity.Timestamp)
		if err != nil {
			log.Printf("Error scanning activity row: %v", err)
			continue
		}
		activities = append(activities, activity)
	}

	json.NewEncoder(w).Encode(activities)
}
