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

    // Global variables
    let staffId = 1; // This would typically come from authentication

    // Initialize dashboard
    fetchStaffProfile();
    
    // Event listeners for tab changes
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'patient-management') {
                fetchPatients();
            } else if (tabId === 'bed-status') {
                fetchBeds();
            } else if (tabId === 'appointments') {
                fetchAppointments();
            }
        });
    });

    // Event listeners for filter controls
    document.getElementById('wardFilter')?.addEventListener('change', function() {
        fetchBeds(this.value, document.getElementById('statusFilter').value);
    });

    document.getElementById('statusFilter')?.addEventListener('change', function() {
        fetchBeds(document.getElementById('wardFilter').value, this.value);
    });

    document.getElementById('doctorFilter')?.addEventListener('change', function() {
        fetchAppointments(this.value, document.getElementById('departmentFilter').value, document.getElementById('dateFilter').value);
    });

    document.getElementById('departmentFilter')?.addEventListener('change', function() {
        fetchAppointments(document.getElementById('doctorFilter').value, this.value, document.getElementById('dateFilter').value);
    });

    document.getElementById('dateFilter')?.addEventListener('change', function() {
        fetchAppointments(document.getElementById('doctorFilter').value, document.getElementById('departmentFilter').value, this.value);
    });

    // Form submission handlers
    document.getElementById('patientRegistrationForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        registerPatient(this);
    });

    document.getElementById('dischargeForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        dischargePatient(this);
    });

    document.getElementById('transferForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        transferPatient(this);
    });

    document.getElementById('profileForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        updateStaffProfile(this);
    });

    // Modal close handlers
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Patient Management Functions
    async function fetchPatients() {
        try {
            // Start with loading state
            const patientsContainer = document.getElementById('patientsList');
            patientsContainer.innerHTML = '<div class="loading">Loading patients...</div>';
            
            // Add retry logic
            let retries = 0;
            const maxRetries = 3;
            
            while (retries < maxRetries) {
                try {
                    const response = await fetch('http://localhost:8080/api/staff/patients');
                    if (response.ok) {
                        const patients = await response.json();
                        cachedPatients = patients; // Cache the patients data
                        renderPatients(patients);
                        return; // Success, exit the function
                    } else {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`Attempt ${retries + 1} failed:`, error);
                    retries++;
                    
                    if (retries >= maxRetries) {
                        // Show error and retry button after all retries fail
                        patientsContainer.innerHTML = `
                            <div class="error">
                                <p>Failed to load patients: ${error.message}</p>
                                <button class="refresh-btn" onclick="fetchPatients()">Try Again</button>
                            </div>
                        `;
                        break;
                    }
                    
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
        }
    }

    function renderPatients(patients, searchTerm = '') {
        const patientsContainer = document.getElementById('patientsList');
        patientsContainer.innerHTML = '';
        
        // Filter patients based on search term
        const filteredPatients = patients.filter(patient => 
            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            patient.id.toString().includes(searchTerm) ||
            (patient.doctor && patient.doctor.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        if (filteredPatients.length === 0) {
            patientsContainer.innerHTML = '<div class="no-data">No patients found matching your search criteria</div>';
            return;
        }
        
        filteredPatients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            patientCard.setAttribute('data-patient-id', patient.id);
            
            // Define action buttons based on patient status
            let actionButtons = '';
            
            if (patient.status === 'admitted') {
                // For admitted patients, show discharge and transfer buttons
                actionButtons = `
                    <button class="btn-action discharge-btn" onclick="showDischargeModal(${patient.id})">
                        <i class="fas fa-sign-out-alt"></i> Discharge
                    </button>
                    <button class="btn-action transfer-btn" onclick="showTransferModal(${patient.id})">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                `;
            } else if (patient.status === 'bed not assigned') {
                // For patients with completed appointments but no bed, show allocate bed button
                actionButtons = `
                    <button class="btn-action allocate-btn" onclick="showBedAllocationModal(${patient.id}, '${patient.name}')">
                        <i class="fas fa-bed"></i> Assign Bed
                    </button>
                `;
            }
            
            // For all patient cards, include patient info
            patientCard.innerHTML = `
                <div class="patient-info">
                    <h3>${patient.name}</h3>
                    <div class="patient-details">
                        <p><strong>ID:</strong> ${patient.id}</p>
                        <p><strong>Contact:</strong> ${patient.contact}</p>
                        <p><strong>Gender:</strong> ${patient.gender}</p>
                        <p><strong>Doctor:</strong> ${patient.doctor || 'Not assigned'}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${patient.status.replace(/\s+/g, '-')}">${patient.status}</span></p>
                        ${patient.bed ? `<p><strong>Bed:</strong> ${patient.bed}</p>` : ''}
                        ${patient.admissionDate ? `<p><strong>Admitted:</strong> ${patient.admissionDate}</p>` : ''}
                    </div>
                    <div class="patient-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;
            
            patientsContainer.appendChild(patientCard);
        });
    }

    // Bed Management Functions
    async function fetchBedStats() {
        try {
            const response = await fetch('http://localhost:8080/api/staff/stats');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const stats = await response.json();
            
            document.getElementById('totalBeds').textContent = stats.totalBeds;
            document.getElementById('availableBeds').textContent = stats.availableBeds;
            document.getElementById('occupiedBeds').textContent = stats.occupiedBeds;
            document.getElementById('maintenanceBeds').textContent = stats.maintenanceBeds;
        } catch (error) {
            console.error('Error fetching bed stats:', error);
        }
    }

    async function fetchBeds(wardFilter = 'all', statusFilter = 'all') {
        try {
            const bedGrid = document.getElementById('bedGrid');
            bedGrid.innerHTML = '<p class="loading">Loading beds...</p>';

            // Update stats first
            await fetchBedStats();

            const queryParams = new URLSearchParams();
            if (wardFilter !== 'all') queryParams.append('ward', wardFilter);
            if (statusFilter !== 'all') queryParams.append('status', statusFilter);

            // Try up to 3 times
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const response = await fetch(`http://localhost:8080/api/staff/beds?${queryParams}`);
                    
                    if (response.ok) {
                        const beds = await response.json();
                        renderBeds(beds);
                        return; // Success, exit the function
                    }
                    
                    console.log(`Attempt ${attempt + 1} failed with status: ${response.status}`);
                    
                    // If we've made our last attempt, throw an error
                    if (attempt === 2) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    
                    // Wait before trying again (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                } catch (retryError) {
                    console.error(`Retry attempt ${attempt + 1} error:`, retryError);
                    
                    // If this is the last attempt, re-throw the error
                    if (attempt === 2) {
                        throw retryError;
                    }
                    
                    // Wait before trying again (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                }
            }
        } catch (error) {
            console.error('Error fetching beds:', error);
            document.getElementById('bedGrid').innerHTML = 
                `<p class="error">Error loading beds: ${error.message}</p>
                 <button onclick="fetchBeds('${wardFilter}', '${statusFilter}')" class="refresh-btn">Try Again</button>`;
        }
    }

    function renderBeds(beds) {
        const bedGrid = document.getElementById('bedGrid');
        bedGrid.innerHTML = '';

        if (beds.length === 0) {
            bedGrid.innerHTML = '<p class="no-data">No beds found matching the criteria</p>';
            return;
        }

        beds.forEach(bed => {
            const bedCard = document.createElement('div');
            bedCard.className = `bed-card ${bed.status}`;
            bedCard.innerHTML = `
                <h3>Bed ${bed.number}</h3>
                <p><strong>Ward:</strong> ${bed.ward}</p>
                <span class="status-badge ${bed.status}">${bed.status}</span>
                ${bed.patient ? `<p><strong>Patient:</strong> ${bed.patient}</p>` : ''}
                ${bed.status === 'available' ? `
                    <button class="btn-primary" onclick="showPatientRegistrationModal('${bed.id}')">
                        <i class="fas fa-user-plus"></i> Allocate
                    </button>
                ` : ''}
            `;
            bedGrid.appendChild(bedCard);
        });
    }

    // Appointment Management Functions
    async function fetchAppointments(doctorFilter = 'all', departmentFilter = 'all', dateFilter = '') {
        try {
            const appointmentsGrid = document.getElementById('appointmentsGrid');
            appointmentsGrid.innerHTML = '<p class="loading">Loading appointments...</p>';

            const queryParams = new URLSearchParams();
            if (doctorFilter !== 'all') queryParams.append('doctor', doctorFilter);
            if (departmentFilter !== 'all') queryParams.append('department', departmentFilter);
            if (dateFilter) queryParams.append('date', dateFilter);

            // Try up to 3 times
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const response = await fetch(`http://localhost:8080/api/staff/appointments?${queryParams}`);
                    
                    if (response.ok) {
                        const appointments = await response.json();
                        renderAppointments(appointments);
                        
                        // Also populate the doctor filter if needed
                        if (!document.getElementById('doctorFilter').hasChildNodes()) {
                            await populateDoctorFilter();
                        }
                        // Also populate the department filter if needed
                        if (!document.getElementById('departmentFilter').hasChildNodes()) {
                            await populateDepartmentFilter();
                        }
                        return; // Success, exit the function
                    }
                    
                    console.log(`Attempt ${attempt + 1} failed with status: ${response.status}`);
                    
                    // If we've made our last attempt, throw an error
                    if (attempt === 2) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    
                    // Wait before trying again (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                } catch (retryError) {
                    console.error(`Retry attempt ${attempt + 1} error:`, retryError);
                    
                    // If this is the last attempt, re-throw the error
                    if (attempt === 2) {
                        throw retryError;
                    }
                    
                    // Wait before trying again (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                }
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            document.getElementById('appointmentsGrid').innerHTML = 
                `<p class="error">Error loading appointments: ${error.message}</p>
                 <button onclick="fetchAppointments('${doctorFilter}', '${departmentFilter}', '${dateFilter}')" class="refresh-btn">Try Again</button>`;
        }
    }

    function renderAppointments(appointments) {
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        appointmentsGrid.innerHTML = '';

        if (appointments.length === 0) {
            appointmentsGrid.innerHTML = '<p class="no-data">No appointments found</p>';
            return;
        }

        appointments.forEach(apt => {
            const appointmentCard = document.createElement('div');
            appointmentCard.className = 'appointment-card';
            appointmentCard.innerHTML = `
                <div class="appointment-time">${apt.time}</div>
                <h3>${apt.patient}</h3>
                <p><strong>Doctor:</strong> ${apt.doctor}</p>
                <p><strong>Department:</strong> ${apt.department}</p>
                <p><strong>Date:</strong> ${apt.date}</p>
                <span class="status-badge ${apt.status}">${apt.status}</span>
                ${apt.status === 'scheduled' ? `
                    <button class="btn-primary" onclick="checkInPatient(${apt.id})">
                        <i class="fas fa-check"></i> Check In
                    </button>
                ` : ''}
            `;
            appointmentsGrid.appendChild(appointmentCard);
        });
    }

    // Profile Management Functions
    async function fetchStaffProfile() {
        try {
            const response = await fetch(`http://localhost:8080/api/staff/${staffId}/profile`);
            
            // For now, just use static data if the API fails
            if (!response.ok) {
                console.warn('Using static staff profile data');
                // Use static data
                document.getElementById('staffName').textContent = 'John Smith';
                document.getElementById('staffRole').textContent = 'Senior Nurse';
                
                // Also populate the profile form
                document.getElementById('fullName').value = 'John Smith';
                document.getElementById('employeeId').value = '1001';
                document.getElementById('email').value = 'john.smith@hospital.com';
                document.getElementById('phone').value = '123-456-7890';
                document.getElementById('department').value = 'Emergency';
                document.getElementById('role').value = 'Senior Nurse';
                return;
            }
            
            const staffProfile = await response.json();
            
            // Update the sidebar
            document.getElementById('staffName').textContent = staffProfile.fullName;
            document.getElementById('staffRole').textContent = staffProfile.role || staffProfile.designation;
            
            // Also populate the profile form
            document.getElementById('fullName').value = staffProfile.fullName;
            document.getElementById('employeeId').value = staffProfile.employeeId;
            document.getElementById('email').value = staffProfile.email;
            document.getElementById('phone').value = staffProfile.contactNumber;
            document.getElementById('department').value = staffProfile.department;
            document.getElementById('role').value = staffProfile.role || staffProfile.designation;
        } catch (error) {
            console.error('Error fetching staff profile:', error);
            // Use static data as fallback
            document.getElementById('staffName').textContent = 'John Smith';
            document.getElementById('staffRole').textContent = 'Senior Nurse';
        }
    }

    async function updateStaffProfile(form) {
        try {
            const email = form.email.value;
            const phone = form.phone.value;
            
            const response = await fetch(`http://localhost:8080/api/staff/${staffId}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    contactNumber: phone
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            alert('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(`Error updating profile: ${error.message}`);
        }
    }

    // Patient Registration
    async function registerPatient(form) {
        try {
            const formData = new FormData(form);
            const patientData = {
                patientName: formData.get('patientName'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender'),
                contact: formData.get('contact'),
                email: formData.get('contact') + '@placeholder.com', // Generate placeholder email
                ward: formData.get('ward'),
                bedNumber: parseInt(formData.get('bedNumber')),
                doctorId: parseInt(formData.get('doctor'))
            };
            
            const response = await fetch('http://localhost:8080/api/staff/patient/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(patientData),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                alert('Patient registered successfully');
                document.getElementById('patientRegistrationModal').style.display = 'none';
                // Refresh patient list and bed status
                fetchPatients();
                fetchBeds();
                form.reset();
            } else {
                alert(`Registration failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Error registering patient:', error);
            alert(`Error registering patient: ${error.message}`);
        }
    }

    // Patient Discharge
    async function dischargePatient(form) {
        try {
            const formData = new FormData(form);
            const dischargeData = {
                patientId: parseInt(formData.get('patientId')),
                dischargeDate: formData.get('dischargeDate'),
                dischargeNotes: formData.get('dischargeNotes')
            };
            
            const response = await fetch('http://localhost:8080/api/staff/patient/discharge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dischargeData),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                alert('Patient discharged successfully');
                document.getElementById('dischargeModal').style.display = 'none';
                // Refresh patient list and bed status
                fetchPatients();
                fetchBeds();
                form.reset();
            } else {
                alert(`Discharge failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Error discharging patient:', error);
            alert(`Error discharging patient: ${error.message}`);
        }
    }

    // Patient Transfer
    async function transferPatient(form) {
        try {
            const formData = new FormData(form);
            const transferData = {
                patientId: parseInt(formData.get('patientId')),
                newBedId: parseInt(formData.get('newBed')),
                reason: formData.get('reason')
            };
            
            const response = await fetch('http://localhost:8080/api/staff/patient/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transferData),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                alert('Patient transferred successfully');
                document.getElementById('transferModal').style.display = 'none';
                // Refresh patient list and bed status
                fetchPatients();
                fetchBeds();
                form.reset();
            } else {
                alert(`Transfer failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Error transferring patient:', error);
            alert(`Error transferring patient: ${error.message}`);
        }
    }

    // Helper Functions
    async function populateDoctorFilter() {
        try {
            const response = await fetch('http://localhost:8080/api/doctors');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const doctors = await response.json();
            const doctorFilter = document.getElementById('doctorFilter');
            
            // Add "All Doctors" option
            doctorFilter.innerHTML = '<option value="all">All Doctors</option>';
            
            // Add each doctor
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.doctor_id || doctor.doctorID;
                option.textContent = doctor.full_name || doctor.fullName;
                doctorFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching doctors for filter:', error);
        }
    }

    async function populateDepartmentFilter() {
        try {
            const response = await fetch('http://localhost:8080/api/doctors');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const doctors = await response.json();
            const departmentFilter = document.getElementById('departmentFilter');
            
            // Add "All Departments" option
            departmentFilter.innerHTML = '<option value="all">All Departments</option>';
            
            // Add unique departments
            const departments = new Set(doctors.map(doctor => doctor.department));
            departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department;
                option.textContent = department;
                departmentFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching departments for filter:', error);
        }
    }

    // Modal Functions
    window.showPatientRegistrationModal = async function(bedId = '') {
        try {
        const modal = document.getElementById('patientRegistrationModal');
        const bedSelect = document.getElementById('availableBedSelect');
            
            // Fetch available beds
            const response = await fetch('http://localhost:8080/api/staff/beds?status=available');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const beds = await response.json();
        
        // Populate available beds
        bedSelect.innerHTML = '';
            beds.forEach(bed => {
            const option = document.createElement('option');
                option.value = bed.id;
            option.textContent = `Bed ${bed.number} (${bed.ward})`;
                if (bed.id.toString() === bedId) option.selected = true;
            bedSelect.appendChild(option);
        });

            // Fetch doctors for dropdown
            const doctorsResponse = await fetch('http://localhost:8080/api/doctors');
            if (!doctorsResponse.ok) {
                throw new Error(`HTTP error! Status: ${doctorsResponse.status}`);
            }
            const doctors = await doctorsResponse.json();

        // Populate doctors
        const doctorSelect = modal.querySelector('select[name="doctor"]');
        doctorSelect.innerHTML = '';
        doctors.forEach(doc => {
            const option = document.createElement('option');
                option.value = doc.doctor_id || doc.doctorID;
                option.textContent = `${doc.full_name || doc.fullName} (${doc.department})`;
            doctorSelect.appendChild(option);
        });

        modal.style.display = 'block';
        } catch (error) {
            console.error('Error preparing patient registration modal:', error);
            alert(`Error preparing registration form: ${error.message}`);
        }
    };

    window.showDischargeModal = async function(patientId) {
        try {
            // Get patient information
            const patientCard = document.querySelector(`.patient-card[data-patient-id="${patientId}"]`);
            if (!patientCard) {
                throw new Error('Patient card not found');
            }
            
            const patientName = patientCard.querySelector('h3').textContent;
            
            // Create the modal if it doesn't exist
            if (!document.getElementById('dischargeModal')) {
                const modalHTML = `
                    <div id="dischargeModal" class="modal">
                        <div class="modal-content">
                            <span class="close" onclick="document.getElementById('dischargeModal').style.display='none'">&times;</span>
                            <h2>Discharge Patient</h2>
                            <form id="dischargeForm">
                                <input type="hidden" id="dischargePatientId" name="patientId" value="">
                                <div class="form-group">
                                    <label>Patient Name</label>
                                    <input type="text" id="dischargePatientName" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Discharge Date</label>
                                    <input type="date" id="dischargeDate" required>
                                </div>
                                <div class="form-group">
                                    <label>Notes</label>
                                    <textarea id="dischargeNotes" rows="3"></textarea>
                                </div>
                                <button type="submit" class="btn-primary">Discharge Patient</button>
                            </form>
                        </div>
                    </div>
                `;
                
                // Append modal to body
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer.firstElementChild);
                
                // Add event listener for form submission
                document.getElementById('dischargeForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const patientId = document.getElementById('dischargePatientId').value;
                    const dischargeDate = document.getElementById('dischargeDate').value;
                    
                    try {
                        const response = await fetch('http://localhost:8080/api/staff/patient/discharge', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                patientId: parseInt(patientId),
                                dischargeDate: dischargeDate,
                                dischargeNotes: document.getElementById('dischargeNotes').value
                            }),
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        
                        // Success message
                        alert('Patient discharged successfully');
                        
                        // Close modal and refresh data
                        document.getElementById('dischargeModal').style.display = 'none';
                        fetchPatients();
                        fetchBeds();
                    } catch (error) {
                        console.error('Error discharging patient:', error);
                        alert(`Error discharging patient: ${error.message}`);
                    }
                });
            }
            
            // Fill in patient information
            document.getElementById('dischargePatientId').value = patientId;
            document.getElementById('dischargePatientName').value = patientName;
            
            // Set default discharge date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dischargeDate').value = today;
            
            // Reset notes
            document.getElementById('dischargeNotes').value = '';
            
            // Show modal
            document.getElementById('dischargeModal').style.display = 'block';
        } catch (error) {
            console.error('Error showing discharge modal:', error);
            alert(`Error showing discharge modal: ${error.message}`);
        }
    };

    window.showTransferModal = async function(patientId) {
        try {
            // Get patient information
            const patientCard = document.querySelector(`.patient-card[data-patient-id="${patientId}"]`);
            if (!patientCard) {
                throw new Error('Patient card not found');
            }
            
            const patientName = patientCard.querySelector('h3').textContent;
            
            // Create the modal if it doesn't exist
            if (!document.getElementById('transferModal')) {
                const modalHTML = `
                    <div id="transferModal" class="modal">
                        <div class="modal-content">
                            <span class="close" onclick="document.getElementById('transferModal').style.display='none'">&times;</span>
                            <h2>Transfer Patient</h2>
                            <form id="transferForm">
                                <input type="hidden" id="transferPatientId" name="patientId" value="">
                                <div class="form-group">
                                    <label>Patient Name</label>
                                    <input type="text" id="transferPatientName" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Ward</label>
                                    <select id="transferWard" required>
                                        <option value="">Select Ward</option>
                                        <option value="general">General Ward</option>
                                        <option value="emergency">Emergency</option>
                                        <option value="icu">ICU</option>
                                        <option value="pediatric">Pediatric</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>New Bed</label>
                                    <select id="transferBed" required>
                                        <option value="">Select Ward First</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Reason for Transfer</label>
                                    <textarea id="transferReason" rows="3"></textarea>
                                </div>
                                <button type="submit" class="btn-primary">Transfer Patient</button>
                            </form>
                        </div>
                    </div>
                `;
                
                // Append modal to body
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer.firstElementChild);
                
                // Add event listener for ward selection
                document.getElementById('transferWard').addEventListener('change', async function() {
                    const wardValue = this.value;
                    if (!wardValue) {
                        return;
                    }
                    
                    try {
                        // Fetch available beds for the selected ward
                        const response = await fetch(`http://localhost:8080/api/staff/beds?ward=${wardValue}&status=available`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        
                        const beds = await response.json();
                        const bedSelect = document.getElementById('transferBed');
                        
                        // Clear existing options
                        bedSelect.innerHTML = '<option value="">Select Bed</option>';
                        
                        // Add beds to select
                        beds.forEach(bed => {
                            const option = document.createElement('option');
                            option.value = bed.id;
                            option.textContent = `Bed ${bed.number} (${bed.ward})`;
                            bedSelect.appendChild(option);
                        });
                    } catch (error) {
                        console.error('Error loading beds:', error);
                        alert(`Error loading beds: ${error.message}`);
                    }
                });
                
                // Add event listener for form submission
                document.getElementById('transferForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const patientId = document.getElementById('transferPatientId').value;
                    const newBedId = document.getElementById('transferBed').value;
                    
                    if (!newBedId) {
                        alert('Please select a bed');
                        return;
                    }
                    
                    try {
                        const response = await fetch('http://localhost:8080/api/staff/patient/transfer', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                patientId: parseInt(patientId),
                                newBedId: parseInt(newBedId),
                                reason: document.getElementById('transferReason').value
                            }),
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        
                        // Success message
                        alert('Patient transferred successfully');
                        
                        // Close modal and refresh data
                        document.getElementById('transferModal').style.display = 'none';
                        fetchPatients();
                        fetchBeds();
                    } catch (error) {
                        console.error('Error transferring patient:', error);
                        alert(`Error transferring patient: ${error.message}`);
                    }
                });
            }
            
            // Fill in patient information
            document.getElementById('transferPatientId').value = patientId;
            document.getElementById('transferPatientName').value = patientName;
            
            // Reset form
            document.getElementById('transferWard').value = '';
            document.getElementById('transferBed').innerHTML = '<option value="">Select Ward First</option>';
            document.getElementById('transferReason').value = '';
            
            // Show modal
            document.getElementById('transferModal').style.display = 'block';
        } catch (error) {
            console.error('Error showing transfer modal:', error);
            alert(`Error showing transfer modal: ${error.message}`);
        }
    };

    window.showEmergencyAllotmentModal = function() {
        const modal = document.getElementById('emergencyAllotmentModal');
        modal.style.display = 'block';
    };

    window.handleLogout = function() {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = 'index.html';
        }
    };

    window.checkInPatient = async function(appointmentId) {
        try {
            const response = await fetch(`http://localhost:8080/api/appointments/${appointmentId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'checked-in'
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            alert('Patient checked in successfully');
            // Refresh appointments
            fetchAppointments();
        } catch (error) {
            console.error('Error checking in patient:', error);
            alert(`Error checking in patient: ${error.message}`);
        }
    };

    // Add function to show bed allocation modal for patients with "bed not assigned" status
    window.showBedAllocationModal = async function(patientId, patientName) {
        try {
            // Create the modal if it doesn't exist
            if (!document.getElementById('bedAllocationModal')) {
                const modalHTML = `
                    <div id="bedAllocationModal" class="modal">
                        <div class="modal-content">
                            <span class="close" onclick="document.getElementById('bedAllocationModal').style.display='none'">&times;</span>
                            <h2>Assign Bed for Patient</h2>
                            <form id="bedAllocationForm">
                                <input type="hidden" id="bedAllocationPatientId" name="patientId" value="">
                                <div class="form-group">
                                    <label>Patient Name</label>
                                    <input type="text" id="bedAllocationPatientName" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Ward</label>
                                    <select id="bedAllocationWard" required>
                                        <option value="">Select Ward</option>
                                        <option value="general">General Ward</option>
                                        <option value="emergency">Emergency</option>
                                        <option value="icu">ICU</option>
                                        <option value="pediatric">Pediatric</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Bed</label>
                                    <select id="bedAllocationBed" required>
                                        <option value="">Select Ward First</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn-primary">Assign Bed</button>
                            </form>
                        </div>
                    </div>
                `;
                
                // Append modal to body
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer.firstElementChild);
                
                // Add event listener for ward selection
                document.getElementById('bedAllocationWard').addEventListener('change', async function() {
                    const wardValue = this.value;
                    if (!wardValue) {
                        return;
                    }
                    
                    try {
                        // Fetch available beds for the selected ward
                        const response = await fetch(`http://localhost:8080/api/staff/beds?ward=${wardValue}&status=available`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        
                        const beds = await response.json();
                        const bedSelect = document.getElementById('bedAllocationBed');
                        
                        // Clear existing options
                        bedSelect.innerHTML = '<option value="">Select Bed</option>';
                        
                        // Add beds to select
                        beds.forEach(bed => {
                            const option = document.createElement('option');
                            option.value = bed.id;
                            option.textContent = `Bed ${bed.number} (${bed.ward})`;
                            bedSelect.appendChild(option);
                        });
                    } catch (error) {
                        console.error('Error loading beds:', error);
                        alert(`Error loading beds: ${error.message}`);
                    }
                });
                
                // Add event listener for form submission
                document.getElementById('bedAllocationForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const patientId = document.getElementById('bedAllocationPatientId').value;
                    const bedId = document.getElementById('bedAllocationBed').value;
                    
                    if (!bedId) {
                        alert('Please select a bed');
                        return;
                    }
                    
                    try {
                        // Create bed assignment
                        const requestData = {
                            patientId: parseInt(patientId),
                            bedId: parseInt(bedId)
                        };
                        
                        console.log('Sending bed assignment request:', requestData);
                        
                        const response = await fetch('http://localhost:8080/api/staff/patient/assign-bed', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestData)
                        });
                        
                        const responseText = await response.text();
                        console.log('Response text:', responseText);
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}, Details: ${responseText}`);
                        }
                        
                        let result;
                        try {
                            result = JSON.parse(responseText);
                        } catch (e) {
                            console.warn('Response is not valid JSON:', responseText);
                            // Continue with success path even if response is not JSON
                        }
                        
                        // Success message
                        alert('Bed assigned successfully');
                        
                        // Close modal and refresh data
                        document.getElementById('bedAllocationModal').style.display = 'none';
                        fetchPatients();
                        fetchBeds();
                    } catch (error) {
                        console.error('Error assigning bed:', error);
                        alert(`Error assigning bed: ${error.message}`);
                    }
                });
            }
            
            // Fill in patient information
            document.getElementById('bedAllocationPatientId').value = patientId;
            document.getElementById('bedAllocationPatientName').value = patientName;
            
            // Reset form
            document.getElementById('bedAllocationWard').value = '';
            document.getElementById('bedAllocationBed').innerHTML = '<option value="">Select Ward First</option>';
            
            // Show modal
            document.getElementById('bedAllocationModal').style.display = 'block';
        } catch (error) {
            console.error('Error showing bed allocation modal:', error);
            alert(`Error showing bed allocation modal: ${error.message}`);
        }
    };

    // Add patient search functionality
    let cachedPatients = [];
    document.addEventListener('DOMContentLoaded', function() {
        const patientSearch = document.getElementById('patientSearch');
        if (patientSearch) {
            patientSearch.addEventListener('input', function() {
                const searchTerm = this.value.trim();
                if (cachedPatients.length > 0) {
                    renderPatients(cachedPatients, searchTerm);
                }
            });
        }
    });

    // Initial data load for active tab
    const activeTab = document.querySelector('.tab-content.active').id;
    if (activeTab === 'patient-management') {
        fetchPatients();
    } else if (activeTab === 'bed-status') {
        fetchBeds();
    } else if (activeTab === 'appointments') {
        fetchAppointments();
    }
}); 