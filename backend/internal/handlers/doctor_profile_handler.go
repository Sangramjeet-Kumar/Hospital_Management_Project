package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/models"
	"log"
	"net/http"
	"strconv"
)

// GetDoctorProfile handles GET requests to fetch a doctor's profile
func GetDoctorProfile(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for doctor profile handled")
		return
	}
	
	log.Printf("GetDoctorProfile called with query params: %v", r.URL.Query())
	// Get employee ID from the request
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

	log.Printf("Fetching doctor profile for employeeID: %d", employeeID)

	// Query to join employees, doctoremployee, and doctors tables
	query := `
		SELECT d.DoctorID, de.EmployeeID, d.FullName, d.Description, d.ContactNumber, d.Email, d.Department
		FROM employees e
		JOIN doctoremployee de ON e.EmployeeID = de.EmployeeID
		JOIN doctors d ON de.DoctorID = d.DoctorID
		WHERE e.EmployeeID = ?
	`

	var profile models.DoctorProfile
	err = database.DB.QueryRow(query, employeeID).Scan(
		&profile.DoctorID,
		&profile.EmployeeID,
		&profile.FullName,
		&profile.Description,
		&profile.ContactNumber,
		&profile.Email,
		&profile.Department,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No doctor profile found for employeeID: %d", employeeID)
			http.Error(w, fmt.Sprintf("Doctor profile not found for employeeID: %d", employeeID), http.StatusNotFound)
		} else {
			log.Printf("Error fetching doctor profile: %v", err)
			http.Error(w, "Error fetching doctor profile", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Doctor profile fetched successfully for employeeID: %d", employeeID)
	w.Header().Set("Content-Type", "application/json")
	
	// Log the response
	responseBytes, err := json.Marshal(profile)
	if err != nil {
		log.Printf("Error marshalling profile: %v", err)
	} else {
		log.Printf("Doctor profile response: %s", string(responseBytes))
	}
	
	// Send the response
	err = json.NewEncoder(w).Encode(profile)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

// UpdateDoctorProfile handles PUT requests to update a doctor's profile
func UpdateDoctorProfile(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for update doctor profile handled")
		return
	}
	
	log.Printf("UpdateDoctorProfile called with query params: %v, method: %s", r.URL.Query(), r.Method)
	
	// Parse the request body
	var update models.DoctorProfileUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		log.Printf("Invalid request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Received update request: %+v", update)

	// Get employee ID from the request
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

	log.Printf("Updating profile for employeeID: %d", employeeID)

	// First get the doctor ID from the employee ID
	var doctorID int
	err = database.DB.QueryRow("SELECT DoctorID FROM doctoremployee WHERE EmployeeID = ?", employeeID).Scan(&doctorID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No doctor record found for employeeID: %d", employeeID)
			http.Error(w, "Doctor record not found for this employee", http.StatusNotFound)
		} else {
			log.Printf("Error finding doctor ID: %v", err)
			http.Error(w, "Error updating doctor profile", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Found doctorID: %d for employeeID: %d", doctorID, employeeID)

	// Update the doctor profile
	_, err = database.DB.Exec(
		"UPDATE doctors SET ContactNumber = ?, Email = ? WHERE DoctorID = ?",
		update.ContactNumber, update.Email, doctorID,
	)
	if err != nil {
		log.Printf("Error updating doctor profile: %v", err)
		http.Error(w, "Error updating doctor profile", http.StatusInternalServerError)
		return
	}

	log.Printf("Doctor profile updated successfully for employeeID: %d", employeeID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	response := map[string]interface{}{
		"success": true,
		"message": "Doctor profile updated successfully",
	}
	
	// Log and send the response
	responseBytes, _ := json.Marshal(response)
	log.Printf("Update response: %s", string(responseBytes))
	
	json.NewEncoder(w).Encode(response)
} 