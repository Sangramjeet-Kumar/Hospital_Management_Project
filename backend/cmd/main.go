package main

import (
	"fmt"
	"hospital-management/backend/internal/app"
	"hospital-management/backend/internal/database"
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	// Initialize database
	database.InitDB()

	// Initialize the application
	app.Initialize()

	// Handle graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		fmt.Println("\nShutting down server...")
		// Add cleanup code here if needed
		os.Exit(0)
	}()

	// Start the application
	err := app.Start()
	if err != nil {
		log.Fatal(err)
	}
}
