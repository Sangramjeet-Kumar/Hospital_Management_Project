package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
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

	// Check if the table exists or has any rows
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM BedAssignments").Scan(&count)
	if err != nil {
		log.Printf("Error checking BedAssignments table: %v", err)
		// Return empty array instead of error
		json.NewEncoder(w).Encode([]models.BedAssignment{})
		return
	}

	// If table is empty, return empty array immediately
	if count == 0 {
		log.Printf("BedAssignments table is empty, returning empty array")
		json.NewEncoder(w).Encode([]models.BedAssignment{})
		return
	}

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
		// Return empty array instead of error
		json.NewEncoder(w).Encode([]models.BedAssignment{})
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

	// Check if patient already has an active bed assignment
	var hasExistingAssignment bool
	err = database.DB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM BedAssignments 
			WHERE PatientID = ? 
			AND (DischargeDate IS NULL OR DischargeDate > CURDATE())
		)
	`, assignment.PatientID).Scan(&hasExistingAssignment)

	if err != nil {
		log.Printf("Error checking existing patient assignments: %v", err)
		bedSendJSONError(w, "Error checking patient assignment status", http.StatusInternalServerError)
		return
	}

	if hasExistingAssignment {
		log.Printf("Patient %d already has an active bed assignment", assignment.PatientID)
		bedSendJSONError(w, "This patient already has an active bed assignment. Please discharge the patient from their current bed first.", http.StatusConflict)
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

// Helper function to calculate percentage
func calculatePercentage(part, total int) float64 {
	if total == 0 {
		return 0
	}
	return float64(part) / float64(total) * 100
}

// GetBedStats returns bed statistics by bed type
func GetBedStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	query := `
		SELECT 
			bi.BedType, 
			COUNT(bi.BedID) AS TotalBeds,
			SUM(CASE WHEN ba.BedID IS NULL THEN 1 ELSE 0 END) AS AvailableBeds,
			SUM(CASE WHEN ba.BedID IS NOT NULL THEN 1 ELSE 0 END) AS OccupiedBeds
		FROM 
			BedInventory bi
		LEFT JOIN 
			(SELECT BedID FROM BedAssignments WHERE DischargeDate IS NULL) ba 
			ON bi.BedID = ba.BedID
		GROUP BY bi.BedType
		ORDER BY bi.BedType
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("Error querying bed stats: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stats []map[string]interface{}
	for rows.Next() {
		var bedType string
		var totalBeds, availableBeds, occupiedBeds int

		err := rows.Scan(&bedType, &totalBeds, &availableBeds, &occupiedBeds)
		if err != nil {
			log.Printf("Error scanning bed stats row: %v", err)
			continue
		}

		stat := map[string]interface{}{
			"type":          bedType,
			"totalBeds":     totalBeds,
			"availableBeds": availableBeds,
			"occupiedBeds":  occupiedBeds,
			"occupancyRate": calculatePercentage(occupiedBeds, totalBeds),
		}

		stats = append(stats, stat)
	}

	json.NewEncoder(w).Encode(stats)
}

// SyncBedsCount synchronizes the BedsCount table with actual data from BedInventory and BedAssignments
func SyncBedsCount(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Start a transaction for consistency
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback() // Will be ignored if tx.Commit() is called

	// 1. Get a list of all hospital and bed type combinations
	rows, err := tx.Query(`
		SELECT DISTINCT h.HospitalID, bt.BedType 
		FROM Hospital h
		CROSS JOIN BedTypes bt
		WHERE EXISTS (
			SELECT 1 
			FROM BedInventory bi 
			WHERE bi.HospitalID = h.HospitalID AND bi.BedType = bt.BedType
		)
	`)
	if err != nil {
		log.Printf("Error getting hospital and bed type combinations: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	type HospitalBedType struct {
		HospitalID int
		BedType    string
	}

	var combinations []HospitalBedType
	for rows.Next() {
		var combo HospitalBedType
		if err := rows.Scan(&combo.HospitalID, &combo.BedType); err != nil {
			log.Printf("Error scanning hospital and bed type: %v", err)
			continue
		}
		combinations = append(combinations, combo)
	}
	rows.Close()

	if len(combinations) == 0 {
		log.Println("No hospital and bed type combinations found")
		bedSendJSONError(w, "No data to synchronize", http.StatusNotFound)
		return
	}

	// 2. For each combination, calculate the correct counts
	var updates []string
	for _, combo := range combinations {
		// Get total beds
		var totalBeds int
		err := tx.QueryRow(`
			SELECT COUNT(*) 
			FROM BedInventory 
			WHERE HospitalID = ? AND BedType = ?
		`, combo.HospitalID, combo.BedType).Scan(&totalBeds)

		if err != nil {
			log.Printf("Error counting total beds for hospital %d, bed type %s: %v",
				combo.HospitalID, combo.BedType, err)
			continue
		}

		// Get occupied beds
		var occupiedBeds int
		err = tx.QueryRow(`
			SELECT COUNT(*) 
			FROM BedInventory bi
			JOIN BedAssignments ba ON bi.BedID = ba.BedID
			WHERE bi.HospitalID = ? 
			AND bi.BedType = ? 
			AND (ba.DischargeDate IS NULL OR ba.DischargeDate > CURDATE())
		`, combo.HospitalID, combo.BedType).Scan(&occupiedBeds)

		if err != nil {
			log.Printf("Error counting occupied beds for hospital %d, bed type %s: %v",
				combo.HospitalID, combo.BedType, err)
			continue
		}

		// Calculate vacant beds
		vacantBeds := totalBeds - occupiedBeds

		// 3. Update or insert the BedsCount record
		var exists bool
		err = tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1 
				FROM BedsCount 
				WHERE HospitalID = ? AND BedType = ?
			)
		`, combo.HospitalID, combo.BedType).Scan(&exists)

		if err != nil {
			log.Printf("Error checking if BedsCount record exists: %v", err)
			continue
		}

		if exists {
			_, err = tx.Exec(`
				UPDATE BedsCount 
				SET TotalBeds = ?, OccupiedBeds = ?, VacantBeds = ?
				WHERE HospitalID = ? AND BedType = ?
			`, totalBeds, occupiedBeds, vacantBeds, combo.HospitalID, combo.BedType)
		} else {
			_, err = tx.Exec(`
				INSERT INTO BedsCount (HospitalID, BedType, TotalBeds, OccupiedBeds, VacantBeds)
				VALUES (?, ?, ?, ?, ?)
			`, combo.HospitalID, combo.BedType, totalBeds, occupiedBeds, vacantBeds)
		}

		if err != nil {
			log.Printf("Error updating BedsCount for hospital %d, bed type %s: %v",
				combo.HospitalID, combo.BedType, err)
			continue
		}

		updates = append(updates, fmt.Sprintf("Hospital %d, %s: %d total, %d occupied, %d vacant",
			combo.HospitalID, combo.BedType, totalBeds, occupiedBeds, vacantBeds))
	}

	// 4. Commit the transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		bedSendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// 5. Return success response
	response := map[string]interface{}{
		"success": true,
		"message": "BedsCount table synchronized successfully",
		"updates": updates,
	}

	log.Println("BedsCount table synchronized successfully")
	json.NewEncoder(w).Encode(response)
}

// Helper function to send JSON error responses
func bedSendJSONError(w http.ResponseWriter, message string, statusCode int) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
