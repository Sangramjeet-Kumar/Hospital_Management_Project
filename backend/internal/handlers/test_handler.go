package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

// TestRequest represents a simple request for testing
type TestRequest struct {
	Message string `json:"message"`
	Number  int    `json:"number"`
}

// TestResponse represents a simple response for testing
type TestResponse struct {
	Success bool   `json:"success"`
	Echo    string `json:"echo"`
}

// TestHandler is a simple handler to test that the HTTP requests are being processed correctly
func TestHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle OPTIONS request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		log.Println("Test endpoint: OPTIONS request handled")
		return
	}

	// Only accept POST requests
	if r.Method != http.MethodPost {
		log.Printf("Test endpoint: Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Log that we received a request
	log.Println("Test endpoint: Received POST request")

	// Read the entire request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Test endpoint: Error reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	// Log the raw request body
	log.Printf("Test endpoint: Raw request body: %s", string(bodyBytes))

	// Try to parse the request body as JSON
	var req TestRequest
	err = json.Unmarshal(bodyBytes, &req)
	if err != nil {
		log.Printf("Test endpoint: Error parsing JSON: %v", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Log the parsed request
	log.Printf("Test endpoint: Parsed request: Message=%s, Number=%d", req.Message, req.Number)

	// Create a response
	response := TestResponse{
		Success: true,
		Echo:    req.Message + " (echoed back)",
	}

	// Set content type
	w.Header().Set("Content-Type", "application/json")

	// Write the response
	w.WriteHeader(http.StatusOK)
	responseBytes, _ := json.Marshal(response)
	log.Printf("Test endpoint: Sending response: %s", string(responseBytes))
	w.Write(responseBytes)
}
