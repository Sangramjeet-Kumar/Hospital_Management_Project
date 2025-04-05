package handlers

import (
	"bytes"
	"encoding/json"
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/models"
	"io"
	"log"
	"net/http"
)

// GetBedTypes returns all bed types with their descriptions
func GetBedTypes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rows, err := database.DB.Query("SELECT BedType, Description FROM BedTypes")
	if err != nil {
		log.Printf("Error querying bed types: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var bedTypes []models.BedType
	for rows.Next() {
		var bedType models.BedType
		err := rows.Scan(&bedType.Type, &bedType.Description)
		if err != nil {
			log.Printf("Error scanning bed type row: %v", err)
			continue
		}
		bedTypes = append(bedTypes, bedType)
	}

	json.NewEncoder(w).Encode(bedTypes)
}

// GetBedInventory returns all beds in the inventory
func GetBedInventory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rows, err := database.DB.Query(`
		SELECT 
			bi.BedID, 
			bi.HospitalID, 
			h.Address as HospitalName,
			bi.BedType, 
			CASE 
				WHEN ba.DischargeDate IS NULL AND ba.BedID IS NOT NULL THEN 'occupied' 
				ELSE 'available'
			END AS Status
		FROM BedInventory bi
		JOIN Hospital h ON bi.HospitalID = h.HospitalID
		LEFT JOIN (
			SELECT BedID, DischargeDate
			FROM BedAssignments
			WHERE DischargeDate IS NULL OR DischargeDate > CURDATE()
		) ba ON bi.BedID = ba.BedID
		ORDER BY bi.BedID
	`)
	if err != nil {
		log.Printf("Error querying bed inventory: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var beds []models.Bed
	for rows.Next() {
		var bed models.Bed
		err := rows.Scan(&bed.BedID, &bed.HospitalID, &bed.HospitalName, &bed.BedType, &bed.Status)
		if err != nil {
			log.Printf("Error scanning bed row: %v", err)
			continue
		}
		beds = append(beds, bed)
	}

	json.NewEncoder(w).Encode(beds)
}

// CreateBed adds a new bed to the inventory
func CreateBed(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		bedSendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Log request body for debugging
	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		bedSendJSONError(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	// Create a new reader from the read bytes for later use
	r.Body = io.NopCloser(bytes.NewBuffer(requestBody))

	log.Printf("Received request to create bed: %s", string(requestBody))

	var bed models.Bed
	err = json.NewDecoder(r.Body).Decode(&bed)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		bedSendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if bed.HospitalID == 0 || bed.BedType == "" {
		bedSendJSONError(w, "HospitalID and BedType are required", http.StatusBadRequest)
		return
	}

	// Check if bed type exists
	var count int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM BedTypes WHERE BedType = ?", bed.BedType).Scan(&count)
	if err != nil {
		log.Printf("Error checking bed type: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count == 0 {
		log.Printf("Invalid bed type: %s", bed.BedType)
		bedSendJSONError(w, "Invalid bed type", http.StatusBadRequest)
		return
	}

	// Start a transaction
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback()
			log.Printf("Transaction rolled back due to error: %v", err)
		}
	}()

	// Insert new bed
	log.Printf("Inserting new bed: HospitalID=%d, BedType=%s", bed.HospitalID, bed.BedType)
	result, err := tx.Exec(
		"INSERT INTO BedInventory (HospitalID, BedType) VALUES (?, ?)",
		bed.HospitalID, bed.BedType)
	if err != nil {
		log.Printf("Error inserting bed: %v", err)
		bedSendJSONError(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get the new bed ID
	bedID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	log.Printf("New bed created with ID: %d", bedID)

	// Check if BedsCount record exists
	var bedsCountExists int
	err = tx.QueryRow(
		"SELECT COUNT(*) FROM BedsCount WHERE HospitalID = ? AND BedType = ?",
		bed.HospitalID, bed.BedType).Scan(&bedsCountExists)
	if err != nil {
		log.Printf("Error checking BedsCount: %v", err)
		bedSendJSONError(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update the BedsCount table
	if bedsCountExists > 0 {
		// Update existing record
		_, err = tx.Exec(
			`UPDATE BedsCount 
			 SET TotalBeds = TotalBeds + 1, 
				 VacantBeds = VacantBeds + 1
			 WHERE HospitalID = ? AND BedType = ?`,
			bed.HospitalID, bed.BedType)
	} else {
		// Insert new record
		_, err = tx.Exec(
			`INSERT INTO BedsCount (HospitalID, BedType, TotalBeds, OccupiedBeds, VacantBeds) 
			 VALUES (?, ?, 1, 0, 1)`,
			bed.HospitalID, bed.BedType)
	}

	if err != nil {
		log.Printf("Error updating BedsCount: %v", err)
		bedSendJSONError(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Commit the transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Return the new bed with ID
	bed.BedID = int(bedID)
	bed.Status = "available" // Default status for new beds

	// Get hospital name
	err = database.DB.QueryRow("SELECT Address FROM Hospital WHERE HospitalID = ?", bed.HospitalID).Scan(&bed.HospitalName)
	if err != nil {
		log.Printf("Error getting hospital name: %v", err)
		// Don't include hospital name if not found
	}

	log.Printf("Successfully created bed: %+v", bed)
	json.NewEncoder(w).Encode(bed)
}

// GetBedAssignments returns all bed assignments
func GetBedAssignments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rows, err := database.DB.Query(`
		SELECT 
			ba.AssignmentID, 
			ba.BedID, 
			bi.BedType,
			ba.PatientID, 
			p.FullName as PatientName,
			DATE_FORMAT(ba.AdmissionDate, '%Y-%m-%d') as AdmissionDate, 
			DATE_FORMAT(ba.DischargeDate, '%Y-%m-%d') as DischargeDate,
			CASE 
				WHEN ba.DischargeDate IS NULL THEN 'current' 
				WHEN ba.DischargeDate < CURDATE() THEN 'discharged'
				ELSE 'scheduled'
			END AS Status
		FROM BedAssignments ba
		JOIN BedInventory bi ON ba.BedID = bi.BedID
		JOIN Patients p ON ba.PatientID = p.PatientID
		ORDER BY ba.AdmissionDate DESC
	`)
	if err != nil {
		log.Printf("Error querying bed assignments: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var assignments []models.BedAssignment
	for rows.Next() {
		var assignment models.BedAssignment
		var dischargeDate *string // Nullable

		err := rows.Scan(
			&assignment.AssignmentID,
			&assignment.BedID,
			&assignment.BedType,
			&assignment.PatientID,
			&assignment.PatientName,
			&assignment.AdmissionDate,
			&dischargeDate,
			&assignment.Status,
		)
		if err != nil {
			log.Printf("Error scanning bed assignment row: %v", err)
			continue
		}

		if dischargeDate != nil {
			assignment.DischargeDate = *dischargeDate
		}

		assignments = append(assignments, assignment)
	}

	json.NewEncoder(w).Encode(assignments)
}

// CreateBedAssignment creates a new bed assignment
func CreateBedAssignment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		bedSendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var assignment models.BedAssignment
	err := json.NewDecoder(r.Body).Decode(&assignment)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		bedSendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if assignment.BedID == 0 || assignment.PatientID == 0 || assignment.AdmissionDate == "" {
		bedSendJSONError(w, "BedID, PatientID, and AdmissionDate are required", http.StatusBadRequest)
		return
	}

	// Check if bed exists and is available
	var bedStatus string
	var bedType string
	err = database.DB.QueryRow(`
		SELECT 
			bi.BedType,
			CASE 
				WHEN EXISTS (
					SELECT 1 FROM BedAssignments ba 
					WHERE ba.BedID = bi.BedID AND (ba.DischargeDate IS NULL OR ba.DischargeDate > CURDATE())
				) THEN 'occupied' 
				ELSE 'available'
			END AS Status
		FROM BedInventory bi
		WHERE bi.BedID = ?
	`, assignment.BedID).Scan(&bedType, &bedStatus)
	if err != nil {
		log.Printf("Error checking bed availability: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if bedStatus != "available" {
		bedSendJSONError(w, "Bed is not available", http.StatusBadRequest)
		return
	}

	// Check if patient exists
	var patientExists int
	err = database.DB.QueryRow("SELECT COUNT(*) FROM Patients WHERE PatientID = ?", assignment.PatientID).Scan(&patientExists)
	if err != nil {
		log.Printf("Error checking patient: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	if patientExists == 0 {
		bedSendJSONError(w, "Patient not found", http.StatusBadRequest)
		return
	}

	// Insert new assignment
	var result interface{}
	var dischargeDate interface{} = nil
	if assignment.DischargeDate != "" {
		dischargeDate = assignment.DischargeDate
	}

	result, err = database.DB.Exec(
		"INSERT INTO BedAssignments (BedID, PatientID, AdmissionDate, DischargeDate) VALUES (?, ?, ?, ?)",
		assignment.BedID, assignment.PatientID, assignment.AdmissionDate, dischargeDate)
	if err != nil {
		log.Printf("Error inserting bed assignment: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Get the new assignment ID
	assignmentID, err := result.(interface{ LastInsertId() (int64, error) }).LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Update the BedsCount table
	var hospitalID int
	err = database.DB.QueryRow("SELECT HospitalID FROM BedInventory WHERE BedID = ?", assignment.BedID).Scan(&hospitalID)
	if err != nil {
		log.Printf("Error getting hospital ID: %v", err)
		// Don't fail the request, just log the error
	} else {
		_, err = database.DB.Exec(
			`UPDATE BedsCount 
             SET OccupiedBeds = OccupiedBeds + 1, VacantBeds = VacantBeds - 1
             WHERE HospitalID = ? AND BedType = ?`,
			hospitalID, bedType)
		if err != nil {
			log.Printf("Error updating BedsCount: %v", err)
			// Don't fail the request, just log the error
		}
	}

	// Return the new assignment with ID
	assignment.AssignmentID = int(assignmentID)
	assignment.Status = "current"
	assignment.BedType = bedType

	// Get patient name
	err = database.DB.QueryRow("SELECT FullName FROM Patients WHERE PatientID = ?", assignment.PatientID).Scan(&assignment.PatientName)
	if err != nil {
		log.Printf("Error getting patient name: %v", err)
		// Don't include patient name if not found
	}

	json.NewEncoder(w).Encode(assignment)
}

// GetBedStats returns statistics about bed occupancy
func GetBedStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get overall bed statistics
	var stats models.BedStats
	err := database.DB.QueryRow(`
		SELECT 
			COUNT(*) as TotalBeds,
			SUM(CASE WHEN EXISTS (
				SELECT 1 FROM BedAssignments ba 
				WHERE ba.BedID = bi.BedID AND (ba.DischargeDate IS NULL OR ba.DischargeDate > CURDATE())
			) THEN 1 ELSE 0 END) as OccupiedBeds
		FROM BedInventory bi
	`).Scan(&stats.TotalBeds, &stats.OccupiedBeds)
	if err != nil {
		log.Printf("Error getting bed statistics: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	stats.VacantBeds = stats.TotalBeds - stats.OccupiedBeds
	if stats.TotalBeds > 0 {
		stats.OccupancyRate = float64(stats.OccupiedBeds) / float64(stats.TotalBeds) * 100
	}

	// Get bed type statistics
	rows, err := database.DB.Query(`
		SELECT 
			bi.BedType,
			COUNT(*) as Total,
			SUM(CASE WHEN EXISTS (
				SELECT 1 FROM BedAssignments ba 
				WHERE ba.BedID = bi.BedID AND (ba.DischargeDate IS NULL OR ba.DischargeDate > CURDATE())
			) THEN 1 ELSE 0 END) as Occupied
		FROM BedInventory bi
		GROUP BY bi.BedType
	`)
	if err != nil {
		log.Printf("Error querying bed types: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var bedTypes []models.BedType
	for rows.Next() {
		var bedType models.BedType
		err := rows.Scan(&bedType.Type, &bedType.Total, &bedType.Occupied)
		if err != nil {
			log.Printf("Error scanning bed type stats: %v", err)
			continue
		}

		// Get description
		err = database.DB.QueryRow("SELECT Description FROM BedTypes WHERE BedType = ?", bedType.Type).Scan(&bedType.Description)
		if err != nil {
			log.Printf("Error getting bed type description: %v", err)
			// Use empty description if not found
			bedType.Description = ""
		}

		bedType.Vacant = bedType.Total - bedType.Occupied
		bedTypes = append(bedTypes, bedType)
	}

	stats.BedTypes = bedTypes
	json.NewEncoder(w).Encode(stats)
}

// Helper function to send JSON error responses
func bedSendJSONError(w http.ResponseWriter, message string, statusCode int) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
