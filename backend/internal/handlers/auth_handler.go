package handlers

import (
	"bytes"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/models"
	"io"
	"log"
	"net/http"
	"strconv"
)

// Login handles employee authentication
func Login(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for the preflight request
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request handled successfully")
		return
	}

	// Set CORS headers for the main request
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// Only accept POST requests
	if r.Method != http.MethodPost {
		log.Printf("Method not allowed: %s", r.Method)
		sendJSONResponse(w, http.StatusMethodNotAllowed, map[string]interface{}{
			"success": false,
			"message": "Method not allowed",
		})
		return
	}

	// Print the raw request body for debugging
	var bodyBytes []byte
	bodyBytes, _ = readAndReplaceBody(r)
	bodyStr := string(bodyBytes)
	log.Printf("Raw request body: %s", bodyStr)

	// Parse the request body
	var loginReq models.LoginRequest
	err := json.Unmarshal(bodyBytes, &loginReq)
	if err != nil {
		log.Printf("Error decoding request body: %v", err)
		sendJSONResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	log.Printf("Login attempt: EmployeeID=%s, Role=%s", loginReq.EmployeeID, loginReq.Role)

	// Validate required fields
	if loginReq.EmployeeID == "" || loginReq.Password == "" || loginReq.Role == "" {
		log.Printf("Missing required fields: EmployeeID=%s, Password=<redacted>, Role=%s",
			loginReq.EmployeeID, loginReq.Role)
		sendJSONResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Employee ID, password, and role are required",
		})
		return
	}

	// Convert employee ID to integer
	employeeID, err := strconv.Atoi(loginReq.EmployeeID)
	if err != nil {
		log.Printf("Invalid employee ID format: %s - %v", loginReq.EmployeeID, err)
		sendJSONResponse(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid employee ID format",
		})
		return
	}

	// Query the database for the employee
	var employee models.Employee
	query := `SELECT EmployeeID, HospitalID, Password, FullName, Email, ContactNumber, Role 
			  FROM Employees 
			  WHERE EmployeeID = ? AND Role = ?`

	log.Printf("Executing query with EmployeeID=%d, Role=%s", employeeID, loginReq.Role)

	// Test the database connection
	err = database.DB.Ping()
	if err != nil {
		log.Printf("Database connection error: %v", err)
		sendJSONResponse(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Database connection error",
		})
		return
	}

	err = database.DB.QueryRow(query, employeeID, loginReq.Role).Scan(
		&employee.EmployeeID,
		&employee.HospitalID,
		&employee.Password,
		&employee.FullName,
		&employee.Email,
		&employee.ContactNumber,
		&employee.Role,
	)

	if err != nil {
		log.Printf("Database error or invalid credentials: %v", err)
		sendJSONResponse(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "Invalid credentials",
		})
		return
	}

	log.Printf("Found employee: ID=%d, Name=%s, Role=%s, StoredPassword=%s, ProvidedPassword=%s",
		employee.EmployeeID, employee.FullName, employee.Role, employee.Password, loginReq.Password)

	// Check if password matches (using constant-time comparison to prevent timing attacks)
	if subtle.ConstantTimeCompare([]byte(employee.Password), []byte(loginReq.Password)) != 1 {
		log.Printf("Password does not match for employee ID: %d", employeeID)
		sendJSONResponse(w, http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"message": "Invalid credentials",
		})
		return
	}

	// Determine redirect URL based on role
	redirectURL := ""
	switch employee.Role {
	case "admin":
		redirectURL = "/admin.html"
	case "doctor":
		redirectURL = "/doctor_dashboard.html"
	case "staff":
		redirectURL = "/staff_dashboard.html"
	default:
		redirectURL = "/index.html"
	}

	log.Printf("Login successful for %s (ID: %d, Role: %s). Redirecting to: %s",
		employee.FullName, employee.EmployeeID, employee.Role, redirectURL)

	// Create response
	response := models.LoginResponse{
		Success:     true,
		EmployeeID:  employee.EmployeeID,
		FullName:    employee.FullName,
		Role:        employee.Role,
		RedirectURL: redirectURL,
	}

	// Send response
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		sendJSONResponse(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": "Internal server error",
		})
		return
	}

	log.Printf("Response sent: %s", string(jsonResponse))
	w.WriteHeader(http.StatusOK)
	w.Write(jsonResponse)
}

// Helper function to read and replace the body
func readAndReplaceBody(r *http.Request) ([]byte, error) {
	bodyBytes := make([]byte, 0)

	if r.Body != nil {
		bodyBytes, _ = io.ReadAll(r.Body)
		r.Body.Close()
	}

	// Replace the body with a new io.ReadCloser
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	return bodyBytes, nil
}

// Helper function to send JSON responses
func sendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshalling JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	w.Write(jsonData)
}

// ChangePassword handles employee password changes
func ChangePassword(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for the preflight request
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		log.Println("OPTIONS request for change-password handled successfully")
		return
	}

	// Set CORS headers for the main request
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// Only accept POST requests
	if r.Method != http.MethodPost {
		log.Printf("Method not allowed for change-password: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request
	var req struct {
		EmployeeID      int    `json:"employeeId"`
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}

	// Decode the request body
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("Error decoding change password request: %v", err)
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	log.Printf("Password change request for employee ID: %d", req.EmployeeID)

	// Validate required fields
	if req.EmployeeID == 0 || req.CurrentPassword == "" || req.NewPassword == "" {
		log.Printf("Missing required fields for password change")
		http.Error(w, "Employee ID, current password, and new password are required", http.StatusBadRequest)
		return
	}

	// Verify current password
	var storedPassword string
	err = database.DB.QueryRow("SELECT Password FROM Employees WHERE EmployeeID = ?", req.EmployeeID).Scan(&storedPassword)

	if err != nil {
		log.Printf("Database error looking up employee: %v", err)
		http.Error(w, "Employee not found", http.StatusNotFound)
		return
	}

	// Check if current password matches
	if subtle.ConstantTimeCompare([]byte(storedPassword), []byte(req.CurrentPassword)) != 1 {
		log.Printf("Current password doesn't match for employee ID: %d", req.EmployeeID)
		http.Error(w, "Current password is incorrect", http.StatusUnauthorized)
		return
	}

	// Update password in the database
	_, err = database.DB.Exec("UPDATE Employees SET Password = ? WHERE EmployeeID = ?", req.NewPassword, req.EmployeeID)

	if err != nil {
		log.Printf("Database error updating password: %v", err)
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	log.Printf("Password successfully updated for employee ID: %d", req.EmployeeID)

	// Return success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
