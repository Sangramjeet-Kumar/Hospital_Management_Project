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
        // Redirect to login page
        window.location.href = 'simple_login.html';
        return;
    }

    // Initialize dashboard
    fetchStaffProfile();
    fetchPatients();
    
    // Event listeners for tab changes
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'patient-management') {
                fetchPatients();
            } else if (tabId === 'bed-status') {
                fetchBedStats();
                fetchBeds();
            } else if (tabId === 'appointments') {
                populateDoctorFilter();
                populateDepartmentFilter();
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

    // Handle logout
    window.handleLogout = function() {
        // Clear localStorage
        localStorage.removeItem('userData');
        // Redirect to login page
        window.location.href = 'simple_login.html';
    };

    // Patient Management
    let cachedPatients = null;
    
    async function fetchPatients() {
        try {
            const patientsList = document.getElementById('patientsList');
            patientsList.innerHTML = '<p class="loading">Loading patients...</p>';

            console.log('Fetching patients from API...');
            // Try up to 3 times
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const response = await fetch('http://localhost:8080/api/staff/patients');
                    console.log(`API response status: ${response.status}`);
                    
                    if (response.ok) {
                        const patients = await response.json();
                        console.log(`Successfully loaded ${patients.length} patients`);
                        cachedPatients = patients; // Cache the patients data
                        renderPatients(patients);
                        return; // Success, exit the function
                    }
                    
                    // If not ok, try to get more details about the error
                    let errorDetails = '';
                    try {
                        const errorText = await response.text();
                        errorDetails = `: ${errorText}`;
                    } catch (e) {
                        // If we can't get the error text, continue without it
                    }
                    
                    console.log(`Attempt ${attempt + 1} failed with status: ${response.status}${errorDetails}`);
                    
                    // If we've made our last attempt, throw an error
                    if (attempt === 2) {
                        throw new Error(`HTTP error! Status: ${response.status}${errorDetails}`);
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
            console.error('Error fetching patients:', error);
            document.getElementById('patientsList').innerHTML = 
                `<p class="error">Error loading patients: ${error.message}</p>
                 <button onclick="fetchPatients()" class="refresh-btn">Try Again</button>`;
        }
    }

    function renderPatients(patients, searchTerm = '') {
        const patientsList = document.getElementById('patientsList');
        patientsList.innerHTML = '';

        // Filter patients by search term if provided
        const filteredPatients = searchTerm 
            ? patients.filter(patient => 
                patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : patients;
        
        if (filteredPatients.length === 0) {
            patientsList.innerHTML = '<div class="no-data">No patients found matching your search.</div>';
            return;
        }
        
        filteredPatients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            patientCard.setAttribute('data-patient-id', patient.id);
            
            let actionButtons = '';
            
            // Add appropriate buttons based on status - only schedule appointment button
            if (patient.status === 'registered' || patient.status === 'new') {
                // New patients need appointment scheduling
                actionButtons = `
                    <button class="btn-action schedule-btn" onclick="showAppointmentModal(${patient.id})">
                        <i class="fas fa-calendar-plus"></i> Schedule Appointment
                    </button>
                `;
            }
            
            patientCard.innerHTML = `
                <div class="patient-info">
                    <h3>${patient.name}</h3>
                    <div class="patient-details">
                        <p><strong>ID:</strong> ${patient.id}</p>
                        <p><strong>Gender:</strong> ${patient.gender}</p>
                        <p><strong>Contact:</strong> ${patient.contact}</p>
                        <p><strong>Email:</strong> ${patient.email}</p>
                        <p><strong>Doctor:</strong> ${patient.doctor || 'Not assigned'}</p>
                        <p><strong>Bed:</strong> ${patient.bed > 0 ? patient.bed : 'Not assigned'}</p>
                        <p><strong>Status:</strong> ${patient.status}</p>
                        ${patient.admissionDate ? `<p><strong>Admitted:</strong> ${patient.admissionDate}</p>` : ''}
                    </div>
                </div>
                <div class="patient-actions">
                    ${actionButtons}
                </div>
            `;
            
            patientsList.appendChild(patientCard);
        });
        
        // Add search functionality
        const searchInput = document.getElementById('patientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                renderPatients(cachedPatients, this.value);
            });
        }
    }

    // Bed Status Management
    async function fetchBedStats() {
        try {
            const response = await fetch('http://localhost:8080/api/beds/stats');
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const stats = await response.json();
            
            // Update the stats cards
            document.getElementById('totalBeds').textContent = stats.total || 0;
            document.getElementById('availableBeds').textContent = stats.available || 0;
            document.getElementById('occupiedBeds').textContent = stats.occupied || 0;
            document.getElementById('maintenanceBeds').textContent = stats.maintenance || 0;
        } catch (error) {
            console.error('Error fetching bed stats:', error);
            // Show error message or use fallback data
        }
    }

    async function fetchBeds(wardFilter = 'all', statusFilter = 'all') {
        try {
            const bedGrid = document.getElementById('bedGrid');
            bedGrid.innerHTML = '<p class="loading">Loading beds...</p>';
            
            let url = 'http://localhost:8080/api/staff/beds';
            const queryParams = [];
            
            if (wardFilter && wardFilter !== 'all') {
                queryParams.push(`ward=${wardFilter}`);
            }
            
            if (statusFilter && statusFilter !== 'all') {
                queryParams.push(`status=${statusFilter}`);
            }
            
            if (queryParams.length > 0) {
                url += '?' + queryParams.join('&');
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const beds = await response.json();
            renderBeds(beds);
        } catch (error) {
            console.error('Error fetching beds:', error);
            document.getElementById('bedGrid').innerHTML = 
                `<p class="error">Error loading beds: ${error.message}</p>
                 <button onclick="fetchBeds()" class="refresh-btn">Try Again</button>`;
        }
    }

    function renderBeds(beds) {
        const bedGrid = document.getElementById('bedGrid');
        bedGrid.innerHTML = '';
        
        if (beds.length === 0) {
            bedGrid.innerHTML = '<div class="no-data">No beds match the selected filters.</div>';
            return;
        }
        
        beds.forEach(bed => {
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
                <div class="bed-id">Bed #${bed.bedId}</div>
                <div class="bed-status ${bed.status}">${bed.status}</div>
                ${bed.patientName ? `
                    <div class="bed-patient">
                        <span class="patient-name">${bed.patientName}</span>
                        <span class="patient-id">ID: ${bed.patientId}</span>
                        ${bed.admissionDate ? `<span class="admission-date">Since: ${bed.admissionDate}</span>` : ''}
                    </div>` : ''}
            `;
            
            bedGrid.appendChild(bedCard);
        });
    }

    // Appointments Management
    async function fetchAppointments(doctorFilter = 'all', departmentFilter = 'all', dateFilter = '') {
        try {
            const appointmentsGrid = document.getElementById('appointmentsGrid');
            appointmentsGrid.innerHTML = '<p class="loading">Loading appointments...</p>';
            
            let url = 'http://localhost:8080/api/staff/appointments';
            const queryParams = [];
            
            if (doctorFilter && doctorFilter !== 'all') {
                queryParams.push(`doctor=${doctorFilter}`);
            }
            
            if (departmentFilter && departmentFilter !== 'all') {
                queryParams.push(`department=${departmentFilter}`);
            }
            
            if (dateFilter) {
                queryParams.push(`date=${dateFilter}`);
            }
            
            if (queryParams.length > 0) {
                url += '?' + queryParams.join('&');
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const appointments = await response.json();
            renderAppointments(appointments);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            document.getElementById('appointmentsGrid').innerHTML = 
                `<p class="error">Error loading appointments: ${error.message}</p>
                 <button onclick="fetchAppointments()" class="refresh-btn">Try Again</button>`;
        }
    }

    function renderAppointments(appointments) {
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        appointmentsGrid.innerHTML = '';
        
        if (appointments.length === 0) {
            appointmentsGrid.innerHTML = '<div class="no-data">No appointments match the selected filters.</div>';
            return;
        }
        
        appointments.forEach(apt => {
            const appointmentCard = document.createElement('div');
            appointmentCard.className = `appointment-card ${apt.status}`;
            
            // Format time for display
            const timeDisplay = apt.time;
            
            // Format date for display
            const dateObj = new Date(apt.date);
            const dateDisplay = dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            appointmentCard.innerHTML = `
                <div class="appointment-header">
                    <div class="appointment-time">${timeDisplay}</div>
                    <div class="appointment-date">${dateDisplay}</div>
                    <div class="appointment-status ${apt.status}">${apt.status}</div>
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
                        <i class="fas fa-phone"></i> ${apt.contact}
                    </div>
                    ${apt.description ? `<div class="appointment-notes">
                        <i class="fas fa-sticky-note"></i> ${apt.description}
                    </div>` : ''}
                </div>
            `;
            
            appointmentsGrid.appendChild(appointmentCard);
        });
    }

    // Profile Management Functions
    async function fetchStaffProfile() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const staffId = userData.employeeId;
            
            if (!staffId) {
                throw new Error('No staff ID found in localStorage');
            }
            
            const response = await fetch(`http://localhost:8080/api/staff/${staffId}/profile`);
            
            // If the API fails, use the stored user data
            if (!response.ok) {
                console.warn('Using stored user data for profile');
                
                // Update the sidebar with stored data
                document.getElementById('staffName').textContent = userData.fullName || 'Staff User';
                document.getElementById('staffRole').textContent = userData.role || 'Staff';
                
                // Also populate the profile form with stored data
                document.getElementById('fullName').value = userData.fullName || '';
                document.getElementById('employeeId').value = userData.employeeId || '';
                document.getElementById('email').value = userData.email || '';
                document.getElementById('phone').value = userData.contactNumber || '';
                document.getElementById('department').value = userData.department || '';
                document.getElementById('role').value = userData.role || '';
                
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
            
            // Update localStorage with the latest profile data
            const updatedUserData = {
                ...userData,
                ...staffProfile
            };
            localStorage.setItem('userData', JSON.stringify(updatedUserData));
            
        } catch (error) {
            console.error('Error fetching staff profile:', error);
            
            // Use userData from localStorage as fallback
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            document.getElementById('staffName').textContent = userData.fullName || 'Staff User';
            document.getElementById('staffRole').textContent = userData.role || 'Staff';
        }
    }

    async function updateStaffProfile(form) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const staffId = userData.employeeId;
            
            if (!staffId) {
                throw new Error('No staff ID found in localStorage');
            }
            
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
            
            // Update localStorage with the updated profile data
            userData.email = email;
            userData.contactNumber = phone;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Show success message
            alert('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(`Error updating profile: ${error.message}`);
        }
    }

    // Populate filters for appointments
    async function populateDoctorFilter() {
        try {
            const response = await fetch('http://localhost:8080/api/doctors');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const doctors = await response.json();
            const doctorFilter = document.getElementById('doctorFilter');
            
            // Save current selection
            const currentValue = doctorFilter.value;
            
            // Clear existing options except the first one
            while (doctorFilter.options.length > 1) {
                doctorFilter.remove(1);
            }
            
            // Add doctor options
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.doctorID;
                option.textContent = doctor.fullName;
                doctorFilter.appendChild(option);
            });
            
            // Restore selection if possible
            if (currentValue && currentValue !== 'all') {
                doctorFilter.value = currentValue;
            }
        } catch (error) {
            console.error('Error populating doctor filter:', error);
        }
    }
    
    async function populateDepartmentFilter() {
        try {
            const response = await fetch('http://localhost:8080/api/doctors');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const doctors = await response.json();
            const departments = [...new Set(doctors.map(doctor => doctor.department))];
            const departmentFilter = document.getElementById('departmentFilter');
            
            // Save current selection
            const currentValue = departmentFilter.value;
            
            // Clear existing options except the first one
            while (departmentFilter.options.length > 1) {
                departmentFilter.remove(1);
            }
            
            // Add department options
            departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department;
                option.textContent = department;
                departmentFilter.appendChild(option);
            });
            
            // Restore selection if possible
            if (currentValue && currentValue !== 'all') {
                departmentFilter.value = currentValue;
            }
        } catch (error) {
            console.error('Error populating department filter:', error);
        }
    }

    // Initialize search functionality for patients
    document.getElementById('patientSearch')?.addEventListener('input', function() {
        if (cachedPatients) {
            renderPatients(cachedPatients, this.value);
        }
    });

    // Initialize default views
    fetchPatients();
}); 