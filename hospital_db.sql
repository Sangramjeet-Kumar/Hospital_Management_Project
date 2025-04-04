-- Create Hospital Database
CREATE DATABASE hospital_db;
USE hospital_db;

-- Create Patients Table
CREATE TABLE Patients (
    PatientID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Address TEXT,
    City VARCHAR(100),
    State VARCHAR(100),
    PinCode VARCHAR(10),
    Gender VARCHAR(10),
    Adhar VARCHAR(20)
);

-- Create Doctors Table
CREATE TABLE Doctors (
    DoctorID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Department VARCHAR(50) NOT NULL,
    Username VARCHAR(255) NOT NULL UNIQUE
);

-- Create Appointment Table
CREATE TABLE Appointment (
    AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    Description TEXT,
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

select * from Appointment;

-- Insert doctors data
INSERT INTO Doctors (FullName, Description, ContactNumber, Email, Department, Username) VALUES
('Dr. Sarah Johnson', 'Board-certified cardiologist with 15 years of experience in treating heart diseases and performing cardiac procedures', '9876543210', 'sarah.johnson@pulsepoint.com', 'Cardiology', 'dr.sarah'),
('Dr. Michael Chen', 'Experienced neurologist specializing in stroke treatment and neurological disorders', '9876543211', 'michael.chen@pulsepoint.com', 'Neurology', 'dr.chen'),
('Dr. Robert Smith', 'Orthopedic surgeon with expertise in joint replacement and sports injuries', '9876543212', 'robert.smith@pulsepoint.com', 'Orthopedics', 'dr.smith'),
('Dr. Emily Brown', 'Expert ophthalmologist specializing in cataract surgery and retinal diseases', '9876543213', 'emily.brown@pulsepoint.com', 'Ophthalmology', 'dr.brown'),
('Dr. Lisa Wong', 'Pediatric specialist with focus on newborn care and childhood development', '9876543214', 'lisa.wong@pulsepoint.com', 'Pediatrics', 'dr.wong');



-- Drop existing tables if they exist
DROP TABLE IF EXISTS Appointment;
DROP TABLE IF EXISTS Doctors;
DROP TABLE IF EXISTS Patients;

-- Create Patients Table
CREATE TABLE Patients (
    PatientID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Address TEXT,
    City VARCHAR(100),
    State VARCHAR(100),
    PinCode VARCHAR(10),
    Gender VARCHAR(10),
    Adhar VARCHAR(20),
    UNIQUE KEY unique_email (Email)
);

-- Create Doctors Table
CREATE TABLE Doctors (
    DoctorID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Department VARCHAR(50) NOT NULL,
    Username VARCHAR(255) NOT NULL,
    UNIQUE KEY unique_email (Email),
    UNIQUE KEY unique_username (Username)
);

-- Create Appointment Table
CREATE TABLE Appointment (
    AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    Description TEXT,
    Status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

-- Insert sample doctors data
INSERT INTO Doctors (FullName, Description, ContactNumber, Email, Department, Username) VALUES
('Dr. Sarah Johnson', 'Board-certified cardiologist with 15 years of experience in treating heart diseases and performing cardiac procedures', '9876543210', 'sarah.johnson@pulsepoint.com', 'Cardiology', 'dr.sarah'),
('Dr. Michael Chen', 'Experienced neurologist specializing in stroke treatment and neurological disorders', '9876543211', 'michael.chen@pulsepoint.com', 'Neurology', 'dr.chen'),
('Dr. Robert Smith', 'Orthopedic surgeon with expertise in joint replacement and sports injuries', '9876543212', 'robert.smith@pulsepoint.com', 'Orthopedics', 'dr.smith'),
('Dr. Emily Brown', 'Expert ophthalmologist specializing in cataract surgery and retinal diseases', '9876543213', 'emily.brown@pulsepoint.com', 'Ophthalmology', 'dr.brown'),
('Dr. Lisa Wong', 'Pediatric specialist with focus on newborn care and childhood development', '9876543214', 'lisa.wong@pulsepoint.com', 'Pediatrics', 'dr.wong');

select * FROM Doctors;

-- Insert additional doctors
INSERT INTO Doctors (FullName, Description, ContactNumber, Email, Department, Username) VALUES
('Dr. James Wilson', 'Cardiologist with specialization in interventional procedures and heart failure management', '9876543215', 'james.wilson@pulsepoint.com', 'Cardiology', 'dr.wilson'),
('Dr. Maria Garcia', 'Pediatric specialist focusing on newborn care and childhood development disorders', '9876543216', 'maria.garcia@pulsepoint.com', 'Pediatrics', 'dr.garcia'),
('Dr. David Lee', 'Neurologist specializing in movement disorders and neurodegenerative diseases', '9876543217', 'david.lee@pulsepoint.com', 'Neurology', 'dr.lee'),
('Dr. Rachel Green', 'Ophthalmologist expert in LASIK surgery and retinal treatments', '9876543218', 'rachel.green@pulsepoint.com', 'Ophthalmology', 'dr.green'),
('Dr. John Murphy', 'Orthopedic surgeon specializing in sports injuries and joint replacements', '9876543219', 'john.murphy@pulsepoint.com', 'Orthopedics', 'dr.murphy'),
('Dr. Anna Patel', 'Cardiologist focusing on preventive cardiology and heart rhythm disorders', '9876543220', 'anna.patel@pulsepoint.com', 'Cardiology', 'dr.patel'),
('Dr. Thomas Anderson', 'Neurologist with expertise in epilepsy and sleep disorders', '9876543221', 'thomas.anderson@pulsepoint.com', 'Neurology', 'dr.anderson'),
('Dr. Sofia Rodriguez', 'Pediatric specialist with focus on adolescent medicine', '9876543222', 'sofia.rodriguez@pulsepoint.com', 'Pediatrics', 'dr.rodriguez'),
('Dr. Michael Chang', 'Orthopedic surgeon specializing in spine surgery and minimally invasive procedures', '9876543223', 'michael.chang@pulsepoint.com', 'Orthopedics', 'dr.chang'),
('Dr. Emma Thompson', 'Ophthalmologist specializing in pediatric eye disorders and strabismus surgery', '9876543224', 'emma.thompson@pulsepoint.com', 'Ophthalmology', 'dr.thompson');

select * FROM Patients;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS Appointment;
DROP TABLE IF EXISTS Patients;
DROP TABLE IF EXISTS Doctors;

-- Create Doctors Table
CREATE TABLE Doctors (
    DoctorID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    Description TEXT NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Department VARCHAR(50) NOT NULL,
    Username VARCHAR(255) NOT NULL,
    UNIQUE KEY unique_email (Email),
    UNIQUE KEY unique_username (Username)
);

-- Create Patients Table
CREATE TABLE Patients (
    PatientID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(255) NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Address TEXT,
    City VARCHAR(100),
    State VARCHAR(100),
    PinCode VARCHAR(10),
    Gender VARCHAR(10),
    Adhar VARCHAR(20),
    UNIQUE KEY unique_email (Email)
);

-- Create Appointment Table
CREATE TABLE Appointment (
    AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
    PatientID INT NOT NULL,
    DoctorID INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime VARCHAR(10) NOT NULL,
    Description TEXT,
    Status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

select * from Doctors;

-- Insert additional doctors
INSERT INTO Doctors (FullName, Description, ContactNumber, Email, Department, Username) VALUES
('Dr. James Wilson', 'Cardiologist with specialization in interventional procedures and heart failure management', '9876543215', 'james.wilson@pulsepoint.com', 'Cardiology', 'dr.wilson'),
('Dr. Maria Garcia', 'Pediatric specialist focusing on newborn care and childhood development disorders', '9876543216', 'maria.garcia@pulsepoint.com', 'Pediatrics', 'dr.garcia'),
('Dr. David Lee', 'Neurologist specializing in movement disorders and neurodegenerative diseases', '9876543217', 'david.lee@pulsepoint.com', 'Neurology', 'dr.lee'),
('Dr. Rachel Green', 'Ophthalmologist expert in LASIK surgery and retinal treatments', '9876543218', 'rachel.green@pulsepoint.com', 'Ophthalmology', 'dr.green'),
('Dr. John Murphy', 'Orthopedic surgeon specializing in sports injuries and joint replacements', '9876543219', 'john.murphy@pulsepoint.com', 'Orthopedics', 'dr.murphy'),
('Dr. Anna Patel', 'Cardiologist focusing on preventive cardiology and heart rhythm disorders', '9876543220', 'anna.patel@pulsepoint.com', 'Cardiology', 'dr.patel'),
('Dr. Thomas Anderson', 'Neurologist with expertise in epilepsy and sleep disorders', '9876543221', 'thomas.anderson@pulsepoint.com', 'Neurology', 'dr.anderson'),
('Dr. Sofia Rodriguez', 'Pediatric specialist with focus on adolescent medicine', '9876543222', 'sofia.rodriguez@pulsepoint.com', 'Pediatrics', 'dr.rodriguez'),
('Dr. Michael Chang', 'Orthopedic surgeon specializing in spine surgery and minimally invasive procedures', '9876543223', 'michael.chang@pulsepoint.com', 'Orthopedics', 'dr.chang'),
('Dr. Emma Thompson', 'Ophthalmologist specializing in pediatric eye disorders and strabismus surgery', '9876543224', 'emma.thompson@pulsepoint.com', 'Ophthalmology', 'dr.thompson');



-- Insert sample doctors
INSERT INTO Doctors (FullName, Description, ContactNumber, Email, Department, Username) VALUES
('Dr. Sarah Johnson', 'Board-certified cardiologist with 15 years of experience in treating heart diseases', '9876543210', 'sarah.johnson@pulsepoint.com', 'Cardiology', 'dr.sarah'),
('Dr. Michael Chen', 'Experienced neurologist specializing in stroke treatment and neurological disorders', '9876543211', 'michael.chen@pulsepoint.com', 'Neurology', 'dr.chen'),
('Dr. Robert Smith', 'Orthopedic surgeon with expertise in joint replacement and sports injuries', '9876543212', 'robert.smith@pulsepoint.com', 'Orthopedics', 'dr.smith'),
('Dr. Emily Brown', 'Expert ophthalmologist specializing in cataract surgery and retinal diseases', '9876543213', 'emily.brown@pulsepoint.com', 'Ophthalmology', 'dr.brown'),
('Dr. Lisa Wong', 'Pediatric specialist with focus on newborn care and childhood development', '9876543214', 'lisa.wong@pulsepoint.com', 'Pediatrics', 'dr.wong');

select * from Patients;

INSERT INTO Doctors (FullName, Description, ContactNumber, Email, Department, Username) VALUES
('Dr. Emily Carter', 'Cardiologist with expertise in electrophysiology and arrhythmia management', '9876543216', 'emily.carter@pulsepoint.com', 'Cardiology', 'dr.carter'),
('Dr. Sophia Turner', 'Neurologist with focus on stroke management and neurodegenerative disorders', '9876543217', 'sophia.turner@pulsepoint.com', 'Neurology', 'dr.turner');

SELECT AppointmentID, AppointmentDate FROM Appointment;

SELECT 
    a.AppointmentID, 
    d.FullName AS DoctorName, 
    p.FullName AS PatientName, 
    DATE_FORMAT(a.AppointmentDate, '%Y-%m-%d') AS AppointmentDate, 
    a.AppointmentTime, 
    a.Description 
FROM Appointment a
JOIN Doctors d ON a.DoctorID = d.DoctorID
JOIN Patients p ON a.PatientID = p.PatientID
WHERE DATE(a.AppointmentDate) < CURDATE()
ORDER BY a.AppointmentDate DESC, a.AppointmentTime DESC;


CREATE TABLE Hospital (
    HospitalID INT AUTO_INCREMENT PRIMARY KEY,
    Address TEXT NOT NULL,
    City VARCHAR(100) NOT NULL,
    State VARCHAR(100) NOT NULL,
    Country VARCHAR(100) NOT NULL,
    ContactNumber VARCHAR(20),
    Email VARCHAR(255),
    EmployeeCount INT NOT NULL DEFAULT 0,  -- Total number of employees in this hospital
    TotalBedCount INT NOT NULL DEFAULT 0     -- Total number of beds in this hospital
);


CREATE TABLE HospitalAdmin (
    EmployeeID INT PRIMARY KEY,
    OfficeLocation VARCHAR(100),
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
);

CREATE TABLE HospitalStaff (
    EmployeeID INT PRIMARY KEY,
    Department VARCHAR(100),
    Designation VARCHAR(100),
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
);

CREATE TABLE DoctorEmployee (
    EmployeeID INT PRIMARY KEY,
    DoctorID INT UNIQUE,
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

CREATE TABLE Employees (
    EmployeeID INT AUTO_INCREMENT PRIMARY KEY,
    HospitalID INT NOT NULL,
    Password VARCHAR(255) NOT NULL,
    FullName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    Role ENUM('admin', 'staff', 'doctor') NOT NULL,
    FOREIGN KEY (HospitalID) REFERENCES Hospital(HospitalID)
);

CREATE TABLE BedTypes (
    BedType VARCHAR(50) PRIMARY KEY,
    Description TEXT
);

CREATE TABLE BedInventory (
    BedID INT AUTO_INCREMENT PRIMARY KEY,
    HospitalID INT NOT NULL,
    BedType VARCHAR(50) NOT NULL,
    FOREIGN KEY (HospitalID) REFERENCES Hospital(HospitalID),
    FOREIGN KEY (BedType) REFERENCES BedTypes(BedType)
);

CREATE TABLE BedsCount (
    HospitalID INT NOT NULL,
    BedType VARCHAR(50) NOT NULL,
    TotalBeds INT NOT NULL,
    OccupiedBeds INT NOT NULL,
    VacantBeds INT NOT NULL,
    PRIMARY KEY (HospitalID, BedType),
    FOREIGN KEY (HospitalID) REFERENCES Hospital(HospitalID),
    FOREIGN KEY (BedType) REFERENCES BedTypes(BedType)
);

CREATE TABLE BedAssignments (
    AssignmentID INT AUTO_INCREMENT PRIMARY KEY,
    BedID INT NOT NULL,
    PatientID INT NOT NULL,
    AdmissionDate DATE NOT NULL,
    DischargeDate DATE,  -- NULL means the bed is still occupied
    FOREIGN KEY (BedID) REFERENCES BedInventory(BedID),
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID)
);

SELECT 
    h.HospitalID, 
    h.Address, 
    bi.BedID, 
    bi.BedType
FROM Hospital h
JOIN BedInventory bi 
    ON h.HospitalID = bi.HospitalID;

SELECT 
    bi.BedID, 
    bi.HospitalID, 
    bi.BedType, 
    bt.Description AS BedTypeDescription
FROM BedInventory bi
JOIN BedTypes bt 
    ON bi.BedType = bt.BedType;


SELECT 
    ba.AssignmentID, 
    ba.BedID, 
    bi.HospitalID, 
    ba.PatientID, 
    ba.AdmissionDate, 
    ba.DischargeDate
FROM BedAssignments ba
JOIN BedInventory bi 
    ON ba.BedID = bi.BedID;


SELECT 
    bc.HospitalID, 
    h.Address, 
    bc.BedType, 
    bt.Description AS BedTypeDescription, 
    bc.TotalBeds, 
    bc.OccupiedBeds, 
    bc.VacantBeds
FROM BedsCount bc
JOIN Hospital h 
    ON bc.HospitalID = h.HospitalID
JOIN BedTypes bt 
    ON bc.BedType = bt.BedType;


SELECT 
    h.HospitalID, 
    h.Address, 
    bi.BedID, 
    bi.BedType, 
    ba.AssignmentID, 
    ba.PatientID, 
    ba.AdmissionDate, 
    ba.DischargeDate,
    CASE 
        WHEN ba.DischargeDate IS NULL THEN 'occupied' 
        ELSE 'available'
    END AS BedStatus
FROM Hospital h
JOIN BedInventory bi 
    ON h.HospitalID = bi.HospitalID
LEFT JOIN BedAssignments ba 
    ON bi.BedID = ba.BedID 
       AND ba.DischargeDate IS NULL;
