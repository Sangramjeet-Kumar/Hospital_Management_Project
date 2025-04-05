package database

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

const (
    user     = "root"            // Your MySQL username
    password = "#Dishu1026"    // Your MySQL password
    dbname   = "hospital_db"     // Your database name
    host     = "localhost"       // localhost
    port     = 3306              // default MySQL port
)


var DB *sql.DB

func InitDB() {
    // DSN (Data Source Name) format for MySQL
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
        user, password, host, port, dbname)

    var err error
    DB, err = sql.Open("mysql", dsn)
    if err != nil {
        log.Fatalf("Error opening database: %v", err)
    }

    // Test the connection
    err = DB.Ping()
    if err != nil {
        log.Fatalf("Error connecting to the database: %v", err)
    }

    // Set connection pool settings
    DB.SetMaxOpenConns(10)
    DB.SetMaxIdleConns(5)

    log.Println("Successfully connected to MySQL database")
}