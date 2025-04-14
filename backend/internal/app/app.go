package app

import (
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/handlers"
	"log"
	"net/http"
	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

var (
	// FrontendDir is the path to the frontend directory
	FrontendDir = "."
)

// Initialize initializes the application
func Initialize() {
	// Initialize database using the existing method
	database.InitDB()
	log.Println("Application initialized successfully")
}

// SetupRouter creates and configures a router with all API routes
func SetupRouter() *mux.Router {
	// Create router
	r := mux.NewRouter()

	// Authentication endpoint
	r.HandleFunc("/api/auth/login", handlers.Login).Methods("POST", "OPTIONS")

	// Password change endpoint
	r.HandleFunc("/api/auth/change-password", handlers.ChangePassword).Methods("POST", "OPTIONS")

	// Test endpoint
	r.HandleFunc("/api/test", handlers.TestHandler).Methods("POST", "OPTIONS")

	// Routes already defined in main.go
	r.HandleFunc("/api/appointments", handlers.CreateAppointment).Methods("GET", "POST")
	r.HandleFunc("/api/doctors", handlers.GetDoctors).Methods("GET")
	r.HandleFunc("/api/doctors", handlers.CreateDoctor).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/appointments/list", handlers.GetFilteredAppointments).Methods("GET")
	r.HandleFunc("/api/appointments/{id}/status", handlers.UpdateAppointmentStatus).Methods("PUT", "OPTIONS")
	r.HandleFunc("/api/admin/stats", handlers.GetAdminStats).Methods("GET")
	r.HandleFunc("/api/admin/activity", handlers.GetRecentActivity).Methods("GET")
	r.HandleFunc("/api/patients", handlers.GetPatients).Methods("GET")
	r.HandleFunc("/api/patients", handlers.CreatePatient).Methods("POST", "OPTIONS")

	// Doctor appointments API endpoint (new)
	r.HandleFunc("/api/doctor/appointments", handlers.GetDoctorAppointments).Methods("GET", "OPTIONS")
	
	// Doctor profile API endpoints (new)
	r.HandleFunc("/api/doctor/profile", handlers.GetDoctorProfile).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/doctor/profile/update", handlers.UpdateDoctorProfile).Methods("PUT", "POST", "OPTIONS")

	// Doctor bed management API endpoints
	r.HandleFunc("/api/doctor/beds", handlers.GetDoctorBeds).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/doctor/assign-bed", handlers.AssignBed).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/doctor/transfer-bed", handlers.TransferBed).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/doctor/assign-bed-from-appointment", handlers.AssignBedFromAppointment).Methods("POST", "OPTIONS")

	// Bed management API endpoints
	r.HandleFunc("/api/beds/types", handlers.GetBedTypes).Methods("GET")
	r.HandleFunc("/api/beds/inventory", handlers.GetBedInventory).Methods("GET")
	r.HandleFunc("/api/beds/add", handlers.CreateBed).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/assignments", handlers.GetBedAssignments).Methods("GET")
	r.HandleFunc("/api/beds/assignments/add", handlers.CreateBedAssignment).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/stats", handlers.GetBedStats).Methods("GET")
	r.HandleFunc("/api/beds/sync", handlers.SyncBedsCount).Methods("GET", "POST")

	// Hospital management API endpoints
	r.HandleFunc("/api/hospitals", handlers.GetHospitals).Methods("GET")

	// Staff dashboard API endpoints
	r.HandleFunc("/api/staff/stats", handlers.GetStaffStats).Methods("GET")
	r.HandleFunc("/api/staff/patients", handlers.GetStaffPatients).Methods("GET")
	r.HandleFunc("/api/staff/beds", handlers.GetBedStatus).Methods("GET")
	r.HandleFunc("/api/staff/appointments", handlers.GetStaffAppointments).Methods("GET")
	r.HandleFunc("/api/staff/{id}/profile", handlers.GetStaffProfile).Methods("GET")
	r.HandleFunc("/api/staff/{id}/profile", handlers.UpdateStaffProfile).Methods("PUT", "OPTIONS")

	// Setup static file server for the frontend files
	fs := http.FileServer(http.Dir(FrontendDir))
	r.PathPrefix("/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set cache control headers to prevent browser caching
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		
		// If the request is for a specific HTML page, serve index.html
		// This enables client-side routing
		path := r.URL.Path
		if ext := filepath.Ext(path); ext == "" {
			http.ServeFile(w, r, filepath.Join(FrontendDir, "index.html"))
			return
		}
		
		// Otherwise, serve the requested file
		log.Printf("Serving static file: %s", path)
		fs.ServeHTTP(w, r)
	}))

	return r
}

// Start starts the application with CORS support
func Start() error {
	r := SetupRouter()

	// CORS middleware with more permissive settings for development
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
		Debug:            true, // Enable for debugging CORS issues
	})

	// Start server
	log.Println("Server starting on port 8080...")
	return http.ListenAndServe(":8080", c.Handler(r))
}
