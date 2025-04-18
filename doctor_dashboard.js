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
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
        console.log('Parsed userData:', userData);
    } catch (error) {
        console.error('Error parsing userData:', error);
    }

    // Get logged-in employee ID from localStorage (set during login)
    let employeeId = localStorage.getItem('employeeId');
    console.log('Resolved employeeId from direct localStorage:', employeeId);
    
    // If not found directly, try getting from userData object
    if (!employeeId && userData && userData.employeeId) {
        employeeId = userData.employeeId;
        console.log('Resolved employeeId from userData object:', employeeId);
        // Also store it directly for future use
        localStorage.setItem('employeeId', employeeId);
    }
    
    // Verify the user is a doctor
    if (userData && userData.role !== 'doctor') {
        console.error('User is not a doctor. Role:', userData.role);
        alert('You do not have permission to access this page. Redirecting to login.');
        // Redirect to login
        window.location.href = 'simple_login.html';
        return;
    }
    
    if (!employeeId) {
        console.error('No employeeId found, redirecting to login');
        // Clear any existing data
        localStorage.removeItem('userData');
        localStorage.removeItem('employeeId');
        // Redirect to login
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
    
    // Update Status Form Submit
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const appointmentId = document.getElementById('statusAppointmentId').value;
            const newStatus = document.getElementById('newStatus').value;
            const notes = document.getElementById('statusNotes').value;
            const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
            
            if (!appointmentId || !newStatus || !employeeId) {
                showMessage('Missing required information', 'error');
                return;
            }
            
            try {
                // Prepare data for API call
                const data = {
                    appointmentId: parseInt(appointmentId),
                    employeeId: parseInt(employeeId),
                    status: newStatus,
                    notes: notes
                };
                
                console.log('Updating appointment status with data:', data);
                
                // Call the API to update status
                const response = await fetch(`http://localhost:8080/api/appointments/${appointmentId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Failed to update status: ${response.status}`);
                }
                
                showMessage('Appointment status updated successfully', 'success');
                closeModal(updateStatusModal);
                
                // Reload appointments with the current active tab
                const activeTab = document.querySelector('.tab-btn.active');
                const status = activeTab ? activeTab.getAttribute('data-status') : 'checked-in';
                loadAppointments(status);
            } catch (error) {
                console.error('Error updating appointment status:', error);
                showMessage('Failed to update appointment status: ' + error.message, 'error');
            }
        });
    }

    // Initialize the dashboard
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('tab') && urlParams.get('tab') === 'scheduled') {
        // Activate the scheduled tab
        const scheduledTab = document.querySelector('.tab-btn[data-status="scheduled"]');
        if (scheduledTab) {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
            // Add active class to scheduled tab
            scheduledTab.classList.add('active');
            // Load scheduled appointments
            loadAppointments('scheduled');
        } else {
            loadAppointments('checked-in');
        }
    } else {
        // Load default tab
        loadAppointments('checked-in');
    }
    
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
    
    // Function to render appointments
    function renderAppointments(appointments) {
        if (!appointmentsContainer) {
            console.error('Appointments container not found');
            return;
        }
        
        appointmentsContainer.innerHTML = '';
        
        if (!appointments || appointments.length === 0) {
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
                </div>
            `;
            
            appointmentsContainer.appendChild(card);
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
                status: 'scheduled'
            },
            {
                id: 2,
                patientName: 'Jane Smith',
                patientId: 'P-002',
                date: '2025-04-14',
                time: '11:30 AM',
                reason: 'Blood pressure monitoring',
                status: 'checked-in'
            },
            {
                id: 3,
                patientName: 'Robert Johnson',
                patientId: 'P-003',
                date: '2025-04-14',
                time: '02:00 PM',
                reason: 'Post-surgery follow-up',
                status: 'waiting'
            },
            {
                id: 4,
                patientName: 'Emily Wilson',
                patientId: 'P-004',
                date: '2025-04-14',
                time: '03:30 PM',
                reason: 'Chest pain',
                status: 'completed'
            },
            {
                id: 5,
                patientName: 'Michael Brown',
                patientId: 'P-005',
                date: '2025-04-14',
                time: '09:00 AM',
                reason: 'ECG test results',
                status: 'scheduled'
            },
            {
                id: 6,
                patientName: 'Sarah Davis',
                patientId: 'P-006',
                date: '2025-04-14',
                time: '04:30 PM',
                reason: 'Heart palpitations',
                status: 'cancelled'
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
        console.log('Loading beds data...');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        
        if (!employeeId) {
            console.error('No employee ID found');
            return;
        }

        const bedGrid = document.getElementById('bedGrid');
        if (!bedGrid) return;

        // Show loading state
        bedGrid.innerHTML = '<div class="loading">Loading bed data...</div>';

        // Fetch beds from the API
        fetch(`http://localhost:8080/api/doctor/beds?employeeId=${employeeId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error loading bed data: HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Bed data loaded:', data);
                
                // Update bed statistics
                loadBedStatistics(data);
                
                // Process bed data for rendering
                const bedsToRender = [];
                
                // Process assigned beds
                if (data.assignments && data.assignments.length > 0) {
                    data.assignments.forEach(assignment => {
                        bedsToRender.push({
                            id: assignment.bedId,
                            number: assignment.bedId, // Using bedId as the number
                            ward: assignment.bedType, // Using bedType as ward name
                            status: 'occupied',
                            type: assignment.bedType,
                            patient: assignment.patientName,
                            patientId: assignment.patientId,
                            admissionDate: assignment.admissionDate,
                            assignmentId: assignment.assignmentId
                        });
                    });
                }
                
                // Process available beds
                if (data.availableBeds && data.availableBeds.length > 0) {
                    data.availableBeds.forEach(bed => {
                        bedsToRender.push({
                            id: bed.bedId,
                            number: bed.bedId, // Using bedId as the number
                            ward: bed.bedType, // Using bedType as ward name
                            status: 'available',
                            type: bed.bedType,
                            description: bed.description
                        });
                    });
                }
                
                // Update ward filter options based on unique bed types
                updateWardFilterOptions(bedsToRender);
                
                // Apply filters if set
                const selectedWard = wardFilter ? wardFilter.value : 'all';
                const selectedStatus = bedStatusFilter ? bedStatusFilter.value : 'all';
                
                let filteredBeds = [...bedsToRender];
                
                if (selectedWard !== 'all') {
                    filteredBeds = filteredBeds.filter(bed => 
                        bed.ward.toLowerCase() === selectedWard.toLowerCase());
                }
                
                if (selectedStatus !== 'all') {
                    filteredBeds = filteredBeds.filter(bed => bed.status === selectedStatus);
                }
                
                // Render the beds
                renderBeds(filteredBeds);
            })
            .catch(error => {
                console.error('Error fetching bed data:', error);
                bedGrid.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            });
    }

    // Function to update ward filter options based on available bed types
    function updateWardFilterOptions(beds) {
        const wardFilter = document.getElementById('wardFilter');
        if (!wardFilter) return;
        
        // Get unique ward names (bed types)
        const uniqueWards = [...new Set(beds.map(bed => bed.ward))];
        
        // Save current selection
        const currentSelection = wardFilter.value;
        
        // Clear all options except "All Wards"
        while (wardFilter.options.length > 1) {
            wardFilter.remove(1);
        }
        
        // Add options for each unique ward
        uniqueWards.forEach(ward => {
            const option = document.createElement('option');
            option.value = ward.toLowerCase();
            option.textContent = ward;
            wardFilter.appendChild(option);
        });
        
        // Restore selection if it exists in the new options
        if (currentSelection && currentSelection !== 'all') {
            const optionExists = Array.from(wardFilter.options).some(option => option.value === currentSelection);
            wardFilter.value = optionExists ? currentSelection : 'all';
        }
    }

    function loadBedStatistics(data) {
        // Extract statistics from the data
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;
        let maintenanceBeds = 0;

        if (data) {
            // Count occupied beds from assignments
            if (data.assignments) {
                occupiedBeds = data.assignments.length;
            }
            
            // Count available beds
            if (data.availableBeds) {
                availableBeds = data.availableBeds.length;
            }
            
            // Calculate total beds
            totalBeds = occupiedBeds + availableBeds + maintenanceBeds;
        }

        // Update the UI
        document.getElementById('totalBeds').textContent = totalBeds;
        document.getElementById('availableBeds').textContent = availableBeds;
        document.getElementById('occupiedBeds').textContent = occupiedBeds;
        document.getElementById('maintenanceBeds').textContent = maintenanceBeds;
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
            
            // Add status class to card
            card.classList.add(bed.status);
            
            let bedContent = `
                <div class="bed-status ${bed.status}">${capitalizeFirstLetter(bed.status)}</div>
                <h3>Bed ${bed.number}</h3>
                <div class="bed-details">
                    <p><strong>Ward:</strong> ${bed.ward}</p>
                    <p><strong>Type:</strong> ${bed.type}</p>
            `;
            
            // Add patient info if bed is occupied
            if (bed.status === 'occupied') {
                bedContent += `
                    <p><strong>Patient:</strong> ${bed.patient}</p>
                    <p><strong>Patient ID:</strong> ${bed.patientId}</p>
                    <p><strong>Admitted:</strong> ${formatDate(bed.admissionDate)}</p>
                    <div class="bed-actions">
                        <button class="btn-secondary" onclick="viewPatientDetails(${bed.patientId})">
                            <i class="fas fa-file-medical"></i> View Details
                        </button>
                    </div>
                `;
            }
            
            bedContent += `</div>`;
            card.innerHTML = bedContent;
            
            bedGrid.appendChild(card);
        });
    }

    // Function to view patient details
    function viewPatientDetails(patientId) {
        console.log(`View details for patient ${patientId}`);
        // Implement view patient details functionality here
        alert(`Patient details for ID: ${patientId} would be shown in a real implementation.`);
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
    window.closeModal = closeModal;
    window.refreshAppointments = function() {
        loadAppointments(getActiveAppointmentStatus());
    };
    window.viewPatientDetails = viewPatientDetails;
    window.renderAppointments = renderAppointments;
    window.useMockAppointments = useMockAppointments;
});

// Initialize doctor dashboard with a status check
document.addEventListener('DOMContentLoaded', function() {
    // If URL contains a parameter for scheduled tab, activate it
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('tab') && urlParams.get('tab') === 'scheduled') {
        setTimeout(() => {
            const scheduledTab = document.querySelector('.tab-btn[data-status="scheduled"]');
            if (scheduledTab) {
                scheduledTab.click();
            }
        }, 500); // Small delay to ensure DOM is fully loaded
    }
});

// Function to refresh appointments (accessible globally)
function refreshAppointments() {
    // Access the functions from within the IIFE scope
    const activeTab = document.querySelector('.tab-btn.active');
    const status = activeTab ? activeTab.getAttribute('data-status') : 'checked-in';
    
    // Get employee ID
    const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
    
    if (!employeeId) {
        console.error('No employeeId found for refresh');
        return;
    }
    
    // Show loading state
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    if (appointmentsContainer) {
        appointmentsContainer.innerHTML = '<div class="loading">Loading appointments...</div>';
    }
    
    // Get filters
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const selectedDate = dateFilter ? dateFilter.value : new Date().toISOString().split('T')[0];
    const selectedStatus = statusFilter ? statusFilter.value : 'all';
    
    // API URL
    const cleanEmployeeId = parseInt(employeeId, 10);
    const apiUrl = `http://localhost:8080/api/doctor/appointments?employeeId=${cleanEmployeeId}&status=${status}`;
    
    // Fetch appointments
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(text => {
            if (!text || text.trim() === '') {
                return [];
            }
            return JSON.parse(text);
        })
        .then(appointments => {
            // Filter appointments
            let filteredAppointments = appointments;
            
            if (selectedDate) {
                filteredAppointments = filteredAppointments.filter(app => app.date === selectedDate);
            }
            
            if (selectedStatus !== 'all') {
                filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
            }
            
            // Render the appointments
            if (typeof renderAppointments === 'function') {
                renderAppointments(filteredAppointments);
            } else {
                console.error('renderAppointments function not found');
                appointmentsContainer.innerHTML = '<div class="error-message">Error rendering appointments</div>';
            }
        })
        .catch(error => {
            console.error('Error refreshing appointments:', error);
            
            if (appointmentsContainer) {
                appointmentsContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
            }
            
            // Use mock data as fallback
            useMockData(status);
        });
}

// Mock data fallback function for refreshAppointments
function useMockData(status) {
    console.log('Using mock data fallback for refreshAppointments');
    
    // Get filters
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const selectedDate = dateFilter ? dateFilter.value : new Date().toISOString().split('T')[0];
    const selectedStatus = statusFilter ? statusFilter.value : 'all';
    
    // Mock appointments data
    const appointments = [
        {
            id: 1,
            patientName: 'John Doe',
            patientId: 'P-001',
            date: selectedDate,
            time: '10:00 AM',
            reason: 'Regular checkup',
            status: 'scheduled'
        },
        {
            id: 2,
            patientName: 'Jane Smith',
            patientId: 'P-002',
            date: selectedDate,
            time: '11:30 AM',
            reason: 'Blood pressure monitoring',
            status: 'checked-in'
        },
        {
            id: 3,
            patientName: 'Robert Johnson',
            patientId: 'P-003',
            date: selectedDate,
            time: '02:00 PM',
            reason: 'Post-surgery follow-up',
            status: 'waiting'
        },
        {
            id: 4,
            patientName: 'Emily Wilson',
            patientId: 'P-004',
            date: selectedDate,
            time: '03:30 PM',
            reason: 'Chest pain',
            status: 'completed'
        }
    ];
    
    // Filter by status
    let filteredAppointments = appointments;
    
    if (status !== 'all') {
        filteredAppointments = filteredAppointments.filter(app => app.status === status);
    }
    
    if (selectedStatus !== 'all') {
        filteredAppointments = filteredAppointments.filter(app => app.status === selectedStatus);
    }
    
    // Get container
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    
    // Render appointments directly
    if (appointmentsContainer) {
        appointmentsContainer.innerHTML = '';
        
        if (filteredAppointments.length === 0) {
            appointmentsContainer.innerHTML = '<div class="no-data">No appointments found</div>';
            return;
        }
        
        filteredAppointments.forEach(appointment => {
            const card = document.createElement('div');
            card.className = 'appointment-card';
            
            const statusClass = appointment.status.replace(' ', '-').toLowerCase();
            
            card.innerHTML = `
                <div class="status-badge ${statusClass}">${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</div>
                <h3>${appointment.patientName}</h3>
                <div class="patient-info">
                    <p><strong>Patient ID:</strong> ${appointment.patientId}</p>
                    <p><strong>Reason:</strong> ${appointment.reason}</p>
                </div>
                <div class="time-info">
                    <span><i class="fas fa-calendar"></i> ${new Date(appointment.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span><i class="fas fa-clock"></i> ${appointment.time}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-secondary" onclick="updateAppointmentStatus('${appointment.id}', '${appointment.status}')">
                        <i class="fas fa-exchange-alt"></i> Update Status
                    </button>
                </div>
            `;
            
            appointmentsContainer.appendChild(card);
        });
    }
}