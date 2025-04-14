document.addEventListener('DOMContentLoaded', function() {
    // Tab Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    console.log('DOMContentLoaded fired');

    // Get DOM elements
    const appointmentTabs = document.querySelectorAll('.tab-btn');
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const wardFilter = document.getElementById('wardFilter');
    const bedStatusFilter = document.getElementById('bedStatusFilter');
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    const bedGrid = document.getElementById('bedGrid');
    const profileForm = document.getElementById('profileForm');
    const assignBedModal = document.getElementById('assignBedModal');
    const assignBedForm = document.getElementById('assignBedForm');
    const updateStatusModal = document.getElementById('updateStatusModal');
    const updateStatusForm = document.getElementById('updateStatusForm');

    // Set today's date as default in date filter
    if (dateFilter) {
        dateFilter.valueAsDate = new Date();
    }

    // Debug localStorage data
    console.log('localStorage userData:', localStorage.getItem('userData'));
    console.log('localStorage employeeId:', localStorage.getItem('employeeId'));
    
    // Try parsing userData
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        console.log('Parsed userData:', userData);
    } catch (error) {
        console.error('Error parsing userData:', error);
    }

    // Get logged-in employee ID from localStorage (set during login)
    const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
    console.log('Resolved employeeId:', employeeId);
    
    if (!employeeId) {
        console.log('No employeeId found, redirecting to login');
        // Redirect to login if no employee ID
        window.location.href = 'simple_login.html';
        return;
    }

    // Load doctor profile on page load
    console.log('Attempting to fetch doctor profile with employeeId:', employeeId);
    fetchDoctorProfile(employeeId);

    // Navigation handling
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (link.classList.contains('logout-btn')) {
                handleLogout();
                return;
            }
            
            // Remove active class from all links and contents
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked link and corresponding content
            link.classList.add('active');
            const tabId = link.getAttribute('data-tab');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');

                // Load content based on tab
        switch(tabId) {
            case 'appointments':
                        loadAppointments('checked-in');
                break;
            case 'bed-management':
                loadBeds();
                        loadBedStatistics();
                        break;
                    case 'profile':
                        // Refresh profile data
                        fetchDoctorProfile(employeeId);
                break;
        }
            }
        });
    });

    // Appointment Tabs
    appointmentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            appointmentTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAppointments(tab.getAttribute('data-status'));
        });
    });

    // Filter Change Handlers
    if (dateFilter) {
        dateFilter.addEventListener('change', () => loadAppointments(getActiveAppointmentStatus()));
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadAppointments(getActiveAppointmentStatus()));
    }
    
    if (wardFilter) {
        wardFilter.addEventListener('change', loadBeds);
    }
    
    if (bedStatusFilter) {
        bedStatusFilter.addEventListener('change', loadBeds);
    }
            
    // Profile Form Submit
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const data = {
                contact_number: formData.get('contactNumber'),
                email: formData.get('email')
            };
            
            try {
                // Fix for potential colon issue - force to integer
                const cleanEmployeeId = parseInt(employeeId, 10);
                if (isNaN(cleanEmployeeId)) {
                    console.error('Invalid employeeId format:', employeeId);
                    showMessage('Invalid employee ID format', 'error');
                    return;
                }
                
                console.log(`Making API call to update profile for employeeId=${cleanEmployeeId}`, data);
                const response = await fetch(`http://localhost:8080/api/doctor/profile/update?employeeId=${cleanEmployeeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                console.log('Update profile response status:', response.status);
                
                if (response.ok) {
                    const responseText = await response.text();
                    console.log('Update profile response:', responseText);
                    
                    showMessage('Profile updated successfully', 'success');
                    // Refresh profile data to show the updates
                    fetchDoctorProfile(cleanEmployeeId);
                } else {
                    const errorText = await response.text();
                    console.error('Failed to update profile:', errorText);
                    throw new Error(errorText || 'Failed to update profile');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                showMessage(error.message || 'Failed to update profile', 'error');
            }
        });
    }
    
    // Assign Bed Form Submit
    if (assignBedForm) {
        assignBedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(assignBedForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // In a real app, this would be an API call to assign bed
                showMessage('Bed assigned successfully', 'success');
                closeModal(assignBedModal);
                loadBeds();
                loadBedStatistics();
            } catch (error) {
                showMessage('Failed to assign bed', 'error');
            }
        });
    }
    
    // Update Status Form Submit
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
            const formData = new FormData(updateStatusForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // In a real app, this would be an API call to update status
                showMessage('Appointment status updated successfully', 'success');
                closeModal(updateStatusModal);
                loadAppointments(getActiveAppointmentStatus());
            } catch (error) {
                showMessage('Failed to update appointment status', 'error');
            }
        });
    }

    // Ward selection change handler
    const wardSelect = document.getElementById('ward');
    if (wardSelect) {
        wardSelect.addEventListener('change', loadAvailableBeds);
    }

    // Initialize the dashboard
    loadAppointments('checked-in');
    
    // Helper Functions
    function getActiveAppointmentStatus() {
        const activeTab = document.querySelector('.tab-btn.active');
        return activeTab ? activeTab.getAttribute('data-status') : 'checked-in';
    }

    // Function to fetch doctor profile data from the API
    async function fetchDoctorProfile(employeeId) {
        try {
            if (!employeeId) {
                console.error('No employeeId provided to fetchDoctorProfile');
                showMessage('Missing employee ID', 'error');
                return;
            }
            
            // Fix for potential colon issue in some browsers - force to integer
            const cleanEmployeeId = parseInt(employeeId, 10);
            if (isNaN(cleanEmployeeId)) {
                console.error('Invalid employeeId format:', employeeId);
                showMessage('Invalid employee ID format', 'error');
                return;
            }
            
            console.log(`Making API call to http://localhost:8080/api/doctor/profile?employeeId=${cleanEmployeeId}`);
            const response = await fetch(`http://localhost:8080/api/doctor/profile?employeeId=${cleanEmployeeId}`);
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('Raw API response:', responseText);
                
                if (!responseText || responseText.trim() === '') {
                    console.error('Empty response received');
                    showMessage('Server returned empty response', 'error');
                    return;
                }
                
                try {
                    const doctorProfile = JSON.parse(responseText);
                    console.log('Parsed doctor profile:', doctorProfile);
                    initializeDoctorProfile(doctorProfile);
                } catch (parseError) {
                    console.error('Error parsing doctor profile response:', parseError);
                    throw new Error('Invalid response format');
                }
            } else {
                try {
                    const errorData = await response.text();
                    console.error('Error response from API:', errorData);
                    throw new Error(errorData || `Failed to fetch doctor profile: ${response.status} ${response.statusText}`);
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    throw new Error(`Failed to fetch doctor profile: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('Doctor profile fetch error:', error);
            showMessage(error.message || 'Failed to fetch doctor profile', 'error');
        }
    }

    function showAssignBedModal(patientName, appointmentId) {
        const modal = document.getElementById('assignBedModal');
    const patientNameInput = document.getElementById('patientName');
        const appointmentIdInput = document.getElementById('appointmentId');
        
        patientNameInput.value = patientName;
        appointmentIdInput.value = appointmentId;
            
        // Load available beds for the ward
        loadAvailableBeds();
        
        modal.style.display = 'block';
    }

    function loadAvailableBeds() {
        const bedSelect = document.getElementById('bedNumber');
        const wardSelect = document.getElementById('ward');
        
        if (!bedSelect || !wardSelect) return;
        
        // Mock available beds data - replace with API call in production
        const availableBeds = [
            { id: 1, number: '101', ward: 'General Ward' },
            { id: 2, number: '102', ward: 'General Ward' },
            { id: 3, number: '201', ward: 'ICU' },
            { id: 4, number: '301', ward: 'Emergency' },
            { id: 5, number: '401', ward: 'Pediatric' }
        ];
        
        bedSelect.innerHTML = '<option value="">Select Bed</option>';
        const filteredBeds = wardSelect.value ? 
            availableBeds.filter(bed => bed.ward.toLowerCase() === wardSelect.value) : 
            availableBeds;
            
        filteredBeds.forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.id;
            option.textContent = `Bed ${bed.number}`;
            bedSelect.appendChild(option);
        });
    }

    function updateAppointmentStatus(appointmentId, currentStatus) {
        const modal = document.getElementById('updateStatusModal');
        const statusSelect = document.getElementById('newStatus');
        const appointmentIdInput = document.getElementById('statusAppointmentId');
        
        appointmentIdInput.value = appointmentId;
        statusSelect.value = currentStatus;
        
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    function showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('message-container') || createMessageContainer();
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;
        
        messageContainer.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.classList.add('fade-out');
            setTimeout(() => messageElement.remove(), 300);
        }, 3000);
    }

    function createMessageContainer() {
        const container = document.createElement('div');
        container.id = 'message-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }

    function initializeDoctorProfile(doctor) {
        try {
            console.log('Initializing doctor profile with data:', doctor);
            
            if (!doctor) {
                console.error('No doctor profile data provided');
                showMessage('Error loading profile data', 'error');
                return;
            }
            
        // Update sidebar profile
            document.getElementById('doctorName').textContent = doctor.full_name || 'Unknown';
            document.getElementById('specialty').textContent = doctor.department || 'Unknown';
        
        // Update profile page
            document.getElementById('profileName').textContent = doctor.full_name || 'Unknown';
            document.getElementById('profileSpecialty').textContent = doctor.department || 'Unknown';
            document.getElementById('profileId').innerHTML = `Doctor ID: <span>${doctor.doctor_id || 'Unknown'}</span>`;
        
        // Update form fields
            document.getElementById('fullName').value = doctor.full_name || '';
            document.getElementById('doctorSpecialty').value = doctor.department || '';
            document.getElementById('email').value = doctor.email || '';
            document.getElementById('contactNumber').value = doctor.contact_number || '';
            document.getElementById('department').value = doctor.department || '';
            
            console.log('Doctor profile initialized successfully');
        } catch (error) {
            console.error('Error in initializeDoctorProfile:', error);
            showMessage('Failed to initialize doctor profile', 'error');
        }
    }

    // Mock data functions (replace with actual API calls in production)
    function loadAppointments(status = 'checked-in') {
        console.log(`Fetching appointments for employeeId: ${employeeId}, status: ${status}`);
        
        // Get the clean employee ID
        const cleanEmployeeId = parseInt(employeeId, 10);
        if (isNaN(cleanEmployeeId)) {
            console.error('Invalid employeeId format:', employeeId);
            showMessage('Invalid employee ID format', 'error');
            return;
        }
        
        // Show loading state
        if (appointmentsContainer) {
            appointmentsContainer.innerHTML = '<div class="loading">Loading appointments...</div>';
        }
        
        // Get the date from the date filter
        const selectedDate = dateFilter ? dateFilter.value : new Date().toISOString().split('T')[0];
        const selectedStatus = statusFilter ? statusFilter.value : 'all';
        
        // Format the API URL
        const apiUrl = `http://localhost:8080/api/doctor/appointments?employeeId=${cleanEmployeeId}&status=${status}`;
        console.log('Fetching appointments from:', apiUrl);
        
        // Fetch appointments from the API
        fetch(apiUrl)
            .then(response => {
                console.log('Appointments response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(text => {
                console.log('Appointments response text:', text);
                if (!text || text.trim() === '') {
                    // If response is empty, treat as empty array
                    return [];
                }
                // Parse the response JSON
                return JSON.parse(text);
            })
            .then(appointments => {
                console.log('Received appointments:', appointments);
                
                // Filter appointments based on date if necessary
                let filteredAppointments = appointments;
                
                if (selectedDate) {
                    filteredAppointments = filteredAppointments.filter(app => app.date === selectedDate);
                }
                
                if (selectedStatus !== 'all') {
                    filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
                }
                
                console.log('Filtered appointments:', filteredAppointments);
                
                // Render the appointments
                renderAppointments(filteredAppointments);
            })
            .catch(error => {
                console.error('Error fetching appointments:', error);
                
                // Show error message
                if (appointmentsContainer) {
                    appointmentsContainer.innerHTML = `<div class="error-message">Error loading appointments: ${error.message}</div>`;
                }
                
                // Show a message to the user
                showMessage('Failed to load appointments: ' + error.message, 'error');
                
                // Use mock data as fallback
                useMockAppointments(status);
            });
    }
    
    // Fallback to mock data if API fails
    function useMockAppointments(status) {
        console.log('Using mock appointment data');
        
        // Mock appointments data
        const appointments = [
            {
                id: 1,
                patientName: 'John Doe',
                patientId: 'P-001',
                date: '2025-04-14',
                time: '10:00 AM',
                reason: 'Regular checkup',
                status: 'checked-in'
            },
            {
                id: 2,
                patientName: 'Jane Smith',
                patientId: 'P-002',
                date: '2025-04-14',
                time: '11:30 AM',
                reason: 'Blood pressure monitoring',
                status: 'waiting'
            },
            {
                id: 3,
                patientName: 'Robert Johnson',
                patientId: 'P-003',
                date: '2025-04-14',
                time: '02:00 PM',
                reason: 'Post-surgery follow-up',
                status: 'completed'
            },
            {
                id: 4,
                patientName: 'Emily Wilson',
                patientId: 'P-004',
                date: '2025-04-14',
                time: '03:30 PM',
                reason: 'Chest pain',
                status: 'cancelled'
            },
            {
                id: 5,
                patientName: 'Michael Brown',
                patientId: 'P-005',
                date: '2025-04-14',
                time: '09:00 AM',
                reason: 'ECG test results',
                status: 'checked-in'
            },
            {
                id: 6,
                patientName: 'Sarah Davis',
                patientId: 'P-006',
                date: '2025-04-14',
                time: '04:30 PM',
                reason: 'Heart palpitations',
                status: 'waiting'
            }
        ];
        
        // Filter appointments based on status and date
        const selectedDate = dateFilter ? dateFilter.value : new Date().toISOString().split('T')[0];
        const selectedStatus = statusFilter ? statusFilter.value : 'all';
        
        let filteredAppointments = appointments.filter(app => app.date === selectedDate);
        
        if (status !== 'all') {
            filteredAppointments = filteredAppointments.filter(app => app.status === status);
        }
        
        if (selectedStatus !== 'all') {
            filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
        }
        
        // Render appointments
        renderAppointments(filteredAppointments);
    }

    function loadBeds() {
        // Mock beds data
        const beds = [
            {
                id: 1,
                number: '101',
                ward: 'General Ward',
                status: 'available',
                type: 'Standard',
                floor: '1st Floor'
            },
            {
                id: 2,
                number: '102',
                ward: 'General Ward',
                status: 'occupied',
                type: 'Standard',
                floor: '1st Floor',
                patient: 'John Doe',
                admissionDate: '2025-04-10'
            },
            {
                id: 3,
                number: '201',
                ward: 'ICU',
                status: 'occupied',
                type: 'ICU',
                floor: '2nd Floor',
                patient: 'Emily Wilson',
                admissionDate: '2025-04-12'
            },
            {
                id: 4,
                number: '301',
                ward: 'Emergency',
                status: 'available',
                type: 'Emergency',
                floor: '3rd Floor'
            },
            {
                id: 5,
                number: '401',
                ward: 'Pediatric',
                status: 'maintenance',
                type: 'Pediatric',
                floor: '4th Floor'
            }
        ];
        
        // Filter beds based on ward and status
        const selectedWard = wardFilter ? wardFilter.value : 'all';
        const selectedStatus = bedStatusFilter ? bedStatusFilter.value : 'all';
        
        let filteredBeds = [...beds];
        
        if (selectedWard !== 'all') {
            filteredBeds = filteredBeds.filter(bed => bed.ward.toLowerCase() === selectedWard);
        }
        
        if (selectedStatus !== 'all') {
            filteredBeds = filteredBeds.filter(bed => bed.status === selectedStatus);
        }
        
        // Render beds
        renderBeds(filteredBeds);
    }

    function loadBedStatistics() {
        // Mock bed statistics
        document.getElementById('totalBeds').textContent = '100';
        document.getElementById('availableBeds').textContent = '45';
        document.getElementById('occupiedBeds').textContent = '50';
        document.getElementById('maintenanceBeds').textContent = '5';
    }

    function renderAppointments(appointments) {
        if (!appointmentsContainer) return;
        
        appointmentsContainer.innerHTML = '';
        
        if (appointments.length === 0) {
            appointmentsContainer.innerHTML = '<div class="no-data">No appointments found</div>';
            return;
        }
        
        appointments.forEach(appointment => {
            const card = document.createElement('div');
            card.className = 'appointment-card';
            
            const statusClass = appointment.status.replace(' ', '-').toLowerCase();
            
            card.innerHTML = `
                <div class="status-badge ${statusClass}">${capitalizeFirstLetter(appointment.status)}</div>
                <h3>${appointment.patientName}</h3>
                <div class="patient-info">
                    <p><strong>Patient ID:</strong> ${appointment.patientId}</p>
                    <p><strong>Reason:</strong> ${appointment.reason}</p>
                </div>
                <div class="time-info">
                    <span><i class="fas fa-calendar"></i> ${formatDate(appointment.date)}</span>
                    <span><i class="fas fa-clock"></i> ${appointment.time}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-secondary" onclick="updateAppointmentStatus('${appointment.id}', '${appointment.status}')">
                        <i class="fas fa-exchange-alt"></i> Update Status
                    </button>
                    ${appointment.status === 'completed' ? 
                        `<button class="btn-primary" onclick="showAssignBedModal('${appointment.patientName}', '${appointment.id}')">
                            <i class="fas fa-bed"></i> Assign Bed
                        </button>` : ''}
                </div>
            `;
            
            appointmentsContainer.appendChild(card);
        });
    }

    function renderBeds(beds) {
        if (!bedGrid) return;
        
        bedGrid.innerHTML = '';
        
        if (beds.length === 0) {
            bedGrid.innerHTML = '<div class="no-data">No beds found</div>';
            return;
        }
        
        beds.forEach(bed => {
            const card = document.createElement('div');
            card.className = 'bed-card';
            
            card.innerHTML = `
                <div class="bed-status ${bed.status}">${capitalizeFirstLetter(bed.status)}</div>
                <h3>Bed ${bed.number}</h3>
                <div class="bed-details">
                    <p><strong>Ward:</strong> ${bed.ward}</p>
                    <p><strong>Type:</strong> ${bed.type}</p>
                    <p><strong>Floor:</strong> ${bed.floor}</p>
                    ${bed.status === 'occupied' ? 
                        `<p><strong>Patient:</strong> ${bed.patient}</p>
                        <p><strong>Admitted:</strong> ${formatDate(bed.admissionDate)}</p>` : ''}
                </div>
                ${bed.status === 'occupied' ? 
                    `<div class="bed-actions">
                        <button class="btn-secondary">
                            <i class="fas fa-file-medical"></i> View Details
                        </button>
                    </div>` : ''}
            `;
            
            bedGrid.appendChild(card);
        });
    }

    // Helper functions
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Handle logout
    function handleLogout() {
        console.log('Handling logout - clearing localStorage items');
        // Clear all relevant localStorage items
        localStorage.removeItem('userData');
        localStorage.removeItem('employeeId');
        // Redirect to login page
        window.location.href = 'simple_login.html';
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Close modals when clicking close button
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeModal(closeBtn.closest('.modal'));
        });
    });

    // Make functions available globally
    window.updateAppointmentStatus = updateAppointmentStatus;
    window.showAssignBedModal = showAssignBedModal;
    window.closeModal = closeModal;
    window.refreshAppointments = function() {
        loadAppointments(getActiveAppointmentStatus());
    };
}); 

// Function to refresh appointments (accessible globally)
function refreshAppointments() {
    const activeTab = document.querySelector('.tab-btn.active');
    const status = activeTab ? activeTab.getAttribute('data-status') : 'checked-in';
    loadAppointments(status);
}