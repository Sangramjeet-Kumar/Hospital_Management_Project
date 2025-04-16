document.addEventListener('DOMContentLoaded', function() {
    // Tab Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            if (tabId) {
                navLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(t => t.classList.remove('active'));
                link.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            }
        });
    });

    // Get staff ID from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const staffId = userData.employeeId || null;
    const staffName = userData.fullName || 'Staff User';
    
    // If no staff ID in localStorage, this means not logged in
    if (!staffId) {
        // For demo purposes, we'll continue without redirecting
        console.log('No login detected, but continuing for demo purposes');
    }

    // Set staff name in the sidebar
    document.getElementById('staffName').textContent = staffName || 'Sarah Johnson';
    document.getElementById('staffRole').textContent = 'Staff';
    document.getElementById('profileName').textContent = staffName || 'Sarah Johnson';
    document.getElementById('profileRole').textContent = 'Reception Staff';
    
    // Initialize dashboard with sample data
    loadSampleData();
    
    // Event listeners for tab changes
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'patient-management') {
                renderSamplePatients();
            } else if (tabId === 'bed-status') {
                renderSampleBedStats();
                renderSampleBeds();
            } else if (tabId === 'appointments') {
                renderSampleAppointments();
            } else if (tabId === 'profile') {
                fillSampleProfileData();
            }
        });
    });

    // Event listeners for filter controls
    document.getElementById('wardFilter')?.addEventListener('change', function() {
        renderSampleBeds(this.value, document.getElementById('statusFilter').value);
    });

    document.getElementById('statusFilter')?.addEventListener('change', function() {
        renderSampleBeds(document.getElementById('wardFilter').value, this.value);
    });

    document.getElementById('doctorFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });

    document.getElementById('departmentFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });

    document.getElementById('dateFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });
    
    document.getElementById('appointmentStatusFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });
    
    document.getElementById('patientStatusFilter')?.addEventListener('change', function() {
        renderSamplePatients();
    });

    // Form submission handlers
    document.getElementById('patientRegistrationForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Patient registration form submitted (demo only)');
        document.getElementById('patientRegistrationModal').style.display = 'none';
        this.reset();
    });
    
    document.getElementById('emergencyPatientForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Emergency patient form submitted (demo only)');
        document.getElementById('emergencyPatientModal').style.display = 'none';
        this.reset();
    });

    document.getElementById('dischargeForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Discharge form submitted (demo only)');
        document.getElementById('dischargeModal').style.display = 'none';
        this.reset();
    });

    document.getElementById('transferForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Transfer form submitted (demo only)');
        document.getElementById('transferModal').style.display = 'none';
        this.reset();
    });
    
    document.getElementById('bedAllocationForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Bed allocation form submitted (demo only)');
        document.getElementById('bedAllocationModal').style.display = 'none';
        this.reset();
    });
    
    document.getElementById('emergencyAllotmentForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Emergency bed allotment form submitted (demo only)');
        document.getElementById('emergencyAllotmentModal').style.display = 'none';
        this.reset();
    });
    
    document.getElementById('newAppointmentForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('New appointment form submitted (demo only)');
        document.getElementById('newAppointmentModal').style.display = 'none';
        this.reset();
    });

    document.getElementById('profileForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Profile form submitted (demo only)');
    });
    
    document.getElementById('changePasswordForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Password change form submitted (demo only)');
        this.reset();
    });

    // Modal close handlers
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Modal open handlers
    window.showPatientRegistrationModal = function() {
        document.getElementById('patientRegistrationModal').style.display = 'block';
    };
    
    window.showCheckInModal = function() {
        document.getElementById('checkInModal').style.display = 'block';
        renderSampleCheckInAppointments();
    };
    
    window.showEmergencyPatientModal = function() {
        document.getElementById('emergencyPatientModal').style.display = 'block';
        populateSampleDoctorSelect('emergencyDoctorSelect');
    };
    
    window.showBedAllocationModal = function() {
        document.getElementById('bedAllocationModal').style.display = 'block';
        populateSamplePatientSelect('bedAllocationPatientSelect');
        populateSampleDoctorSelect('bedAllocationDoctorSelect');
        populateSampleBedSelect('bedAllocationBedSelect');
    };
    
    window.showEmergencyAllotmentModal = function() {
        document.getElementById('emergencyAllotmentModal').style.display = 'block';
        populateSamplePatientSelect('emergencyAllotmentPatientSelect');
        populateSampleDoctorSelect('emergencyAllotmentDoctorSelect');
    };
    
    window.showDischargeModal = function() {
        document.getElementById('dischargeModal').style.display = 'block';
        populateSamplePatientSelect('dischargePatientSelect');
        document.getElementById('dischargeBedNumber').value = 'ICU-103';
    };
    
    window.showTransferModal = function() {
        document.getElementById('transferModal').style.display = 'block';
        populateSamplePatientSelect('transferPatientSelect');
        document.getElementById('currentBedNumber').value = 'GEN-205';
        populateSampleBedSelect('transferBedSelect');
    };
    
    window.showNewAppointmentModal = function() {
        document.getElementById('newAppointmentModal').style.display = 'block';
        populateSamplePatientSelect('appointmentPatientSelect');
        populateSampleDoctorSelect('appointmentDoctorSelect');
    };
    
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(dateInput => {
        if (!dateInput.value) {
            dateInput.value = today;
        }
    });

    // Handle logout
    window.handleLogout = function() {
        // Clear localStorage
        localStorage.removeItem('userData');
        // Redirect to login page
        window.location.href = 'simple_login.html';
    };

    // Initialize search functionality for patients
    document.getElementById('patientSearch')?.addEventListener('input', function() {
        renderSamplePatients(this.value);
    });
    
    // Initialize search functionality for appointments
    document.getElementById('appointmentSearchInput')?.addEventListener('input', function() {
        renderSampleCheckInAppointments(this.value);
    });
    
    // Sample data functions
    function loadSampleData() {
        renderSamplePatients();
        renderSampleBedStats();
        renderSampleBeds();
        renderSampleAppointments();
        fillSampleProfileData();
    }
    
    // Sample patient data
    const samplePatients = [
        {
            patient_id: 1001,
            full_name: "Rajesh Kumar",
            gender: "Male",
            contact_number: "9876543210",
            email: "rajesh.kumar@example.com",
            address: "123 Main Street",
            city: "Mumbai",
            state: "Maharashtra",
            status: "active"
        },
        {
            patient_id: 1002,
            full_name: "Priya Sharma",
            gender: "Female",
            contact_number: "8765432109",
            email: "priya.sharma@example.com",
            address: "456 Park Avenue",
            city: "Delhi",
            state: "Delhi",
            status: "admitted"
        },
        {
            patient_id: 1003,
            full_name: "Amit Patel",
            gender: "Male",
            contact_number: "7654321098",
            email: "amit.patel@example.com",
            address: "789 Garden Road",
            city: "Ahmedabad",
            state: "Gujarat",
            status: "discharged"
        },
        {
            patient_id: 1004,
            full_name: "Sunita Verma",
            gender: "Female",
            contact_number: "6543210987",
            email: "sunita.verma@example.com",
            address: "321 Lake View",
            city: "Bangalore",
            state: "Karnataka",
            status: "active"
        },
        {
            patient_id: 1005,
            full_name: "Vikram Singh",
            gender: "Male",
            contact_number: "5432109876",
            email: "vikram.singh@example.com",
            address: "654 Hill Top",
            city: "Jaipur",
            state: "Rajasthan",
            status: "admitted"
        },
        {
            patient_id: 1006,
            full_name: "Meera Reddy",
            gender: "Female",
            contact_number: "4321098765",
            email: "meera.reddy@example.com",
            address: "987 River Side",
            city: "Chennai",
            state: "Tamil Nadu",
            status: "active"
        }
    ];
    
    function renderSamplePatients(searchTerm = '', statusFilter = 'all') {
        const patientsList = document.getElementById('patientsList');
        patientsList.innerHTML = '';

        // Filter patients by search term if provided
        let filteredPatients = samplePatients;
        
        if (searchTerm) {
            filteredPatients = samplePatients.filter(patient => 
                patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.contact_number.includes(searchTerm) ||
                patient.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Filter by status if not 'all'
        if (statusFilter !== 'all') {
            filteredPatients = filteredPatients.filter(patient => patient.status === statusFilter);
        }
        
        if (filteredPatients.length === 0) {
            patientsList.innerHTML = '<div class="no-data">No patients found matching your criteria.</div>';
            return;
        }
        
        filteredPatients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            patientCard.setAttribute('data-patient-id', patient.patient_id);
            
            // Determine status badge class
            let statusBadge = '';
            if (patient.status) {
                const statusClass = patient.status.toLowerCase();
                statusBadge = `<span class="status-badge ${statusClass}">${patient.status}</span>`;
            }
            
            patientCard.innerHTML = `
                <h3>${patient.full_name} ${statusBadge}</h3>
                <div class="patient-info">
                    <p><i class="fas fa-phone"></i> ${patient.contact_number || 'N/A'}</p>
                    <p><i class="fas fa-envelope"></i> ${patient.email || 'N/A'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${patient.address ? `${patient.address}, ${patient.city}, ${patient.state}` : 'N/A'}</p>
                    <p><i class="fas fa-id-card"></i> ID: ${patient.patient_id}</p>
                </div>
                <div class="patient-actions">
                    <button class="btn-action view-btn" onclick="viewPatientDetails(${patient.patient_id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action edit-btn" onclick="editPatient(${patient.patient_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action schedule-btn" onclick="scheduleAppointment(${patient.patient_id})">
                        <i class="fas fa-calendar-plus"></i> Schedule
                    </button>
                </div>
            `;
            
            patientsList.appendChild(patientCard);
        });
    }
    
    // View and edit functions
    window.viewPatientDetails = function(patientId) {
        alert(`View patient details for ID: ${patientId} (demo only)`);
    };

    window.editPatient = function(patientId) {
        alert(`Edit patient with ID: ${patientId} (demo only)`);
    };

    window.scheduleAppointment = function(patientId) {
        document.getElementById('newAppointmentModal').style.display = 'block';
        
        // Set the patient ID in the select
        const patientSelect = document.getElementById('appointmentPatientSelect');
        
        // Find the patient in sample patients
        const patient = samplePatients.find(p => p.patient_id === patientId);
        if (patient) {
            patientSelect.innerHTML = `<option value="${patient.patient_id}" selected>${patient.full_name}</option>`;
        } else {
            populateSamplePatientSelect('appointmentPatientSelect');
        }
        
        populateSampleDoctorSelect('appointmentDoctorSelect');
    };
    
    function populateSamplePatientSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Patient</option>';
        
        samplePatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.patient_id;
            option.textContent = patient.full_name;
            select.appendChild(option);
        });
    }
    
    function populateSampleDoctorSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Doctor</option>';
        
        const sampleDoctors = [
            { doctor_id: 101, full_name: "Dr. Sarah Johnson", department: "Cardiology" },
            { doctor_id: 102, full_name: "Dr. Michael Chen", department: "Neurology" },
            { doctor_id: 103, full_name: "Dr. Robert Smith", department: "Orthopedics" },
            { doctor_id: 104, full_name: "Dr. Emily Brown", department: "Ophthalmology" },
            { doctor_id: 105, full_name: "Dr. Lisa Wong", department: "Pediatrics" }
        ];
        
        sampleDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.doctor_id;
            option.textContent = `${doctor.full_name} (${doctor.department})`;
            select.appendChild(option);
        });
    }
    
    function populateSampleBedSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Bed</option>';
        
        const sampleBeds = [
            { bed_id: 201, bed_number: "GEN-101", ward: "General" },
            { bed_id: 202, bed_number: "GEN-102", ward: "General" },
            { bed_id: 203, bed_number: "ICU-101", ward: "ICU" },
            { bed_id: 204, bed_number: "ICU-102", ward: "ICU" },
            { bed_id: 205, bed_number: "EMG-101", ward: "Emergency" },
            { bed_id: 206, bed_number: "PED-101", ward: "Pediatric" }
        ];
        
        sampleBeds.forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.bed_id;
            option.textContent = `${bed.bed_number} (${bed.ward})`;
            select.appendChild(option);
        });
    }
    
    function fillSampleProfileData() {
        // Fill profile form with sample data
        document.getElementById('fullName').value = 'Sarah Johnson';
        document.getElementById('employeeId').value = '5001';
        document.getElementById('email').value = 'sarah.johnson@pulsepoint.com';
        document.getElementById('phone').value = '9876543210';
        document.getElementById('department').value = 'Reception';
        document.getElementById('role').value = 'Staff';
    }

    function renderSampleCheckInAppointments(searchTerm = '') {
        const checkInList = document.getElementById('checkInAppointmentsList');
        checkInList.innerHTML = '';
        
        // Sample today's appointments
        const sampleTodayAppointments = [
            {
                appointment_id: 5001,
                patient: { full_name: "Rajesh Kumar", patient_id: 1001 },
                doctor: { full_name: "Sarah Johnson", doctor_id: 101 },
                appointment_time: "09:30 AM",
                status: "scheduled"
            },
            {
                appointment_id: 5002,
                patient: { full_name: "Priya Sharma", patient_id: 1002 },
                doctor: { full_name: "Michael Chen", doctor_id: 102 },
                appointment_time: "10:15 AM",
                status: "scheduled"
            },
            {
                appointment_id: 5003,
                patient: { full_name: "Amit Patel", patient_id: 1003 },
                doctor: { full_name: "Robert Smith", doctor_id: 103 },
                appointment_time: "11:00 AM",
                status: "scheduled"
            },
            {
                appointment_id: 5004,
                patient: { full_name: "Sunita Verma", patient_id: 1004 },
                doctor: { full_name: "Emily Brown", doctor_id: 104 },
                appointment_time: "02:30 PM",
                status: "scheduled"
            }
        ];
        
        // Filter appointments by search term if provided
        let filteredAppointments = sampleTodayAppointments;
        if (searchTerm) {
            filteredAppointments = sampleTodayAppointments.filter(appointment => 
                appointment.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.appointment_id.toString().includes(searchTerm)
            );
        }
        
        if (filteredAppointments.length === 0) {
            checkInList.innerHTML = '<div class="no-data">No appointments found for today.</div>';
            return;
        }
        
        filteredAppointments.forEach(appointment => {
            const appointmentItem = document.createElement('div');
            appointmentItem.className = 'appointment-item';
            
            appointmentItem.innerHTML = `
                <div class="appointment-details">
                    <h4>${appointment.patient.full_name}</h4>
                    <p><i class="fas fa-user-md"></i> Dr. ${appointment.doctor.full_name}</p>
                    <p><i class="fas fa-clock"></i> ${appointment.appointment_time}</p>
                    <p><i class="fas fa-tag"></i> #${appointment.appointment_id}</p>
                </div>
                <div class="appointment-actions">
                    <button class="btn-action schedule-btn" onclick="checkInAppointment(${appointment.appointment_id})">
                        <i class="fas fa-clipboard-check"></i> Check In
                    </button>
                </div>
            `;
            
            checkInList.appendChild(appointmentItem);
        });
    }
    
    function renderSampleAppointments() {
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        appointmentsGrid.innerHTML = '';
        
        // Sample appointments data
        const sampleAppointments = [
            {
                appointment_id: 5001,
                patient: { full_name: "Rajesh Kumar", patient_id: 1001 },
                doctor: { full_name: "Sarah Johnson", doctor_id: 101, department: "Cardiology" },
                appointment_date: "2025-04-15",
                appointment_time: "09:30 AM",
                description: "Regular checkup",
                status: "scheduled",
                contact: "9876543210"
            },
            {
                appointment_id: 5002,
                patient: { full_name: "Priya Sharma", patient_id: 1002 },
                doctor: { full_name: "Michael Chen", doctor_id: 102, department: "Neurology" },
                appointment_date: "2025-04-15",
                appointment_time: "10:15 AM",
                description: "Follow-up consultation",
                status: "waiting",
                contact: "8765432109"
            },
            {
                appointment_id: 5003,
                patient: { full_name: "Amit Patel", patient_id: 1003 },
                doctor: { full_name: "Robert Smith", doctor_id: 103, department: "Orthopedics" },
                appointment_date: "2025-04-15",
                appointment_time: "11:00 AM",
                description: "Post-surgery review",
                status: "completed",
                contact: "7654321098"
            },
            {
                appointment_id: 5004,
                patient: { full_name: "Sunita Verma", patient_id: 1004 },
                doctor: { full_name: "Emily Brown", doctor_id: 104, department: "Ophthalmology" },
                appointment_date: "2025-04-15",
                appointment_time: "02:30 PM",
                description: "Eye examination",
                status: "scheduled",
                contact: "6543210987"
            },
            {
                appointment_id: 5005,
                patient: { full_name: "Vikram Singh", patient_id: 1005 },
                doctor: { full_name: "Lisa Wong", doctor_id: 105, department: "Pediatrics" },
                appointment_date: "2025-04-16",
                appointment_time: "09:00 AM",
                description: "Vaccination",
                status: "scheduled",
                contact: "5432109876"
            },
            {
                appointment_id: 5006,
                patient: { full_name: "Meera Reddy", patient_id: 1006 },
                doctor: { full_name: "Sarah Johnson", doctor_id: 101, department: "Cardiology" },
                appointment_date: "2025-04-16",
                appointment_time: "11:30 AM",
                description: "ECG test",
                status: "scheduled",
                contact: "4321098765"
            }
        ];
        
        // Get filter values
        const doctorFilter = document.getElementById('doctorFilter')?.value || 'all';
        const departmentFilter = document.getElementById('departmentFilter')?.value || 'all';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        const statusFilter = document.getElementById('appointmentStatusFilter')?.value || 'all';
        
        // Apply filters
        let filteredAppointments = sampleAppointments;
        
        if (doctorFilter !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.doctor.doctor_id.toString() === doctorFilter
            );
        }
        
        if (departmentFilter !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.doctor.department.toLowerCase() === departmentFilter.toLowerCase()
            );
        }
        
        if (dateFilter) {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.appointment_date === dateFilter
            );
        }
        
        if (statusFilter !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.status.toLowerCase() === statusFilter.toLowerCase()
            );
        }
        
        if (filteredAppointments.length === 0) {
            appointmentsGrid.innerHTML = '<div class="no-data">No appointments match the selected filters.</div>';
            return;
        }
        
        filteredAppointments.forEach(apt => {
            const appointmentCard = document.createElement('div');
            appointmentCard.className = `appointment-card ${apt.status}`;
            
            // Format date for display
            const dateObj = new Date(apt.appointment_date);
            const dateDisplay = dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            appointmentCard.innerHTML = `
                <div class="appointment-header">
                    <div class="appointment-time">${apt.appointment_time}</div>
                    <div class="appointment-date">${dateDisplay}</div>
                    <div class="appointment-status ${apt.status}">${apt.status}</div>
                </div>
                <div class="appointment-body">
                    <div class="appointment-patient">
                        <i class="fas fa-user-injured"></i> ${apt.patient.full_name}
                    </div>
                    <div class="appointment-doctor">
                        <i class="fas fa-user-md"></i> ${apt.doctor.full_name}
                    </div>
                    <div class="appointment-department">
                        <i class="fas fa-hospital"></i> ${apt.doctor.department}
                    </div>
                    <div class="appointment-contact">
                        <i class="fas fa-phone"></i> ${apt.contact}
                    </div>
                    ${apt.description ? `<div class="appointment-notes">
                        <i class="fas fa-sticky-note"></i> ${apt.description}
                    </div>` : ''}
                </div>
                <div class="appointment-actions">
                    <button class="btn-action view-btn" onclick="viewAppointmentDetails(${apt.appointment_id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action edit-btn" onclick="updateAppointmentStatus(${apt.appointment_id})">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                </div>
            `;
            
            appointmentsGrid.appendChild(appointmentCard);
        });
    }
    
    function renderSampleBedStats() {
        // Update the stats cards with sample data
        document.getElementById('totalBeds').textContent = 50;
        document.getElementById('availableBeds').textContent = 18;
        document.getElementById('occupiedBeds').textContent = 28;
        document.getElementById('maintenanceBeds').textContent = 4;
    }
    
    function renderSampleBeds(wardFilter = 'all', statusFilter = 'all') {
        const bedGrid = document.getElementById('bedGrid');
        bedGrid.innerHTML = '';
        
        // Sample beds data
        const sampleBeds = [
            {
                bed_id: 101,
                bed_number: "GEN-101",
                ward: "General",
                status: "available",
                type: "General"
            },
            {
                bed_id: 102,
                bed_number: "GEN-102",
                ward: "General",
                status: "occupied",
                type: "General",
                patient_name: "Priya Sharma",
                patient_id: 1002,
                admission_date: "2025-04-10"
            },
            {
                bed_id: 103,
                bed_number: "GEN-103",
                ward: "General",
                status: "maintenance",
                type: "General"
            },
            {
                bed_id: 104,
                bed_number: "ICU-101",
                ward: "ICU",
                status: "occupied",
                type: "ICU",
                patient_name: "Vikram Singh",
                patient_id: 1005,
                admission_date: "2025-04-12"
            },
            {
                bed_id: 105,
                bed_number: "ICU-102",
                ward: "ICU",
                status: "available",
                type: "ICU"
            },
            {
                bed_id: 106,
                bed_number: "ICU-103",
                ward: "ICU",
                status: "occupied",
                type: "ICU",
                patient_name: "Rajiv Malhotra",
                patient_id: 1007,
                admission_date: "2025-04-14"
            },
            {
                bed_id: 107,
                bed_number: "EMG-101",
                ward: "Emergency",
                status: "available",
                type: "Emergency"
            },
            {
                bed_id: 108,
                bed_number: "EMG-102",
                ward: "Emergency",
                status: "occupied",
                type: "Emergency",
                patient_name: "Ananya Gupta",
                patient_id: 1008,
                admission_date: "2025-04-15"
            },
            {
                bed_id: 109,
                bed_number: "PED-101",
                ward: "Pediatric",
                status: "available",
                type: "Pediatric"
            },
            {
                bed_id: 110,
                bed_number: "PED-102",
                ward: "Pediatric",
                status: "maintenance",
                type: "Pediatric"
            }
        ];
        
        // Apply filters
        let filteredBeds = sampleBeds;
        
        if (wardFilter && wardFilter !== 'all') {
            filteredBeds = filteredBeds.filter(bed => 
                bed.ward.toLowerCase() === wardFilter.toLowerCase()
            );
        }
        
        if (statusFilter && statusFilter !== 'all') {
            filteredBeds = filteredBeds.filter(bed => 
                bed.status.toLowerCase() === statusFilter.toLowerCase()
            );
        }
        
        if (filteredBeds.length === 0) {
            bedGrid.innerHTML = '<div class="no-data">No beds match the selected filters.</div>';
            return;
        }
        
        filteredBeds.forEach(bed => {
            const bedCard = document.createElement('div');
            bedCard.className = `bed-card ${bed.status}`;
            
            // Icon for bed type
            let typeIcon = '';
            switch (bed.type.toLowerCase()) {
                case 'general': typeIcon = '<i class="fas fa-bed"></i>'; break;
                case 'icu': typeIcon = '<i class="fas fa-procedures"></i>'; break;
                case 'emergency': typeIcon = '<i class="fas fa-ambulance"></i>'; break;
                case 'pediatric': typeIcon = '<i class="fas fa-child"></i>'; break;
                default: typeIcon = '<i class="fas fa-bed"></i>';
            }
            
            bedCard.innerHTML = `
                <div class="bed-type">${typeIcon} ${bed.type}</div>
                <div class="bed-id">Bed #${bed.bed_number}</div>
                <div class="bed-status ${bed.status}">${bed.status}</div>
                ${bed.patient_name ? `
                    <div class="bed-patient">
                        <span class="patient-name">${bed.patient_name}</span>
                        <span class="patient-id">ID: ${bed.patient_id}</span>
                        ${bed.admission_date ? `<span class="admission-date">Since: ${bed.admission_date}</span>` : ''}
                    </div>` : ''}
                <div class="bed-actions">
                    ${bed.status === 'occupied' ? `
                        <button class="btn-action discharge-btn" onclick="showDischargeModal()">
                            <i class="fas fa-sign-out-alt"></i> Discharge
                        </button>
                        <button class="btn-action transfer-btn" onclick="showTransferModal()">
                            <i class="fas fa-exchange-alt"></i> Transfer
                        </button>
                    ` : bed.status === 'available' ? `
                        <button class="btn-action allocate-btn" onclick="showBedAllocationModal()">
                            <i class="fas fa-user-plus"></i> Allocate
                        </button>
                    ` : `
                        <button class="btn-action maintenance-btn" onclick="updateBedStatus(${bed.bed_id}, 'available')">
                            <i class="fas fa-tools"></i> Mark Available
                        </button>
                    `}
                </div>
            `;
            
            bedGrid.appendChild(bedCard);
        });
    }
    
    window.viewAppointmentDetails = function(appointmentId) {
        alert(`View appointment details for ID: ${appointmentId} (demo only)`);
    };

    window.updateAppointmentStatus = function(appointmentId) {
        const newStatus = prompt('Enter new status (scheduled, waiting, completed, cancelled):');
        if (newStatus) {
            alert(`Appointment status updated to ${newStatus} (demo only)`);
            renderSampleAppointments();
        }
    };
    
    window.checkInAppointment = function(appointmentId) {
        alert(`Patient checked in for appointment #${appointmentId} (demo only)`);
        renderSampleCheckInAppointments();
    };
    
    window.updateBedStatus = function(bedId, newStatus) {
        alert(`Bed #${bedId} status updated to ${newStatus} (demo only)`);
        renderSampleBeds();
    };
});