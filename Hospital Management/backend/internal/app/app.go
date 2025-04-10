package app

import (
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/handlers"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

var (
	// FrontendDir is the path to the frontend directory
	FrontendDir = "./frontend"
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

	// Routes already defined in main.go
	r.HandleFunc("/api/appointments", handlers.CreateAppointment).Methods("GET", "POST")
	r.HandleFunc("/api/doctors", handlers.GetDoctors).Methods("GET")
	r.HandleFunc("/api/appointments/list", handlers.GetFilteredAppointments).Methods("GET")
	r.HandleFunc("/api/appointments/{id}/status", handlers.UpdateAppointmentStatus).Methods("PUT", "OPTIONS")
	r.HandleFunc("/api/admin/stats", handlers.GetAdminStats).Methods("GET")
	r.HandleFunc("/api/admin/activity", handlers.GetRecentActivity).Methods("GET")
	r.HandleFunc("/api/patients", handlers.GetPatients).Methods("GET")

	// New routes for doctor and staff appointments
	r.HandleFunc("/api/doctor/{doctorID}/appointments", handlers.GetDoctorAppointments).Methods("GET")
	r.HandleFunc("/api/staff/appointments", handlers.GetStaffAppointments).Methods("GET")
	r.HandleFunc("/api/staff/appointments/{id}/status", handlers.UpdateAppointmentStatus).Methods("PUT", "OPTIONS")

	// Doctor profile and bed management
	r.HandleFunc("/api/doctor/{doctorID}/profile", handlers.GetDoctorProfile).Methods("GET")
	r.HandleFunc("/api/doctor/{doctorID}/profile", handlers.UpdateDoctorProfile).Methods("PUT", "OPTIONS")
	r.HandleFunc("/api/doctor/{doctorID}/beds", handlers.GetDoctorBeds).Methods("GET")
	r.HandleFunc("/api/doctor/{doctorID}/patients", handlers.GetDoctorPatients).Methods("GET")
	r.HandleFunc("/api/doctor/bed/allocate", handlers.AllocateBed).Methods("POST", "OPTIONS")

	// Staff dashboard and bed management
	r.HandleFunc("/api/staff/dashboard", handlers.GetStaffDashboard).Methods("GET")
	r.HandleFunc("/api/staff/patients", handlers.GetPatientsList).Methods("GET")
	r.HandleFunc("/api/staff/patients/register", handlers.RegisterPatient).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/staff/beds", handlers.GetAvailableBeds).Methods("GET")
	r.HandleFunc("/api/staff/patients/discharge", handlers.DischargePatient).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/staff/patients/transfer", handlers.TransferPatient).Methods("POST", "OPTIONS")

	// Bed management API endpoints
	r.HandleFunc("/api/beds/types", handlers.GetBedTypes).Methods("GET")
	r.HandleFunc("/api/beds/inventory", handlers.GetBedInventory).Methods("GET")
	r.HandleFunc("/api/beds/add", handlers.CreateBed).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/assignments", handlers.GetBedAssignments).Methods("GET")
	r.HandleFunc("/api/beds/assignments/add", handlers.CreateBedAssignment).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/stats", handlers.GetBedStats).Methods("GET")
	r.HandleFunc("/api/beds/sync", handlers.SyncBedsCount).Methods("POST")

	// Hospital management API endpoints
	r.HandleFunc("/api/hospitals", handlers.GetHospitals).Methods("GET")

	return r
}

// Start starts the application with CORS support
func Start() error {
	r := SetupRouter()

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // For development only
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	// Start server
	log.Println("Server starting on port 8080...")
	return http.ListenAndServe(":8080", c.Handler(r))
}
