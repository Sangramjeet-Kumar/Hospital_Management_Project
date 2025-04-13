package handlers

import (
	"encoding/json"
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/models"
	"log"
	"net/http"
)

// GetHospitals returns all hospitals
func GetHospitals(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	log.Println("Fetching hospitals from database")

	// Query to get all hospitals - using the actual database column names
	rows, err := database.DB.Query("SELECT HospitalID, Address, City, State FROM Hospital")
	if err != nil {
		log.Printf("Error querying hospitals: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var hospitals []models.Hospital
	for rows.Next() {
		var hospital models.Hospital
		err := rows.Scan(&hospital.HospitalID, &hospital.Name, &hospital.City, &hospital.State)
		if err != nil {
			log.Printf("Error scanning hospital row: %v", err)
			continue
		}
		log.Printf("Found hospital: %+v", hospital)
		hospitals = append(hospitals, hospital)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating hospital rows: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	log.Printf("Returning %d hospitals", len(hospitals))

	// Return hospitals as JSON
	json.NewEncoder(w).Encode(hospitals)
}
