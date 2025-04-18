// Add these variables at the top of the file if they don't exist
// Variables to track which entity we're currently viewing
let currentAppointmentId = null;
let currentPatientId = null;

// Sample appointments data for testing/demo purposes
const sampleAppointments = [
    {
        appointmentID: 5001,
        patientName: "Rajesh Kumar",
        patientID: 1001,
        doctorName: "Sarah Johnson",
        doctorID: 101,
        department: "Cardiology",
        appointmentDate: "2025-04-15",
        appointmentTime: "09:30 AM",
        description: "Regular checkup",
        status: "scheduled",
        contactNumber: "9876543210"
    },
    {
        appointmentID: 5002,
        patientName: "Priya Sharma",
        patientID: 1002,
        doctorName: "Michael Chen",
        doctorID: 102,
        department: "Neurology",
        appointmentDate: "2025-04-15",
        appointmentTime: "10:15 AM",
        description: "Follow-up consultation",
        status: "waiting",
        contactNumber: "8765432109"
    },
    {
        appointmentID: 5003,
        patientName: "Amit Patel",
        patientID: 1003,
        doctorName: "Robert Smith",
        doctorID: 103,
        department: "Orthopedics",
        appointmentDate: "2025-04-15",
        appointmentTime: "11:00 AM",
        description: "Post-surgery review",
        status: "completed",
        contactNumber: "7654321098"
    },
    {
        appointmentID: 5004,
        patientName: "Sunita Verma",
        patientID: 1004,
        doctorName: "Emily Brown",
        doctorID: 104,
        department: "Ophthalmology",
        appointmentDate: "2025-04-15",
        appointmentTime: "02:30 PM",
        description: "Eye examination",
        status: "scheduled",
        contactNumber: "6543210987"
    }
];

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
                
                // Load specific content for tabs
                if (tabId === 'profile') {
                    fetchStaffProfile();
                } else if (tabId === 'patient-management') {
                    loadPatients();
                }
            }
        });
    });

    // Get staff ID from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const staffId = userData.employeeId || null;
    const staffName = userData.fullName || 'Staff User';
    
    // If no staff ID in localStorage, this means not logged in
    if (!staffId) {
        // For demo or development purposes, we'll continue without redirecting
        console.log('No login detected. Consider redirecting to login page in production.');
        // Uncomment for production
        // window.location.href = 'simple_login.html';
    }

    // Set staff name in the sidebar
    document.getElementById('staffName').textContent = staffName;
    
    // Load the staff profile data
    fetchStaffProfile();
    
    // Initialize dashboard with data
    loadSampleData();
    
    // Load patients data
    loadPatients();
    
    // Event listeners for tab changes
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'patient-management') {
                renderSamplePatients();
            } else if (tabId === 'bed-status') {
                loadBeds();
            } else if (tabId === 'appointments') {
                renderSampleAppointments();
            } else if (tabId === 'profile') {
                fetchStaffProfile();
            }
        });
    });

    // Event listeners for filter controls
    document.getElementById('wardFilter')?.addEventListener('change', function() {
        const statusFilter = document.getElementById('statusFilter').value;
        loadBeds(this.value, statusFilter);
    });

    document.getElementById('statusFilter')?.addEventListener('change', function() {
        const wardFilter = document.getElementById('wardFilter').value;
        loadBeds(wardFilter, this.value);
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
        const formData = new FormData(this);
        registerPatient(formData);
    });
    
    document.getElementById('emergencyPatientForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        registerEmergencyPatient(formData);
    });

    document.getElementById('dischargeForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Discharge form submitted (demo only)');
        document.getElementById('dischargeModal').style.display = 'none';
        this.reset();
    });

    document.getElementById('transferForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        formData.delete('reason'); // Remove reason if present
        formData.append('fromBedId', document.getElementById('currentBedNumber').value);
        // Get staffId from localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const staffId = userData.employeeId || null;
        const transferData = {
            employeeId: staffId, // REQUIRED by backend
            patientId: parseInt(formData.get('patientId')),
            fromBedId: parseInt(formData.get('fromBedId')),
            newBedId: parseInt(formData.get('toBedId')) // Backend expects 'newBedId'
        };
        // Validate
        if (!transferData.employeeId || !transferData.patientId || !transferData.fromBedId || !transferData.newBedId) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }
        try {
            showMessage('Transferring patient...', 'info');
            // Use DOCTOR endpoint for transfer (since /api/staff/transfer-bed does not exist)
            const response = await fetch('http://localhost:8080/api/doctor/transfer-bed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transferData)
            });
            if (!response.ok) {
                const err = await response.json();
                showMessage(err.message || 'Transfer failed', 'error');
                return;
            }
            showMessage('Patient transferred successfully', 'success');
            document.getElementById('transferModal').style.display = 'none';
            // Refresh bed management section (reload data)
            if (typeof loadBedManagementSection === 'function') {
                loadBedManagementSection();
            } else {
                // fallback: reload page
                location.reload();
            }
        } catch (error) {
            showMessage('Error transferring patient', 'error');
        }
    });
    
    document.getElementById('bedAllocationForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        allocateBed(new FormData(this));
    });
    
    document.getElementById('emergencyAllotmentForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        allocateEmergencyBed(new FormData(this));
    });
    
    document.getElementById('newAppointmentForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        createNewAppointment(e);
    });

    document.getElementById('profileForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        updateProfile();
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
    
    // Modified function to use the bed assignment modal instead of the old allocation modal
    window.showBedAllocationModal = function(patientId, patientName) {
        // Simply call the openBedAssignmentModal function with the patient info
        openBedAssignmentModal(patientId, patientName);
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
    
    window.showTransferModal = async function() {
        document.getElementById('transferModal').style.display = 'block';
        await populateTransferPatientSelect();
        // Clear bed/ward fields
        document.getElementById('currentBedNumber').value = '';
        document.getElementById('transferWardSelect').value = '';
        document.getElementById('transferBedSelect').innerHTML = '<option value="">Select Bed</option>';
        // Hide reason textbox if present
        const reasonBox = document.getElementById('transferReason');
        if (reasonBox) reasonBox.parentElement.style.display = 'none';
    };
    
    window.showNewAppointmentModal = function() {
        document.getElementById('newAppointmentModal').style.display = 'block';
        
        // Load patients for select
        populatePatientSelect('appointmentPatientSelect');
        
        // Load doctors for select
        populateDoctorSelect('appointmentDoctorSelect');
        
        // Set default date to today and time to next available slot
        const dateInput = document.getElementById('appointmentDate');
        const timeInput = document.getElementById('appointmentTime');
        
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        if (timeInput) {
            // Default to 9:00 AM
            timeInput.value = '09:00';
        }
    };
    
    // Set today's date as default for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(dateInput => {
        if (!dateInput.value) {
            dateInput.value = today;
        }
    });

    // Handle logout
    document.querySelector('.logout-btn')?.addEventListener('click', function() {
        handleLogout();
    });

    // Initialize search functionality for patients
    const patientSearchInput = document.getElementById('patientSearch');
    const patientStatusFilter = document.getElementById('patientStatusFilter');
    
    if (patientSearchInput) {
        let lastpatients = [];
        
        patientSearchInput.addEventListener('input', function() {
            // Fetch patients once and store them
            if (lastpatients.length === 0) {
                fetch('http://localhost:8080/api/staff/patients')
                    .then(response => response.json())
                    .then(data => {
                        lastpatients = data;
                        renderPatients(data, this.value, patientStatusFilter.value);
                    })
                    .catch(error => {
                        console.error('Error fetching patients:', error);
                        // Fall back to rendering with search term only
                        loadPatients();
                    });
            } else {
                // Use stored patients data for filtering
                renderPatients(lastpatients, this.value, patientStatusFilter.value);
            }
        });
    }
    
    if (patientStatusFilter) {
        patientStatusFilter.addEventListener('change', function() {
            // Similar to search, fetch once and store
            if (typeof lastpatients === 'undefined' || lastpatients.length === 0) {
                fetch('http://localhost:8080/api/staff/patients')
                    .then(response => response.json())
                    .then(data => {
                        lastpatients = data;
                        renderPatients(data, patientSearchInput.value, this.value);
                    })
                    .catch(error => {
                        console.error('Error fetching patients:', error);
                        loadPatients();
                    });
            } else {
                // Use stored patients data for filtering
                renderPatients(lastpatients, patientSearchInput.value, this.value);
            }
        });
    }
    
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
        fetchStaffProfile();
    }
    
    // Load patients from API
    async function loadPatients() {
        try {
            showMessage('Loading patients...', 'info');
            const response = await fetch('http://localhost:8080/api/staff/patients');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch patients: ${response.status} ${response.statusText}`);
            }
            
            const patients = await response.json();
            console.log('Patients data:', patients);
            renderPatients(patients);
            showMessage('Patients loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading patients:', error);
            showMessage('Failed to load patients. Using sample data.', 'error');
            renderSamplePatients(); // Fallback to sample data
        }
    }
    
    // Render patients in the UI
    function renderPatients(patients, searchTerm = '', statusFilter = 'all') {
        const patientsList = document.getElementById('patientsList');
        patientsList.innerHTML = '';

        // Filter patients if needed
        let filteredPatients = patients;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredPatients = patients.filter(patient => 
                patient.name.toLowerCase().includes(term) || 
                patient.email.toLowerCase().includes(term) || 
                patient.contact.includes(term)
            );
        }
        
        if (statusFilter !== 'all') {
            filteredPatients = filteredPatients.filter(patient => patient.status === statusFilter);
        }
        
        if (filteredPatients.length === 0) {
            patientsList.innerHTML = '<div class="no-data">No patients found matching your criteria.</div>';
            return;
        }
        
        // Sort patients: admitted first, then other statuses
        filteredPatients.sort((a, b) => {
            if (a.status === 'admitted' && b.status !== 'admitted') return -1;
            if (a.status !== 'admitted' && b.status === 'admitted') return 1;
            return 0;
        });
        
        // Render each patient card
        filteredPatients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            
            let statusDisplay = '';
            switch(patient.status) {
                case 'admitted':
                    statusDisplay = '<span class="status-badge admitted">Admitted</span>';
                    break;
                case 'checked-in':
                    statusDisplay = '<span class="status-badge checked-in">Checked In</span>';
                    break;
                case 'scheduled':
                    statusDisplay = '<span class="status-badge scheduled">Scheduled</span>';
                    break;
                default:
                    statusDisplay = '<span class="status-badge new">New</span>';
            }
            
            patientCard.innerHTML = `
                ${statusDisplay}
                <h3>${patient.name}</h3>
                <div class="patient-info">
                    <p><i class="fas fa-phone"></i> ${patient.contact}</p>
                    <p><i class="fas fa-envelope"></i> ${patient.email}</p>
                    ${patient.bedID ? `<p><i class="fas fa-bed"></i> Bed #${patient.bedID}</p>` : ''}
                    ${patient.appointmentID ? `<p><i class="fas fa-calendar-check"></i> Appointment #${patient.appointmentID}</p>` : ''}
                </div>
                <div class="patient-actions">
                    <button class="btn-action view-btn" onclick="viewPatientDetails(${patient.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${patient.status !== 'admitted' ? `
                    <button class="btn-action edit-btn" onclick="showBedAllocationModal(${patient.id}, '${patient.name}')">
                        <i class="fas fa-bed"></i> Admit
                    </button>` : ''}
                </div>
            `;
            
            patientsList.appendChild(patientCard);
        });
    }
    
    /**
     * Register a new patient
     * @param {FormData} formData Form data from the patient registration form
     */
    function registerPatient(formData) {
        // Show loading message
        showMessage('Registering new patient...', 'info');
        
        // Convert FormData to object
        const patientData = {};
        formData.forEach((value, key) => {
            patientData[key] = value;
        });
        
        // Set patient status to 'waiting'
        patientData.status = 'waiting';
        
        // Log the patient data (for development purposes)
        console.log('Registering new patient:', patientData);
        
        // Send the data to the server
        fetch('http://localhost:8080/api/staff/patient/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Close the modal
            document.getElementById('patientRegistrationModal').style.display = 'none';
            
            // Reset the form
            document.getElementById('patientRegistrationForm').reset();
            
            // Show success message
            showMessage('Patient registered successfully!', 'success');
            
            // Refresh the patient list
            loadPatients();
        })
        .catch(error => {
            console.error('Error registering patient:', error);
            showMessage('Error registering patient: ' + error.message, 'error');
            
            // For development/demo purposes, simulate success
            console.log('Simulating successful patient registration despite error');
            document.getElementById('patientRegistrationModal').style.display = 'none';
            document.getElementById('patientRegistrationForm').reset();
            showMessage('Patient registered successfully (simulated)!', 'success');
            loadPatients();
        });
    }
    
    /**
     * Register a new emergency patient
     * @param {FormData} formData Form data from the emergency patient registration form
     */
    function registerEmergencyPatient(formData) {
        // Show loading message
        showMessage('Registering emergency patient...', 'info');
        
        // Convert FormData to object
        const patientData = {};
        formData.forEach((value, key) => {
            patientData[key] = value;
        });
        
        // Check if "Allocate Bed Immediately" is checked
        const allocateBedImmediately = formData.get('allocateBed') === 'on';
        
        // Set patient status to 'emergency'
        patientData.status = 'emergency';
        
        // Log the patient data (for development purposes)
        console.log('Registering emergency patient:', patientData);
        
        // Send the data to the server
        fetch('http://localhost:8080/api/staff/patient/emergency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Close the modal
            document.getElementById('emergencyPatientModal').style.display = 'none';
            
            // Reset the form
            document.getElementById('emergencyPatientForm').reset();
            
            // Show success message
            showMessage('Emergency patient registered successfully!', 'success');
            
            // If "Allocate Bed Immediately" was checked, open the bed assignment modal
            if (allocateBedImmediately && data.patient_id) {
                // Use patient ID and name from the response
                const patientId = data.patient_id;
                const patientName = patientData.patientName || 'Emergency Patient';
                
                // Open the bed assignment modal with this patient
                openBedAssignmentModal(patientId, patientName);
            }
            
            // Refresh the patient list
            loadPatients();
        })
        .catch(error => {
            console.error('Error registering emergency patient:', error);
            showMessage('Error registering emergency patient: ' + error.message, 'error');
            
            // For development/demo purposes, simulate success
            console.log('Simulating successful emergency patient registration despite error');
            document.getElementById('emergencyPatientModal').style.display = 'none';
            document.getElementById('emergencyPatientForm').reset();
            showMessage('Emergency patient registered successfully (simulated)!', 'success');
            
            // If "Allocate Bed Immediately" was checked, open the bed assignment modal
            if (allocateBedImmediately) {
                // Use dummy patient ID and name for demonstration
                const patientId = Math.floor(Math.random() * 1000) + 1000; // Generate random ID for demo
                const patientName = patientData.patientName || 'Emergency Patient';
                
                // Open the bed assignment modal with this dummy patient
                openBedAssignmentModal(patientId, patientName);
            }
            
            loadPatients();
        });
    }
    
    // View patient details
    function viewPatientDetails(patientId) {
        // Store the current patient ID
        currentPatientId = patientId;
        currentAppointmentId = null; // Reset appointment ID when viewing patient
        
        // Show the modal
        const modal = document.getElementById('appointmentDetailsModal');
        modal.style.display = 'block';
        
        // Update modal title to reflect patient details
        const modalTitle = modal.querySelector('h2');
        modalTitle.textContent = 'Patient Details';
        
        // Show loading state
        document.getElementById('appointmentDetailsContent').innerHTML = '<div class="loading">Loading patient details...</div>';
        
        // Hide appointment status update section
        const statusUpdateSection = modal.querySelector('.appointment-status-update');
        if (statusUpdateSection) {
            statusUpdateSection.style.display = 'none';
        }
        
        // Fetch patient details from server
        fetch(`http://localhost:8080/api/staff/patients/${patientId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch patient details');
                }
                return response.json();
            })
            .then(patient => {
                // Format and display patient information
                const patientInfo = `
                    <div class="detail-section">
                        <h3>Patient Information</h3>
                        <p><span class="label">Patient Name:</span> <span class="value">${patient.name || 'N/A'}</span></p>
                        <p><span class="label">Patient ID:</span> <span class="value">${patient.id || 'N/A'}</span></p>
                        <p><span class="label">Gender:</span> <span class="value">${patient.gender || 'N/A'}</span></p>
                        <p><span class="label">Contact:</span> <span class="value">${patient.contact || 'N/A'}</span></p>
                        <p><span class="label">Email:</span> <span class="value">${patient.email || 'N/A'}</span></p>
                        <p><span class="label">Address:</span> <span class="value">${patient.address || 'N/A'}</span></p>
                    </div>
                    <div class="detail-section">
                        <h3>Status Information</h3>
                        <p><span class="label">Current Status:</span> <span class="value status-highlight ${patient.status}">${patient.status || 'N/A'}</span></p>
                        ${patient.bedID ? `<p><span class="label">Bed Assigned:</span> <span class="value">${patient.bedID}</span></p>` : ''}
                        ${patient.appointmentID ? `
                            <p><span class="label">Latest Appointment:</span> <span class="value">${patient.appointmentDate ? new Date(patient.appointmentDate).toLocaleDateString() : 'N/A'} at ${patient.appointmentTime || 'N/A'}</span></p>
                            <p><span class="label">Doctor:</span> <span class="value">${patient.doctorName || 'N/A'}</span></p>
                        ` : ''}
                    </div>
                `;
                
                document.getElementById('appointmentDetailsContent').innerHTML = patientInfo;
            })
            .catch(error => {
                console.error('Error fetching patient details:', error);
                
                // For demo purposes, get patient info from the DOM
                let selectedPatient = null;
                const existingPatients = document.querySelectorAll('.patient-card');
                
                // Try to find the patient in the existing DOM elements
                existingPatients.forEach(patientElement => {
                    const viewBtn = patientElement.querySelector('.view-btn');
                    if (viewBtn && viewBtn.getAttribute('onclick').includes(`viewPatientDetails(${patientId})`)) {
                        const patientName = patientElement.querySelector('h3').textContent;
                        const contactElement = patientElement.querySelector('.patient-info p:nth-child(1)');
                        const emailElement = patientElement.querySelector('.patient-info p:nth-child(2)');
                        const statusElement = patientElement.querySelector('.status-badge');
                        const bedElement = patientElement.querySelector('.patient-info p:nth-child(3)');
                        const appointmentElement = patientElement.querySelector('.patient-info p:nth-child(4)');
                        
                        selectedPatient = {
                            id: patientId,
                            name: patientName,
                            contact: contactElement ? contactElement.textContent.replace(/[^\d]/g, '') : 'N/A',
                            email: emailElement ? emailElement.textContent.trim() : 'N/A',
                            status: statusElement ? statusElement.textContent.toLowerCase() : 'new',
                            bedID: bedElement ? bedElement.textContent.replace('Bed #', '') : null,
                            appointmentID: appointmentElement ? appointmentElement.textContent.replace('Appointment #', '') : null
                        };
                    }
                });
                
                const patientInfo = `
                    <div class="detail-section">
                        <h3>Patient Information</h3>
                        <p><span class="label">Patient Name:</span> <span class="value">${selectedPatient.name}</span></p>
                        <p><span class="label">Patient ID:</span> <span class="value">${selectedPatient.id}</span></p>
                        <p><span class="label">Contact:</span> <span class="value">${selectedPatient.contact}</span></p>
                        <p><span class="label">Email:</span> <span class="value">${selectedPatient.email}</span></p>
                    </div>
                    <div class="detail-section">
                        <h3>Status Information</h3>
                        <p><span class="label">Current Status:</span> <span class="value status-highlight ${selectedPatient.status}">${selectedPatient.status}</span></p>
                        ${selectedPatient.bedID ? `<p><span class="label">Bed Assigned:</span> <span class="value">${selectedPatient.bedID}</span></p>` : ''}
                        ${selectedPatient.appointmentID ? `<p><span class="label">Appointment ID:</span> <span class="value">${selectedPatient.appointmentID}</span></p>` : ''}
                    </div>
                `;
                
                document.getElementById('appointmentDetailsContent').innerHTML = patientInfo;
            });
    }

    async function fetchStaffProfile() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const employeeId = userData.employeeId;
        
        if (!employeeId) {
            console.error('No employee ID found in localStorage');
            showMessage('Please login again', 'error');
            return;
        }
        
        try {
            console.log(`Fetching staff profile for employeeId: ${employeeId}`);
            const response = await fetch(`http://localhost:8080/api/staff/profile?employeeId=${employeeId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
            }
            
            const staffProfile = await response.json();
            console.log('Staff profile data:', staffProfile);
            
            // Update the profile information
            document.getElementById('profileName').textContent = staffProfile.fullName;
            document.getElementById('profileRole').textContent = staffProfile.designation || 'Reception Staff';
            document.getElementById('staffName').textContent = staffProfile.fullName;
            document.getElementById('staffRole').textContent = staffProfile.role || 'Staff';
            
            // Fill form fields
            document.getElementById('fullName').value = staffProfile.fullName || '';
            document.getElementById('employeeId').value = staffProfile.employeeId || '';
            document.getElementById('email').value = staffProfile.email || '';
            document.getElementById('phone').value = staffProfile.contactNumber || '';
            document.getElementById('role').value = staffProfile.role || '';
            
            showMessage('Profile loaded successfully', 'success');
        } catch (error) {
            console.error('Error fetching staff profile:', error);
            showMessage('Failed to load profile. Please try again.', 'error');
            
            // Fall back to default data if needed for development
            console.log('Using default profile data for development');
            fillDefaultProfileData();
        }
    }
    
    async function updateProfile() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const employeeId = userData.employeeId;
        
        if (!employeeId) {
            showMessage('Please login again', 'error');
            return;
        }
        
        const email = document.getElementById('email').value;
        const contactNumber = document.getElementById('phone').value;
        
        if (!email || !contactNumber) {
            showMessage('Email and Contact Number are required', 'error');
            return;
        }
        
        try {
            console.log(`Updating staff profile for employeeId: ${employeeId}`);
            const response = await fetch(`http://localhost:8080/api/staff/profile/update?employeeId=${employeeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    contactNumber: contactNumber
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update profile: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Update result:', result);
            
            if (result.success) {
                showMessage('Profile updated successfully', 'success');
                // Refresh profile data
                fetchStaffProfile();
            } else {
                showMessage(result.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage('Failed to update profile. Please try again.', 'error');
        }
    }
    
    function handleLogout() {
        // Clear local storage
        localStorage.removeItem('userData');
        localStorage.removeItem('employeeId');
        
        // Redirect to login page
        window.location.href = 'simple_login.html';
    }
    
    function showMessage(message, type = 'info') {
        // Check if message container exists, if not create it
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.position = 'fixed';
            messageContainer.style.top = '20px';
            messageContainer.style.right = '20px';
            messageContainer.style.zIndex = '9999';
            document.body.appendChild(messageContainer);
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        messageContainer.appendChild(messageElement);
        
        // Remove after delay
        setTimeout(() => {
            messageElement.classList.add('fade-out');
            setTimeout(() => messageElement.remove(), 500);
        }, 3000);
    }
    
    function fillDefaultProfileData() {
        // Fallback function with default data for development purposes
        document.getElementById('fullName').value = 'Sarah Johnson';
        document.getElementById('employeeId').value = '5001';
        document.getElementById('email').value = 'sarah.johnson@pulsepoint.com';
        document.getElementById('phone').value = '9876543210';
        document.getElementById('role').value = 'Staff';
        
        document.getElementById('profileName').textContent = 'Sarah Johnson';
        document.getElementById('profileRole').textContent = 'Reception Staff';
        document.getElementById('staffName').textContent = 'Sarah Johnson';
        document.getElementById('staffRole').textContent = 'Staff';
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
    
    // Make checkInAppointment globally available for onclick attribute
    window.checkInAppointment = function(appointmentId) {
        console.log(`checkInAppointment called for appointment ID: ${appointmentId}`);
        checkInPatient(appointmentId)
            .then(success => {
                if (success) {
                    // Close modal and refresh appointment list
                    document.getElementById('checkInModal').style.display = 'none';
                    
                    // Optionally refresh the main appointments list if visible
                    if (document.getElementById('appointments').classList.contains('active')) {
                        renderSampleAppointments();
                    }
                }
            });
    };

    // Function to check in appointment from the check-in modal (keep existing function for backward compatibility)
    function checkInAppointment(appointmentId) {
        window.checkInAppointment(appointmentId);
    }
    
    function renderSampleAppointments() {
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        appointmentsGrid.innerHTML = '<div class="loading">Loading appointments...</div>';
        
        // Get filter values
        const doctorFilter = document.getElementById('doctorFilter')?.value || 'all';
        const departmentFilter = document.getElementById('departmentFilter')?.value || 'all';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        const statusFilter = document.getElementById('appointmentStatusFilter')?.value || 'all';
        
        // Construct URL with filters
        let apiUrl = 'http://localhost:8080/api/staff/appointments';
        
        if (statusFilter !== 'all') {
            apiUrl += `?status=${statusFilter}`;
        }
        
        // Fetch appointments from the API
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch appointments: ${response.status}`);
                }
                return response.json();
            })
            .then(appointments => {
                console.log('Appointments data:', appointments);
                
                // Apply additional client-side filters
                let filteredAppointments = appointments;
                
                if (doctorFilter !== 'all') {
                    filteredAppointments = filteredAppointments.filter(apt => 
                        apt.doctorID.toString() === doctorFilter
                    );
                }
                
                if (departmentFilter !== 'all') {
                    filteredAppointments = filteredAppointments.filter(apt => 
                        apt.department && apt.department.toLowerCase() === departmentFilter.toLowerCase()
                    );
                }
                
                if (dateFilter) {
                    // Format the date for comparison
                    const formattedDate = new Date(dateFilter).toISOString().split('T')[0];
                    filteredAppointments = filteredAppointments.filter(apt => {
                        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
                        return aptDate === formattedDate;
                    });
                }
                
                // Clear loading message
        appointmentsGrid.innerHTML = '';
        
                if (filteredAppointments.length === 0) {
                    appointmentsGrid.innerHTML = '<div class="no-data">No appointments match the selected filters.</div>';
                    return;
                }
                
                // Render each appointment
                filteredAppointments.forEach(apt => {
                    const appointmentCard = document.createElement('div');
                    appointmentCard.className = `appointment-card ${apt.status?.toLowerCase() || 'scheduled'}`;
                    
                    // Format date for display
                    const dateObj = new Date(apt.appointmentDate);
                    const dateDisplay = dateObj.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    // Create a more user-friendly card layout
                    appointmentCard.innerHTML = `
                        <div class="appointment-time">${apt.appointmentTime}</div>
                        <div class="appointment-date">${dateDisplay}</div>
                        <div class="appointment-status-badge ${apt.status?.toLowerCase() || 'scheduled'}">${apt.status || 'Scheduled'}</div>
                        <div class="appointment-details">
                            <div class="patient-info">
                                <i class="fas fa-user-injured"></i> ${apt.patientName || 'Patient'}
                            </div>
                            <div class="doctor-info">
                                <i class="fas fa-user-md"></i> ${apt.doctorName || 'Doctor'}
                            </div>
                            <div class="department-info">
                                <i class="fas fa-hospital"></i> ${apt.department || 'Department'}
                            </div>
                            <div class="contact-info">
                                <i class="fas fa-phone"></i> ${apt.contactNumber || 'N/A'}
                            </div>
                            ${apt.description ? `<div class="description-info">
                                <i class="fas fa-sticky-note"></i> ${apt.description}
                            </div>` : ''}
                        </div>
                        <div class="appointment-actions">
                            <button class="action-button view" onclick="viewAppointmentDetails(${apt.appointmentID})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="action-button update" onclick="updateAppointmentStatus(${apt.appointmentID})">
                                <i class="fas fa-edit"></i> Update Status
                            </button>
                        </div>
                    `;
                    
                    appointmentsGrid.appendChild(appointmentCard);
                });
                
                // Populate doctor and department filters if empty
                populateDoctorFilter(appointments);
                populateDepartmentFilter(appointments);
            })
            .catch(error => {
                console.error('Error fetching appointments:', error);
                appointmentsGrid.innerHTML = '<div class="error">Failed to load appointments. Please try again.</div>';
                
                // Fallback to sample data for development/demo
                setTimeout(() => {
                    renderSampleAppointmentsData();
                }, 1000);
            });
    }
    
    // Helper function to populate doctor filter from appointment data
    function populateDoctorFilter(appointments) {
        const doctorFilter = document.getElementById('doctorFilter');
        if (!doctorFilter || doctorFilter.options.length > 1) return; // Already populated
        
        // Extract unique doctors
        const doctors = [...new Map(appointments.map(apt => 
            [apt.doctorID, { id: apt.doctorID, name: apt.doctorName }]
        )).values()];
        
        // Add options
        doctors.forEach(doctor => {
            if (doctor.id && doctor.name) {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = doctor.name;
                doctorFilter.appendChild(option);
            }
        });
    }
    
    // Helper function to populate department filter from appointment data
    function populateDepartmentFilter(appointments) {
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter || departmentFilter.options.length > 1) return; // Already populated
        
        // Extract unique departments
        const departments = [...new Set(appointments.map(apt => apt.department).filter(Boolean))];
        
        // Add options
        departments.forEach(department => {
            const option = document.createElement('option');
            option.value = department.toLowerCase();
            option.textContent = department;
            departmentFilter.appendChild(option);
        });
    }
    
    // Fallback function to render sample appointment data for development/demo
    function renderSampleAppointmentsData() {
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        appointmentsGrid.innerHTML = '';
        
        // Get filter values
        const doctorFilter = document.getElementById('doctorFilter')?.value || 'all';
        const departmentFilter = document.getElementById('departmentFilter')?.value || 'all';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        const statusFilter = document.getElementById('appointmentStatusFilter')?.value || 'all';
        
        // Apply filters
        let filteredAppointments = sampleAppointments;
        
        if (doctorFilter !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.doctorID.toString() === doctorFilter
            );
        }
        
        if (departmentFilter !== 'all') {
            filteredAppointments = filteredAppointments.filter(apt => 
                apt.department.toLowerCase() === departmentFilter.toLowerCase()
            );
        }
        
        if (dateFilter) {
            const formattedDate = new Date(dateFilter).toISOString().split('T')[0];
            filteredAppointments = filteredAppointments.filter(apt => {
                const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
                return aptDate === formattedDate;
            });
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
        
        // Populate the doctor and department filters
        populateDoctorFilter(sampleAppointments);
        populateDepartmentFilter(sampleAppointments);
        
        // Render each appointment
        filteredAppointments.forEach(apt => {
            const appointmentCard = document.createElement('div');
            appointmentCard.className = `appointment-card ${apt.status}`;
            
            // Format date for display
            const dateObj = new Date(apt.appointmentDate);
            const dateDisplay = dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            appointmentCard.innerHTML = `
                <div class="appointment-header">
                    <div class="appointment-time">${apt.appointmentTime}</div>
                    <div class="appointment-date">${dateDisplay}</div>
                    <div class="appointment-status ${apt.status?.toLowerCase() || 'scheduled'}">${apt.status || 'Scheduled'}</div>
                </div>
                <div class="appointment-body">
                    <div class="appointment-patient">
                        <i class="fas fa-user-injured"></i> ${apt.patientName}
                    </div>
                    <div class="appointment-doctor">
                        <i class="fas fa-user-md"></i> ${apt.doctorName}
                    </div>
                    <div class="appointment-department">
                        <i class="fas fa-hospital"></i> ${apt.department}
                    </div>
                    <div class="appointment-contact">
                        <i class="fas fa-phone"></i> ${apt.contactNumber}
                    </div>
                    ${apt.description ? `<div class="appointment-notes">
                        <i class="fas fa-sticky-note"></i> ${apt.description}
                    </div>` : ''}
                </div>
                <div class="appointment-actions">
                    <button class="btn-action view-btn" onclick="viewAppointmentDetails(${apt.appointmentID})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action edit-btn" onclick="updateAppointmentStatus(${apt.appointmentID})">
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
    
    // Global variable to store current appointment ID for status updates
    let currentAppointmentId = null;
    
    window.viewAppointmentDetails = function(appointmentId) {
        // Store the current appointment ID for status updates
        currentAppointmentId = appointmentId;
        currentPatientId = null; // Reset patient ID when viewing appointment
        
        // Show the modal
        const modal = document.getElementById('appointmentDetailsModal');
        modal.style.display = 'block';
        
        // Show loading state
        document.getElementById('appointmentDetailsContent').innerHTML = '<div class="loading">Loading appointment details...</div>';
        
        // Fetch appointment details from server
        fetch(`http://localhost:8080/api/staff/appointments/${appointmentId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch appointment details');
                }
                return response.json();
            })
            .then(appointment => {
                // Format and display appointment information
                const appointmentDate = new Date(appointment.appointmentDate);
                const formattedDate = appointmentDate.toLocaleDateString();
                
                const appointmentInfo = `
                    <div class="detail-section">
                        <h3>Appointment Information</h3>
                        <p><span class="label">Date:</span> <span class="value">${formattedDate}</span></p>
                        <p><span class="label">Time:</span> <span class="value">${appointment.appointmentTime}</span></p>
                        <p><span class="label">Status:</span> <span class="value status-highlight ${appointment.status}">${appointment.status}</span></p>
                        <p><span class="label">Department:</span> <span class="value">${appointment.department || 'N/A'}</span></p>
                        <p><span class="label">Description:</span> <span class="value">${appointment.description || 'N/A'}</span></p>
                    </div>
                    <div class="detail-section">
                        <h3>Patient Information</h3>
                        <p><span class="label">Name:</span> <span class="value">${appointment.patientName}</span></p>
                        <p><span class="label">ID:</span> <span class="value">${appointment.patientID}</span></p>
                        <p><span class="label">Contact:</span> <span class="value">${appointment.contactNumber || 'N/A'}</span></p>
                    </div>
                    <div class="detail-section">
                        <h3>Doctor Information</h3>
                        <p><span class="label">Name:</span> <span class="value">${appointment.doctorName}</span></p>
                        <p><span class="label">ID:</span> <span class="value">${appointment.doctorID}</span></p>
                        <p><span class="label">Department:</span> <span class="value">${appointment.department || 'N/A'}</span></p>
                    </div>
                `;
                
                document.getElementById('appointmentDetailsContent').innerHTML = appointmentInfo;
                
                // Highlight the current status button
                highlightCurrentStatus(appointment.status);
            })
            .catch(error => {
                console.error('Error fetching appointment details:', error);
                
                // For demo purposes, show sample data with the specific appointment ID
                setTimeout(() => {
                    // Find the appointment in our sample data
                    const filteredAppointments = sampleAppointments.filter(apt => apt.appointmentID === appointmentId);
                    let sampleAppointment = null;
                    
                    if (filteredAppointments.length > 0) {
                        sampleAppointment = filteredAppointments[0];
                    } else {
                        // Fallback to generic sample if not found
                        sampleAppointment = {
                            appointmentID: appointmentId,
                            patientName: "Sample Patient",
                            patientID: 1001,
                            doctorName: "Dr. Sample Doctor",
                            doctorID: 101,
                            department: "Sample Department",
                            appointmentDate: new Date().toISOString().split('T')[0],
                            appointmentTime: "10:00 AM",
                            description: "Sample description",
                            status: "scheduled",
                            contactNumber: "9876543210"
                        };
                    }
                    
                    const appointmentInfo = `
                        <div class="detail-section">
                            <h3>Appointment Information</h3>
                            <p><span class="label">Date:</span> <span class="value">${new Date(sampleAppointment.appointmentDate).toLocaleDateString()}</span></p>
                            <p><span class="label">Time:</span> <span class="value">${sampleAppointment.appointmentTime}</span></p>
                            <p><span class="label">Status:</span> <span class="value status-highlight ${sampleAppointment.status}">${sampleAppointment.status}</span></p>
                            <p><span class="label">Department:</span> <span class="value">${sampleAppointment.department}</span></p>
                            <p><span class="label">Description:</span> <span class="value">${sampleAppointment.description}</span></p>
                        </div>
                        <div class="detail-section">
                            <h3>Patient Information</h3>
                            <p><span class="label">Name:</span> <span class="value">${sampleAppointment.patientName}</span></p>
                            <p><span class="label">ID:</span> <span class="value">${sampleAppointment.patientID}</span></p>
                            <p><span class="label">Contact:</span> <span class="value">${sampleAppointment.contactNumber}</span></p>
                        </div>
                        <div class="detail-section">
                            <h3>Doctor Information</h3>
                            <p><span class="label">Name:</span> <span class="value">${sampleAppointment.doctorName}</span></p>
                            <p><span class="label">ID:</span> <span class="value">${sampleAppointment.doctorID}</span></p>
                            <p><span class="label">Department:</span> <span class="value">${sampleAppointment.department}</span></p>
                        </div>
                    `;
                    
                    document.getElementById('appointmentDetailsContent').innerHTML = appointmentInfo;
                    highlightCurrentStatus(sampleAppointment.status);
                }, 500);
            });
    };

    // Helper function to highlight the current status button
    function highlightCurrentStatus(status) {
        // Clear all active status
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current status
        const statusBtn = document.querySelector(`.status-btn.${status.toLowerCase()}`);
        if (statusBtn) {
            statusBtn.classList.add('active');
        }
    }

    // Function to change appointment status from the modal
    window.changeAppointmentStatus = function(status) {
        // Show a loading message
        document.getElementById('appointmentDetailsContent').innerHTML = '<div class="loading">Updating status...</div>';
        
        if (currentAppointmentId) {
            // Handle appointment status update
            fetch(`/api/appointments/${currentAppointmentId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update appointment status');
                }
                return response.json();
            })
            .then(data => {
                // Update the UI and close the modal
                showMessage(`Appointment status updated to ${status}`, 'success');
                
                // Refresh the appointments list
            renderSampleAppointments();
                
                // Close the modal
                document.getElementById('appointmentDetailsModal').style.display = 'none';
            })
            .catch(error => {
                console.error('Error updating appointment status:', error);
                
                // For demo purposes, simulate a successful update
                setTimeout(() => {
                    showMessage(`Appointment status updated to ${status}`, 'success');
                    renderSampleAppointments();
                    document.getElementById('appointmentDetailsModal').style.display = 'none';
                }, 500);
            });
        } else if (currentPatientId) {
            // Handle patient status update
            fetch(`/api/patients/${currentPatientId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update patient status');
                }
                return response.json();
            })
            .then(data => {
                // Update the UI and close the modal
                showMessage(`Patient status updated to ${status}`, 'success');
                
                // Refresh the patient list
                loadPatients();
                
                // Close the modal
                document.getElementById('appointmentDetailsModal').style.display = 'none';
            })
            .catch(error => {
                console.error('Error updating patient status:', error);
                
                // For demo purposes, simulate a successful update
                setTimeout(() => {
                    showMessage(`Patient status updated to ${status}`, 'success');
                    loadPatients();
                    document.getElementById('appointmentDetailsModal').style.display = 'none';
                }, 500);
            });
        }
    };

    window.updateAppointmentStatus = function(appointmentId) {
        viewAppointmentDetails(appointmentId);
    };
    
    window.updateBedStatus = function(bedId, newStatus) {
        alert(`Bed #${bedId} status updated to ${newStatus} (demo only)`);
        renderSampleBeds();
    };

    // Fallback function to render sample patients when API is not available
    function renderSamplePatients(searchTerm = '', statusFilter = 'all') {
        console.log('Using sample patient data as fallback');
        
        // Sample patient data
        const samplePatients = [
            {
                id: 1001,
                name: "Rajesh Kumar",
                email: "rajesh.kumar@example.com",
                contact: "9876543210",
                status: "new"
            },
            {
                id: 1002,
                name: "Priya Sharma",
                email: "priya.sharma@example.com",
                contact: "8765432109",
                status: "admitted",
                bedID: 101
            },
            {
                id: 1003,
                name: "Amit Patel",
                email: "amit.patel@example.com",
                contact: "7654321098",
                status: "scheduled",
                appointmentID: 2001
            },
            {
                id: 1004,
                name: "Sunita Verma",
                email: "sunita.verma@example.com",
                contact: "6543210987",
                status: "checked-in",
                appointmentID: 2002
            }
        ];
        
        // Render the sample patients
        renderPatients(samplePatients, searchTerm, statusFilter);
    }

    // Populate selects with data
    function populatePatientSelect(selectId) {
        fetch('http://localhost:8080/api/staff/patients')
            .then(response => response.json())
            .then(patients => {
                const select = document.getElementById(selectId);
                select.innerHTML = '<option value="">Select Patient</option>';
                
                // Filter to only show non-admitted patients
                const availablePatients = patients.filter(p => p.status !== 'admitted');
                
                availablePatients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.id;
                    option.textContent = patient.name;
                    select.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading patients for select:', error);
                // Fallback to sample data
                populateSamplePatientSelect(selectId);
            });
    }
    
    function populateDoctorSelect(selectId) {
        fetch('http://localhost:8080/api/doctors')
            .then(response => response.json())
            .then(doctors => {
                const select = document.getElementById(selectId);
                select.innerHTML = '<option value="">Select Doctor</option>';
                
                doctors.forEach(doctor => {
                    const option = document.createElement('option');
                    option.value = doctor.doctor_id;
                    option.textContent = `${doctor.full_name} (${doctor.department})`;
                    select.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading doctors for select:', error);
                // Fallback to sample data
                populateSampleDoctorSelect(selectId);
            });
    }
    
    function populateBedSelect(selectId, wardType) {
        // In a real app, this would fetch available beds from the API based on ward type
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Bed</option>';
        
        // For demo purposes, use sample beds
        const sampleBeds = [
            { bed_id: 201, bed_number: "GEN-101", ward: "general" },
            { bed_id: 202, bed_number: "GEN-102", ward: "general" },
            { bed_id: 203, bed_number: "ICU-101", ward: "icu" },
            { bed_id: 204, bed_number: "ICU-102", ward: "icu" },
            { bed_id: 205, bed_number: "EMG-101", ward: "emergency" },
            { bed_id: 206, bed_number: "PED-101", ward: "pediatric" }
        ];
        
        // Filter beds by ward if specified
        const wardBeds = wardType && wardType !== 'all' 
            ? sampleBeds.filter(bed => bed.ward === wardType)
            : sampleBeds;
        
        wardBeds.forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.bed_id;
            option.textContent = `${bed.bed_number} (${bed.ward})`;
            select.appendChild(option);
        });
    }
    
    // Function to create a new appointment
    function createNewAppointment(e) {
        e.preventDefault();
        
        // Show a loading message
        showMessage('Creating new appointment...', 'info');
        
        // Get form data
        const form = document.getElementById('newAppointmentForm');
        const formData = new FormData(form);
        
        // Convert FormData to object
        const appointmentData = {};
        formData.forEach((value, key) => {
            appointmentData[key] = value;
        });

        // Add status
        appointmentData.status = 'scheduled';
        
        console.log('Sending appointment data:', appointmentData);
        
        // Send data to server
        fetch('http://localhost:8080/api/staff/appointments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Appointment created:', data);
            
            // Close modal
            document.getElementById('newAppointmentModal').style.display = 'none';
            
            // Reset form
            form.reset();
            
            // Show success message
            showMessage('Appointment created successfully!', 'success');
            
            // Refresh appointment list
            renderSampleAppointments();
        })
        .catch(error => {
            console.error('Error creating appointment:', error);
            showMessage('Error creating appointment: ' + error.message, 'error');
            
            // For development/demo purposes, simulate success
            console.log('Simulating successful appointment creation despite error');
            document.getElementById('newAppointmentModal').style.display = 'none';
            form.reset();
            showMessage('Appointment created successfully (simulated)!', 'success');
            renderSampleAppointments();
        });
    }

    window.refreshAppointments = function() {
        // Show loading message
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        if (appointmentsGrid) {
            appointmentsGrid.innerHTML = '<div class="loading">Refreshing appointments...</div>';
        }
        
        // Reset filters (optional, depending on requirements)
        // document.getElementById('doctorFilter').value = 'all';
        // document.getElementById('departmentFilter').value = 'all';
        // document.getElementById('appointmentStatusFilter').value = 'all';
        
        // Call the render function to reload data from the server
        renderSampleAppointments();
        
        // Show a message
        showMessage('Appointments refreshed', 'info');
    };

    // Update the filter event listeners to reload appointments when filter changes
    document.getElementById('doctorFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });

    document.getElementById('departmentFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });

    document.getElementById('appointmentStatusFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });

    document.getElementById('dateFilter')?.addEventListener('change', function() {
        renderSampleAppointments();
    });

    // Add a refresh button click handler
    document.querySelector('.action-buttons .btn-primary:nth-child(2)')?.addEventListener('click', function() {
        refreshAppointments();
    });

    // Helper function to populate sample patient select when API fails
    function populateSamplePatientSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Patient</option>';
        
        // Sample patient data
        const samplePatients = [
            { id: 1001, name: "Rajesh Kumar" },
            { id: 1002, name: "Priya Sharma" },
            { id: 1003, name: "Amit Patel" },
            { id: 1004, name: "Sunita Verma" },
            { id: 1005, name: "Vikram Singh" }
        ];
        
        samplePatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = patient.name;
            select.appendChild(option);
        });
        
        console.log('Populated select with sample patient data:', selectId);
    }
    
    // Helper function to populate sample doctor select when API fails
    function populateSampleDoctorSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Doctor</option>';
        
        // Sample doctor data
        const sampleDoctors = [
            { doctor_id: 101, full_name: "Dr. Sarah Johnson", department: "Cardiology" },
            { doctor_id: 102, full_name: "Dr. Michael Chen", department: "Neurology" },
            { doctor_id: 103, full_name: "Dr. Robert Smith", department: "Orthopedics" },
            { doctor_id: 104, full_name: "Dr. Emily Brown", department: "Ophthalmology" },
            { doctor_id: 105, full_name: "Dr. David Wilson", department: "Pediatrics" }
        ];
        
        sampleDoctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.doctor_id;
            option.textContent = `${doctor.full_name} (${doctor.department})`;
            select.appendChild(option);
        });
        
        console.log('Populated select with sample doctor data:', selectId);
    }

    // Function to load and render beds
    async function loadBeds() {
        try {
            showMessage('Loading bed status...', 'info');
            
            // Fetch beds data from server
            const response = await fetch('http://localhost:8080/api/staff/beds');
            if (!response.ok) {
                throw new Error('Failed to fetch beds data');
            }
            
            const bedsData = await response.json();
            console.log('Beds data:', bedsData);
            
            // Update bed stats
            updateBedStats(bedsData);
            
            // Render beds grid
            renderBeds(bedsData);
            
            showMessage('Bed status loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading beds:', error);
            showMessage('Failed to load beds data', 'error');
            // Fallback to sample data for development
            renderSampleBeds();
        }
    }

    // Update bed statistics
    function updateBedStats(bedsData) {
        const stats = bedsData.reduce((acc, bed) => {
            acc.total++;
            acc[bed.status]++;
            return acc;
        }, { total: 0, available: 0, occupied: 0, maintenance: 0 });

        document.getElementById('totalBeds').textContent = stats.total;
        document.getElementById('availableBeds').textContent = stats.available;
        document.getElementById('occupiedBeds').textContent = stats.occupied;
        document.getElementById('maintenanceBeds').textContent = stats.maintenance;
    }

    // Render beds in the grid
    function renderBeds(bedsData, wardFilter = 'all', statusFilter = 'all') {
        const bedGrid = document.getElementById('bedGrid');
        bedGrid.innerHTML = '';
        
        // Apply filters
        let filteredBeds = bedsData || [];
        
        // If we have no data, use sample data for development
        if (filteredBeds.length === 0) {
            // Sample data with proper bed structure
            filteredBeds = [
                { id: 1, bedNumber: '1', ward: 'General', type: 'General', status: 'occupied', patientName: 'Guddu', patientId: '6', admissionDate: '2023-04-14' },
                { id: 2, bedNumber: '2', ward: 'General', type: 'General', status: 'available' },
                { id: 3, bedNumber: '3', ward: 'General', type: 'General', status: 'available' },
                { id: 4, bedNumber: '4', ward: 'General', type: 'General', status: 'available' },
                { id: 5, bedNumber: '5', ward: 'General', type: 'General', status: 'occupied', patientName: 'Shweta Jha', patientId: '10', admissionDate: '2023-04-14' },
                { id: 6, bedNumber: '6', ward: 'General', type: 'General', status: 'available' },
                { id: 7, bedNumber: '7', ward: 'General', type: 'General', status: 'available' },
                { id: 8, bedNumber: '8', ward: 'General', type: 'General', status: 'available' },
                { id: 9, bed_number: 'ICU-101', ward: 'ICU', type: 'ICU', status: 'occupied', patientName: 'Ravi Kumar', patientId: '12', admissionDate: '2023-04-13' },
                { id: 10, bed_number: 'ICU-102', ward: 'ICU', type: 'ICU', status: 'available' },
                { id: 11, bed_number: 'EMG-101', ward: 'Emergency', type: 'Emergency', status: 'maintenance' },
                { id: 12, bed_number: 'EMG-102', ward: 'Emergency', type: 'Emergency', status: 'occupied', patientName: 'Alok Singh', patientId: '15', admissionDate: '2023-04-15' }
            ];
        }
        
        // Apply filters if specified
        if (wardFilter !== 'all') {
            filteredBeds = filteredBeds.filter(bed => 
                (bed.ward || '').toLowerCase() === wardFilter.toLowerCase()
            );
        }
        if (statusFilter !== 'all') {
            filteredBeds = filteredBeds.filter(bed => 
                (bed.status || '').toLowerCase() === statusFilter.toLowerCase()
            );
        }
        
        if (filteredBeds.length === 0) {
            bedGrid.innerHTML = '<div class="no-data">No beds match the selected filters.</div>';
            return;
        }

        // Create grid container for beds
        bedGrid.className = 'bed-cards-container';
        
        // Render each bed
        filteredBeds.forEach(bed => {
            // Ensure we have valid data
            const bedId = bed.id || bed.bedId || '';
            const bedNumber = bed.bedNumber || bedId;
            const bedStatus = (bed.status || 'available').toLowerCase();
            const ward = bed.ward || 'General';
            const type = bed.type || 'General';
            
            const bedCard = document.createElement('div');
            bedCard.className = 'bed-box';
            
            // Set card content
            if (bedStatus === 'occupied') {
                // Occupied bed card
                const patientName = bed.patientName || 'Unknown';
                const patientId = bed.patientId || '';
                const admissionDate = bed.admissionDate ? new Date(bed.admissionDate).toLocaleDateString('en-GB') : '';
                
                bedCard.innerHTML = `
                    <div class="bed-header">
                        <h3>Bed ${bedNumber}</h3>
                        <span class="bed-status occupied">Occupied</span>
                    </div>
                    <div class="bed-info">
                        <p><strong>Ward:</strong> ${ward}</p>
                        <p><strong>Type:</strong> ${type}</p>
                        <p><strong>Patient:</strong> ${patientName}</p>
                        <p><strong>Patient ID:</strong> ${patientId}</p>
                        <p><strong>Admitted:</strong> ${admissionDate}</p>
                    </div>
                    <div class="bed-actions">
                        <button class="view-details-btn" onclick="viewPatientDetails(${patientId})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                `;
            } else if (bedStatus === 'available') {
                // Available bed card
                bedCard.innerHTML = `
                    <div class="bed-header">
                        <h3>Bed ${bedNumber}</h3>
                        <span class="bed-status available">Available</span>
                    </div>
                    <div class="bed-info">
                        <p><strong>Ward:</strong> ${ward}</p>
                        <p><strong>Type:</strong> ${type}</p>
                    </div>
                `;
            } else {
                // Maintenance or other status
                bedCard.innerHTML = `
                    <div class="bed-header">
                        <h3>Bed ${bedNumber}</h3>
                        <span class="bed-status maintenance">Maintenance</span>
                    </div>
                    <div class="bed-info">
                        <p><strong>Ward:</strong> ${ward}</p>
                        <p><strong>Type:</strong> ${type}</p>
                    </div>
                    <div class="bed-actions">
                        <button class="maintenance-btn" onclick="updateBedStatus(${bedId}, 'available')">
                            <i class="fas fa-tools"></i> Mark Available
                        </button>
                    </div>
                `;
            }
            
            bedGrid.appendChild(bedCard);
        });
        
        // Add CSS for bed display if it doesn't exist
        if (!document.getElementById('bed-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'bed-styles';
            styleSheet.textContent = `
                .bed-cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 20px;
                    padding: 20px;
                }
                
                .bed-box {
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .bed-box:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                
                .bed-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .bed-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #343a40;
                }
                
                .bed-status {
                    padding: 6px 12px;
                    border-radius: 30px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    text-transform: capitalize;
                }
                
                .bed-status.available {
                    background-color: #00b74a;
                    color: white;
                }
                
                .bed-status.occupied {
                    background-color: #1266f1;
                    color: white;
                }
                
                .bed-status.maintenance {
                    background-color: #f93154;
                    color: white;
                }
                
                .bed-info {
                    padding: 15px;
                }
                
                .bed-info p {
                    margin: 8px 0;
                    font-size: 0.95rem;
                    color: #495057;
                }
                
                .bed-actions {
                    padding: 0 15px 15px;
                }
                
                .view-details-btn, .allocate-btn, .maintenance-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 10px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                
                .view-details-btn {
                    background-color: #39c0ed;
                    color: white;
                }
                
                .view-details-btn:hover {
                    background-color: #00b4d8;
                }
                
                .allocate-btn {
                    background-color: #00b74a;
                    color: white;
                }
                
                .allocate-btn:hover {
                    background-color: #009e40;
                }
                
                .maintenance-btn {
                    background-color: #fb8500;
                    color: white;
                }
                
                .maintenance-btn:hover {
                    background-color: #e77800;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    // Allocate bed to patient
    async function allocateBed(formData) {
        try {
            showMessage('Allocating bed...', 'info');
            
            const bedData = {
                patientId: parseInt(formData.get('patientId')),
                bedId: parseInt(formData.get('bedId')),
                doctorId: parseInt(formData.get('doctorId')),
                notes: formData.get('notes') || '',
                isEmergency: formData.get('isEmergency') === 'true'
            };
            
            // Validate data
            if (!bedData.patientId || !bedData.bedId || !bedData.doctorId) {
                throw new Error('Please fill in all required fields');
            }
            
            console.log('Allocating bed:', bedData);
            
            // Send allocation request
            const response = await fetch('http://localhost:8080/api/staff/assign-bed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bedData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Failed to allocate bed: ${response.status}`);
            }
            
            const result = await response.json();
            showMessage(result.message || 'Bed allocated successfully', 'success');
            
            // Update UI
            await loadBeds();
            loadPatients();
            
            // Close modal
            document.getElementById('bedAllocationModal').style.display = 'none';
            
            return true;
        } catch (error) {
            console.error('Error allocating bed:', error);
            showMessage(error.message, 'error');
            return false;
        }
    }

    // Transfer patient to another bed
    async function transferBed(formData) {
        try {
            showMessage('Transferring patient...', 'info');
            
            const transferData = {
                patientId: parseInt(formData.get('patientId')),
                fromBedId: parseInt(formData.get('fromBedId')),
                toBedId: parseInt(formData.get('toBedId')),
                reason: formData.get('reason') || ''
            };
            
            // Validate data
            if (!transferData.patientId || !transferData.fromBedId || !transferData.toBedId) {
                throw new Error('Please fill in all required fields');
            }
            
            console.log('Transferring patient:', transferData);
            
            // Send transfer request
            const response = await fetch('http://localhost:8080/api/staff/transfer-bed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transferData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Failed to transfer patient: ${response.status}`);
            }
            
            const result = await response.json();
            showMessage(result.message || 'Patient transferred successfully', 'success');
            
            // Update UI
            await loadBeds();
            
            // Close modal
            document.getElementById('transferModal').style.display = 'none';
            
            return true;
        } catch (error) {
            console.error('Error transferring patient:', error);
            showMessage(error.message, 'error');
            return false;
        }
    }

    // Emergency bed allocation
    async function allocateEmergencyBed(formData) {
        try {
            showMessage('Processing emergency bed allocation...', 'info');
            
            const emergencyData = {
                patientId: parseInt(formData.get('patientId')),
                doctorId: parseInt(formData.get('doctorId')),
                emergencyType: formData.get('emergencyType'),
                priority: formData.get('priority') || 'high',
                notes: formData.get('notes') || ''
            };
            
            // Validate data
            if (!emergencyData.patientId || !emergencyData.doctorId || !emergencyData.emergencyType) {
                throw new Error('Please fill in all required fields');
            }
            
            console.log('Emergency bed allocation:', emergencyData);
            
            // Send emergency allocation request
            const response = await fetch('http://localhost:8080/api/staff/emergency-assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emergencyData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Failed to allocate emergency bed: ${response.status}`);
            }
            
            const result = await response.json();
            showMessage(result.message || 'Emergency bed allocated successfully', 'success');
            
            // Update UI
            await loadBeds();
            loadPatients();
            
            // Close modal
            document.getElementById('emergencyAllotmentModal').style.display = 'none';
            
            return true;
        } catch (error) {
            console.error('Error allocating emergency bed:', error);
            showMessage(error.message, 'error');
            return false;
        }
    }

    // Update bed status
    async function updateBedStatus(bedId, newStatus) {
        try {
            showMessage('Updating bed status...', 'info');
            
            const response = await fetch(`http://localhost:8080/api/staff/beds/${bedId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update bed status');
            }
            
            showMessage(`Bed status updated to ${newStatus}`, 'success');
            await loadBeds();
            
            return true;
        } catch (error) {
            console.error('Error updating bed status:', error);
            showMessage(error.message, 'error');
            return false;
        }
    }

    // Function to open bed assignment modal - Adapted from admin.js
    function openBedAssignmentModal(patientId, patientName) {
        console.log("Opening bed assignment modal");
        
        const modal = document.getElementById('bedAssignmentModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Bed assignment modal element not found');
            return;
        }
        
        // If patientId and patientName are provided, pre-select the patient
        window.preSelectedPatientId = patientId;
        window.preSelectedPatientName = patientName;
        
        // Load patients for the dropdown
        populatePatientDropdown();
        
        // Load bed inventory data
        fetch('http://localhost:8080/api/beds/inventory')
            .then(response => {
                if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
                return response.json();
            })
            .then(beds => {
                console.log(`Retrieved ${beds.length} beds from database`);
                // Store beds data globally
                window.bedInventoryData = beds;
                // Populate the dropdown
                populateAvailableBedsDropdown();
            })
            .catch(error => {
                console.error('Error fetching beds:', error);
                showAssignmentError(`Failed to load beds: ${error.message}. Please try again.`);
            });
        
        // Reset the form
        const form = document.getElementById('bedAssignmentForm');
        if (form) {
            form.reset();
            
            // Remove any existing event listeners to prevent duplicates
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            // Add the submit event listener
            newForm.addEventListener('submit', handleBedAssignmentSubmit);
        }
        
        // Set default admission date to today
        const admissionDateInput = document.getElementById('admissionDate');
        if (admissionDateInput) {
            const today = new Date().toISOString().split('T')[0];
            admissionDateInput.value = today;
            admissionDateInput.min = today;
        }
        
        // Clear any previous error messages
        const errorMsg = document.getElementById('assignmentErrorMessage');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    }

    // Function to close bed assignment modal
    function closeBedAssignmentModal() {
        console.log('Closing bed assignment modal');
        
        const modal = document.getElementById('bedAssignmentModal');
        if (modal) {
            modal.style.display = 'none';
        } else {
            console.error('Bed assignment modal element not found when trying to close');
        }
        
        // Reset form
        const form = document.getElementById('bedAssignmentForm');
        if (form) {
            form.reset();
        }
        
        // Clear error messages
        const errorMsg = document.getElementById('assignmentErrorMessage');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
        
        // Reset any select validation styling
        const selects = document.querySelectorAll('#bedAssignmentForm select');
        selects.forEach(select => {
            select.classList.remove('has-error');
            select.classList.remove('is-valid');
        });
        
        // Clear pre-selected patient
        window.preSelectedPatientId = null;
        window.preSelectedPatientName = null;
    }

    // Populate patient dropdown for bed assignment modal
    function populatePatientDropdown() {
        console.log('Populating patient dropdown');
        const patientSelect = document.getElementById('patientSelect');
        if (!patientSelect) {
            console.error('Patient select element not found');
            showAssignmentError('Internal error: Patient dropdown not found');
            return;
        }
        
        // Clear ALL existing options
        patientSelect.innerHTML = '';
        
        // Add the default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Patient';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        patientSelect.appendChild(defaultOption);
        
        // If we have a pre-selected patient, add it and return
        if (window.preSelectedPatientId && window.preSelectedPatientName) {
            const selectedOption = document.createElement('option');
            selectedOption.value = window.preSelectedPatientId;
            selectedOption.textContent = window.preSelectedPatientName;
            selectedOption.selected = true;
            patientSelect.appendChild(selectedOption);
            return;
        }
        
        // Add loading message
        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.disabled = true;
        loadingOption.textContent = 'Loading patients from database...';
        patientSelect.appendChild(loadingOption);
        
        // First fetch all patients
        fetch('http://localhost:8080/api/patients')
            .then(response => {
                if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
                return response.json();
            })
            .then(patients => {
                console.log(`Retrieved ${patients.length} total patients from database`);
                
                // Now fetch bed assignments to filter out patients who already have beds
                fetch('http://localhost:8080/api/beds/assignments')
                    .then(response => {
                        // If we can't fetch assignments (empty table, etc), we'll show all patients
                        if (!response.ok) {
                            console.log('Could not fetch bed assignments - showing all patients');
                            return []; // Return empty array if can't fetch
                        }
                        return response.json();
                    })
                    .catch(error => {
                        console.log('Error fetching assignments, showing all patients:', error);
                        return []; // Return empty array on error
                    })
                    .then(assignments => {
                        // Clean the dropdown
                        patientSelect.innerHTML = '';
                        patientSelect.appendChild(defaultOption);
                        
                        // Create a Set of patient IDs who already have active bed assignments
                        const patientsWithBeds = new Set();
                        
                        if (Array.isArray(assignments) && assignments.length > 0) {
                            // Filter only current assignments
                            const currentAssignments = assignments.filter(a => a && a.status === 'current');
                            
                            // Get today's date for comparison
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            
                            // Add patients with current assignments to the set
                            currentAssignments.forEach(assignment => {
                                // Check if assignment has a discharge date in the future
                                let isActive = true;
                                if (assignment.dischargeDate) {
                                    const dischargeDate = new Date(assignment.dischargeDate);
                                    dischargeDate.setHours(0, 0, 0, 0);
                                    isActive = dischargeDate >= today;
                                }
                                
                                // If active assignment, add to exclusion set
                                if (isActive) {
                                    patientsWithBeds.add(String(assignment.patientID));
                                }
                            });
                        }
                        
                        console.log(`Found ${patientsWithBeds.size} patients with active bed assignments`);
                        
                        // Filter patients who don't have active bed assignments
                        let availablePatients = patients;
                        if (patientsWithBeds.size > 0) {
                            availablePatients = patients.filter(p => !patientsWithBeds.has(String(p.patient_id)));
                        }
                        
                        console.log(`After filtering, ${availablePatients.length} patients are available for bed assignment`);
                        
                        if (availablePatients.length === 0) {
                            const noOption = document.createElement('option');
                            noOption.value = '';
                            noOption.textContent = 'All patients already have beds assigned';
                            noOption.disabled = true;
                            patientSelect.appendChild(noOption);
                            showAssignmentError('All patients in the database already have bed assignments. Please discharge a patient or add a new patient.');
                            return;
                        }
                        
                        // Sort by name for better user experience
                        availablePatients.sort((a, b) => a.full_name.localeCompare(b.full_name));
                        
                        // Add each available patient to dropdown
                        availablePatients.forEach(patient => {
                            const option = document.createElement('option');
                            option.value = patient.patient_id;
                            option.textContent = patient.full_name;
                            patientSelect.appendChild(option);
                        });
                    });
            })
            .catch(error => {
                console.error('Error fetching patients:', error);
                patientSelect.innerHTML = '';
                patientSelect.appendChild(defaultOption);
                
                const errorOption = document.createElement('option');
                errorOption.value = '';
                errorOption.textContent = 'Error loading patients. Please try again.';
                errorOption.disabled = true;
                patientSelect.appendChild(errorOption);
                
                showAssignmentError(`Failed to load patients: ${error.message}. Please try again.`);
            });
    }

    // Function to populate available beds dropdown
    function populateAvailableBedsDropdown() {
        console.log('Populating available beds dropdown');
        const bedSelect = document.getElementById('bedSelect');
        if (!bedSelect) {
            console.error('Bed select element not found!');
            showAssignmentError('Internal error: Bed select element not found.');
            return;
        }
        
        // Clear ALL existing options
        bedSelect.innerHTML = '';
        
        // Add the default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Bed';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        bedSelect.appendChild(defaultOption);
        
        // Check if we have bed data
        if (!window.bedInventoryData || window.bedInventoryData.length === 0) {
            console.error('No bed inventory data available!');
            const noOption = document.createElement('option');
            noOption.value = '';
            noOption.textContent = 'No beds available - please refresh';
            noOption.disabled = true;
            bedSelect.appendChild(noOption);
            showAssignmentError('No bed data available. Please refresh the page and try again.');
            return;
        }
        
        console.log(`Found ${window.bedInventoryData.length} total beds in inventory`);
        
        // Filter only AVAILABLE beds
        const availableBeds = window.bedInventoryData.filter(bed => bed && bed.status === 'available');
        console.log(`${availableBeds.length} beds are available for assignment`);
        
        if (availableBeds.length === 0) {
            const noOption = document.createElement('option');
            noOption.value = '';
            noOption.textContent = 'No available beds';
            noOption.disabled = true;
            bedSelect.appendChild(noOption);
            showAssignmentError('No beds available. All beds are currently assigned or in maintenance.');
            return;
        }
        
        // Sort beds by ID for consistency
        availableBeds.sort((a, b) => parseInt(a.bedID) - parseInt(b.bedID));
        
        // Add each available bed to dropdown
        availableBeds.forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.bedID;
            option.textContent = `Bed #${bed.bedID} - ${bed.bedType} - ${bed.hospitalName || 'Unknown Hospital'}`;
            bedSelect.appendChild(option);
        });
    }

    // Function to handle bed assignment form submission
    function handleBedAssignmentSubmit(event) {
        event.preventDefault();
        console.log('Bed assignment form submission triggered');
        
        // Get form values
        const patientId = document.getElementById('patientSelect').value;
        const bedId = document.getElementById('bedSelect').value;
        const admissionDate = document.getElementById('admissionDate').value;
        const dischargeDate = document.getElementById('dischargeDate').value;
        const notes = document.getElementById('assignmentNotes').value;
        
        console.log('Form values:', { patientId, bedId, admissionDate, dischargeDate, notes });
        
        // Validate form inputs
        if (!patientId) {
            showAssignmentError('Please select a patient');
            document.getElementById('patientSelect').focus();
            return;
        }
        
        if (!bedId) {
            showAssignmentError('Please select a bed');
            document.getElementById('bedSelect').focus();
            return;
        }
        
        if (!admissionDate) {
            showAssignmentError('Please select an admission date');
            document.getElementById('admissionDate').focus();
            return;
        }
        
        // Create assignment data object
        const assignmentData = {
            patientID: parseInt(patientId),
            bedID: parseInt(bedId),
            admissionDate: admissionDate,
            dischargeDate: dischargeDate || null,
            notes: notes || '',
            status: 'current'
        };
        
        console.log('Sending bed assignment data to server:', JSON.stringify(assignmentData));
        
        // Clear previous error
        document.getElementById('assignmentErrorMessage').style.display = 'none';
        
        // Show loading state
        const submitButton = document.querySelector('#bedAssignmentForm button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Assigning...';
        
        // Display a spinner or loading message in the modal
        const modalBody = document.querySelector('.modal-body');
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-overlay';
        loadingEl.innerHTML = '<div class="spinner"></div><p>Processing assignment...</p>';
        loadingEl.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;';
        modalBody.appendChild(loadingEl);
        
        // Send API request to create bed assignment
        fetch('http://localhost:8080/api/beds/assignments/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assignmentData)
        })
        .then(response => {
            console.log('Server response status:', response.status);
            
            // Remove loading overlay
            if (loadingEl.parentNode) {
                loadingEl.parentNode.removeChild(loadingEl);
            }
            
            // Handle common errors
            if (response.status === 400) {
                return response.json().then(data => {
                    throw new Error(data.message || "Validation failed");
                });
            }
            
            if (response.status === 404) {
                throw new Error("The patient or bed could not be found");
            }
            
            if (response.status === 409) {
                throw new Error("This bed is already assigned to another patient");
            }
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('New bed assignment created:', data);
            
            // Close the modal
            closeBedAssignmentModal();
            
            // Show success message
            showMessage(`Patient successfully assigned to bed #${bedId}`, 'success');
            
            // Refresh data
            loadBeds();
            loadPatients();
        })
        .catch(error => {
            console.error('Error creating bed assignment:', error);
            showAssignmentError('Failed to create bed assignment: ' + error.message);
        })
        .finally(() => {
            // Restore the button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            
            // Remove loading overlay if still present
            if (loadingEl.parentNode) {
                loadingEl.parentNode.removeChild(loadingEl);
            }
        });
    }

    // Function to show assignment error message
    function showAssignmentError(message) {
        const errorElement = document.getElementById('assignmentErrorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            console.error('Error element not found, message was:', message);
            // Fallback to alert if element not found
            alert('Error: ' + message);
        }
    }

    // --- Transfer Patient Modal Logic ---
    window.showTransferModal = async function() {
        document.getElementById('transferModal').style.display = 'block';
        await populateTransferPatientSelect();
        // Clear bed/ward fields
        document.getElementById('currentBedNumber').value = '';
        document.getElementById('transferWardSelect').value = '';
        document.getElementById('transferBedSelect').innerHTML = '<option value="">Select Bed</option>';
        // Hide reason textbox if present
        const reasonBox = document.getElementById('transferReason');
        if (reasonBox) reasonBox.parentElement.style.display = 'none';
    };

    // Fetch and populate patients with a current bed assignment
    async function populateTransferPatientSelect() {
        const select = document.getElementById('transferPatientSelect');
        select.innerHTML = '<option value="">Select Patient</option>';
        try {
            const [patientsRes, assignmentsRes] = await Promise.all([
                fetch('http://localhost:8080/api/patients'),
                fetch('http://localhost:8080/api/beds/assignments')
            ]);
            if (!patientsRes.ok || !assignmentsRes.ok) throw new Error('Failed to fetch patient or assignment data');
            const patients = await patientsRes.json();
            const assignments = await assignmentsRes.json();
            // Filter assignments to only current (not discharged)
            const currentAssignments = assignments.filter(a => a.status === 'current' && !a.dischargeDate);
            // Map patientId => assignment
            const assignmentMap = {};
            currentAssignments.forEach(a => { assignmentMap[a.patientID] = a; });
            // Only include patients with a current assignment
            const admittedPatients = patients.filter(p => assignmentMap[p.patient_id]);
            admittedPatients.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.patient_id;
                opt.textContent = `${p.full_name} (Bed #${assignmentMap[p.patient_id].bedID})`;
                select.appendChild(opt);
            });
        } catch (err) {
            select.innerHTML = '<option value="">Error loading patients</option>';
            showMessage('Could not load admitted patients for transfer', 'error');
        }
    }

    // When patient is selected, show bed/admission info and enable transfer
    const transferPatientSelect = document.getElementById('transferPatientSelect');
    if (transferPatientSelect) {
        transferPatientSelect.addEventListener('change', async function() {
            const patientId = this.value;
            if (!patientId) return;
            // Fetch assignments for this patient
            try {
                const res = await fetch('http://localhost:8080/api/beds/assignments');
                if (!res.ok) throw new Error('Failed to fetch assignments');
                const assignments = await res.json();
                const assignment = assignments.find(a => a.patientID == patientId && a.status === 'current' && !a.dischargeDate);
                if (assignment) {
                    document.getElementById('currentBedNumber').value = assignment.bedID;
                    document.getElementById('transferWardSelect').value = assignment.bedType ? assignment.bedType.toLowerCase() : '';
                } else {
                    document.getElementById('currentBedNumber').value = '';
                }
            } catch (err) {
                document.getElementById('currentBedNumber').value = '';
            }
        });
    }

    // When ward is selected, fetch available beds for that ward
    const transferWardSelect = document.getElementById('transferWardSelect');
    if (transferWardSelect) {
        transferWardSelect.addEventListener('change', async function() {
            const ward = this.value;
            const bedSelect = document.getElementById('transferBedSelect');
            bedSelect.innerHTML = '<option value="">Select Bed</option>';
            if (!ward) return;
            try {
                const res = await fetch('http://localhost:8080/api/beds/inventory');
                if (!res.ok) throw new Error('Failed to fetch beds');
                const beds = await res.json();
                // Only available beds in selected ward
                const availableBeds = beds.filter(b => b.status === 'available' && b.bedType.toLowerCase() === ward);
                availableBeds.forEach(bed => {
                    const opt = document.createElement('option');
                    opt.value = bed.bedID;
                    opt.textContent = `Bed #${bed.bedID} - ${bed.bedType}`;
                    bedSelect.appendChild(opt);
                });
            } catch (err) {
                bedSelect.innerHTML = '<option value="">No beds available</option>';
            }
        });
    }

    // On transfer form submit, call transferBed
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            // Add fromBedId from currentBedNumber
            formData.append('fromBedId', document.getElementById('currentBedNumber').value);
            formData.delete('reason'); // Remove reason if present
            const transferData = {
                patientId: parseInt(formData.get('patientId')),
                fromBedId: parseInt(formData.get('fromBedId')),
                toBedId: parseInt(formData.get('toBedId'))
            };
            // Validate
            if (!transferData.patientId || !transferData.fromBedId || !transferData.toBedId) {
                showMessage('Please fill in all required fields', 'error');
                return;
            }
            try {
                showMessage('Transferring patient...', 'info');
                // Use DOCTOR endpoint for transfer (since /api/staff/transfer-bed does not exist)
                const response = await fetch('http://localhost:8080/api/doctor/transfer-bed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transferData)
                });
                if (!response.ok) {
                    const err = await response.json();
                    showMessage(err.message || 'Transfer failed', 'error');
                    return;
                }
                showMessage('Patient transferred successfully', 'success');
                document.getElementById('transferModal').style.display = 'none';
                // Refresh bed management section (reload data)
                if (typeof loadBedManagementSection === 'function') {
                    loadBedManagementSection();
                } else {
                    // fallback: reload page
                    location.reload();
                }
            } catch (error) {
                showMessage('Error transferring patient', 'error');
            }
        });
    }
});