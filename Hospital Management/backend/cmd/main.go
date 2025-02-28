package main

import (
    "log"
    "net/http"
    "github.com/gorilla/mux"
    "github.com/rs/cors"
    "hospital-management/backend/internal/database"
    "hospital-management/backend/internal/handlers"
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

    // CORS middleware
    c := cors.New(cors.Options{
        AllowedOrigins: []string{"*"},  // For development only, update for production
        AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders: []string{"*"},
        AllowCredentials: true,
    })

    // Start server
    log.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", c.Handler(r)))
} 