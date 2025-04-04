package main

import (
	"hospital-management/backend/internal/database"
	"hospital-management/backend/internal/handlers"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize database
	database.InitDB()

	// Create router
	r := mux.NewRouter()

	// Routes
	r.HandleFunc("/api/appointments", handlers.CreateAppointment).Methods("POST")
	r.HandleFunc("/api/doctors", handlers.GetDoctors).Methods("GET")
	r.HandleFunc("/api/appointments/list", handlers.GetFilteredAppointments).Methods("GET")
	r.HandleFunc("/api/appointments/{id}/status", handlers.UpdateAppointmentStatus).Methods("PUT", "OPTIONS")
	r.HandleFunc("/api/admin/stats", handlers.GetAdminStats).Methods("GET")
	r.HandleFunc("/api/admin/activity", handlers.GetRecentActivity).Methods("GET")
	r.HandleFunc("/api/patients", handlers.GetPatients).Methods("GET")

	// Bed management routes
	r.HandleFunc("/api/beds/types", handlers.GetBedTypes).Methods("GET")
	r.HandleFunc("/api/beds/inventory", handlers.GetBedInventory).Methods("GET")
	r.HandleFunc("/api/beds", handlers.CreateBed).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/add", handlers.CreateBed).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/assignments", handlers.GetBedAssignments).Methods("GET")
	r.HandleFunc("/api/beds/assignments/add", handlers.CreateBedAssignment).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/beds/stats", handlers.GetBedStats).Methods("GET")

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // For development only, update for production
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	// Print startup message with endpoint info
	log.Println("Starting server on port 8080...")
	log.Println("Bed API endpoints:")
	log.Println("GET /api/beds/types - Get all bed types")
	log.Println("GET /api/beds/inventory - Get all beds")
	log.Println("POST /api/beds/add or POST /api/beds - Add a new bed")
	log.Println("GET /api/beds/assignments - Get all bed assignments")
	log.Println("POST /api/beds/assignments/add - Add a new bed assignment")
	log.Println("GET /api/beds/stats - Get bed statistics")

	// Start server
	log.Fatal(http.ListenAndServe(":8080", c.Handler(r)))
}
