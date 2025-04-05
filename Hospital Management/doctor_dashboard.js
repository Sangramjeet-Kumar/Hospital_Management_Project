document.addEventListener('DOMContentLoaded', function() {
    // Tab Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    // Store current doctor ID (this would come from login)
    // For testing purposes, we'll use a hardcoded value
    const doctorID = 1; // Replace with actual doctor ID from login in production

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // Load tab specific data
            loadTabData(tabId);
        });
    });

    // Function to load data based on the active tab
    function loadTabData(tabId) {
        switch(tabId) {
            case 'appointments':
                loadAppointments();
                break;
            case 'profile':
                loadDoctorProfile();
                break;
            case 'bed-management':
                loadBeds();
                break;
        }
    }

    // Appointments Management
    const appointmentsList = document.getElementById('appointmentsList');
    const appointmentFilters = document.querySelectorAll('.appointment-filters .filter-btn');

    // Load appointments from the backend API
    async function loadAppointments(status = 'all') {
        try {
            console.log(`Fetching appointments for doctor ${doctorID} with status ${status}`);
            const response = await fetch(`http://localhost:8080/api/doctor/${doctorID}/appointments?status=${status}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error response: ${errorText}`);
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }
            const appointments = await response.json();
            console.log("Appointments data:", appointments);
            renderAppointments(appointments, status);
        } catch (error) {
            console.error('Error loading appointments:', error);
            appointmentsList.innerHTML = `<p class="error-message">Error loading appointments: ${error.message}. Please try again later.</p>`;
        }
    }

    function renderAppointments(appointments, status = 'all') {
        appointmentsList.innerHTML = '';
        
        if (appointments.length === 0) {
            appointmentsList.innerHTML = `<p class="no-data-message">No appointments found.</p>`;
            return;
        }

        appointments.forEach(apt => {
            // Check the structure of the appointment object and adapt accordingly
            console.log("Appointment data:", apt);
            
            let patientName = apt.patient ? apt.patient.full_name : 
                              (apt.patient_name ? apt.patient_name : "Unknown Patient");
            
            let appointmentTime = apt.appointment_time || apt.appointmentTime || "No time specified";
            let appointmentStatus = apt.status || "scheduled";
            let appointmentId = apt.appointment_id || apt.appointmentID;
            
            // Handle appointment date based on structure
            let formattedDate = "No date";
            if (apt.appointment_date) {
                try {
                    const appointmentDate = new Date(apt.appointment_date);
                    formattedDate = appointmentDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch (e) {
                    console.error("Error formatting date:", e);
                    formattedDate = apt.appointment_date;
                }
            } else if (apt.appointmentDate) {
                try {
                    const appointmentDate = new Date(apt.appointmentDate);
                    formattedDate = appointmentDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch (e) {
                    console.error("Error formatting date:", e);
                    formattedDate = apt.appointmentDate;
                }
            }

            const appointmentCard = document.createElement('div');
            appointmentCard.className = `appointment-card ${appointmentStatus}`;
            appointmentCard.innerHTML = `
                <div class="appointment-time">${appointmentTime}</div>
                <div class="appointment-details">
                    <h3>${patientName}</h3>
                    <p class="appointment-date">${formattedDate}</p>
                    <span class="status-badge ${appointmentStatus}">${appointmentStatus}</span>
                </div>
                <div class="appointment-actions">
                    <button class="btn-primary" onclick="updateAppointmentStatus(${appointmentId})">
                        Update Status
                    </button>
                </div>
            `;
            appointmentsList.appendChild(appointmentCard);
        });
    }

    // Global function to update appointment status
    window.updateAppointmentStatus = async function(appointmentId) {
        const newStatus = prompt("Update status to (checked-in, waiting, completed, canceled):");
        if (!newStatus) return;

        try {
            const response = await fetch(`http://localhost:8080/api/appointments/${appointmentId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Reload appointments after status update
            const activeFilter = document.querySelector('.appointment-filters .filter-btn.active');
            loadAppointments(activeFilter.getAttribute('data-status'));
        } catch (error) {
            console.error('Error updating appointment status:', error);
            alert('Failed to update appointment status. Please try again.');
        }
    };

    appointmentFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            appointmentFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            
            // Get status from the button's data attribute
            const status = filter.getAttribute('data-status');
            console.log("Selected appointment filter:", status);
            
            // Load appointments with selected status
            loadAppointments(status);
        });
    });

    // Profile Management
    const profileForm = document.getElementById('profileForm');
    const doctorNameElement = document.getElementById('doctorName');
    const specialtyElement = document.getElementById('specialty');
    
    // Load doctor profile from the backend API
    async function loadDoctorProfile() {
        try {
            const response = await fetch(`http://localhost:8080/api/doctor/${doctorID}/profile`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const doctor = await response.json();
            console.log("Doctor profile data:", doctor);
            
            // Handle both camelCase and snake_case field names
            const fullName = doctor.full_name || doctor.fullName || "Unknown";
            const department = doctor.department || doctor.specialty || "";
            const contactNumber = doctor.contact_number || doctor.contactNumber || "";
            const email = doctor.email || "";
            
            // Update profile display and form
            doctorNameElement.textContent = `Dr. ${fullName}`;
            specialtyElement.textContent = department;
            
            // Populate form fields
            document.getElementById('fullName').value = fullName;
            document.getElementById('doctorSpecialty').value = department;
            document.getElementById('contactNumber').value = contactNumber;
            document.getElementById('email').value = email;
            
            // Initialize availability calendar
            renderAvailabilityCalendar();
        } catch (error) {
            console.error('Error loading doctor profile:', error);
            alert('Failed to load doctor profile. Please try again.');
        }
    }
    
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(profileForm);
            const profileData = {
                full_name: formData.get('fullName'),
                description: 'Updated profile',
                contact_number: formData.get('contactNumber'),
                email: formData.get('email')
            };
            
            const response = await fetch(`http://localhost:8080/api/doctor/${doctorID}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Update displayed profile
            doctorNameElement.textContent = `Dr. ${profileData.full_name}`;
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    });

    // Availability Calendar
    const availabilityCalendar = document.getElementById('availabilityCalendar');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    function renderAvailabilityCalendar() {
        const calendarHTML = days.map(day => `
            <div class="day-schedule">
                <h4>${day}</h4>
                <div class="time-slots">
                    <label>
                        <input type="checkbox" name="${day.toLowerCase()}_morning" value="morning">
                        Morning (9AM - 12PM)
                    </label>
                    <label>
                        <input type="checkbox" name="${day.toLowerCase()}_afternoon" value="afternoon">
                        Afternoon (2PM - 5PM)
                    </label>
                </div>
            </div>
        `).join('');
        
        availabilityCalendar.innerHTML = calendarHTML;
    }

    // Bed Management
    const bedGrid = document.getElementById('bedGrid');
    const bedSearch = document.getElementById('bedSearch');
    const bedStatusFilters = document.querySelectorAll('.bed-status-filters .filter-btn');
    const allocateNewBedBtn = document.getElementById('allocateNewBed');
    const allocationModal = document.getElementById('allocationModal');
    const closeModal = document.querySelector('.close');
    const bedAllocationForm = document.getElementById('bedAllocationForm');
    const newBedNumberSelect = document.getElementById('newBedNumber');
    const patientNameInput = document.getElementById('patientName');
    let doctorPatients = []; // Will store patients data

    // Load beds from the backend API
    async function loadBeds(status = 'all') {
        try {
            console.log(`Fetching beds for doctor ${doctorID} with status ${status}`);
            
            // Show loading indicator
            bedGrid.innerHTML = `<p class="loading-message">Loading bed data...</p>`;
            
            const endpoint = `http://localhost:8080/api/doctor/${doctorID}/beds${status !== 'all' ? '?status=' + status : ''}`;
            console.log("Bed API endpoint:", endpoint);
            
            const response = await fetch(endpoint);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error response: ${errorText}`);
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }
            const beds = await response.json();
            console.log("Beds data:", beds);
            renderBeds(beds);
        } catch (error) {
            console.error('Error loading beds:', error);
            bedGrid.innerHTML = `<p class="error-message">Error loading bed data: ${error.message}. Please try again later.</p>`;
        }
    }

    async function loadPatients() {
        try {
            const response = await fetch(`http://localhost:8080/api/doctor/${doctorID}/patients`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            doctorPatients = await response.json();
        } catch (error) {
            console.error('Error loading patients:', error);
            doctorPatients = [];
        }
    }

    function updateAvailableBeds(beds) {
        // Clear existing options
        newBedNumberSelect.innerHTML = '';
        
        // Add available beds to the select dropdown
        beds.filter(bed => bed.status === 'available').forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.bedID;
            option.textContent = `Bed ${bed.bedID} (${bed.bedType})`;
            newBedNumberSelect.appendChild(option);
        });
    }

    function renderBeds(beds) {
        bedGrid.innerHTML = '';
        
        if (beds.length === 0) {
            bedGrid.innerHTML = `<p class="no-data-message">No beds found.</p>`;
            return;
        }

        beds.forEach(bed => {
            const bedCard = document.createElement('div');
            bedCard.className = `bed-card ${bed.status}`;
            bedCard.innerHTML = `
                <h3>Bed ${bed.bedID}</h3>
                <p class="bed-type">${bed.bedType}</p>
                <div class="bed-status">
                    <span class="status-badge ${bed.status}">${bed.status}</span>
                </div>
                ${bed.patientName ? `<p>Patient: ${bed.patientName}</p>` : ''}
                ${bed.admissionDate ? `<p>Admitted: ${bed.admissionDate}</p>` : ''}
                <button class="btn-primary" onclick="manageBed('${bed.bedID}', '${bed.status}', '${bed.patientID || 0}')">
                    ${bed.status === 'occupied' ? 'View Details' : 'Allocate Bed'}
                </button>
            `;
            bedGrid.appendChild(bedCard);
        });

        // Store beds data for modal
        window.bedsData = beds;
        updateAvailableBeds(beds);
    }

    // Global function to manage beds
    window.manageBed = function(bedId, status, patientId) {
        // Reset form
        bedAllocationForm.reset();
        
        // Update modal title and form based on action type
        const modalTitle = allocationModal.querySelector('h2');
        const currentBedInput = document.getElementById('currentBed');

        if (status === 'occupied') {
            modalTitle.textContent = 'Bed Details';
            currentBedInput.value = bedId;
            currentBedInput.disabled = true;
            
            const bed = window.bedsData.find(b => b.bedID == bedId);
            if (bed && bed.patientName) {
                patientNameInput.value = bed.patientName;
                patientNameInput.disabled = true;
                document.getElementById('allocationReason').value = '';
                document.getElementById('allocationReason').disabled = true;
            }
        } else {
            modalTitle.textContent = 'Allocate New Bed';
            currentBedInput.value = '';
            currentBedInput.disabled = true;
            patientNameInput.value = '';
            patientNameInput.disabled = false;
            document.getElementById('allocationReason').disabled = false;
            document.getElementById('allocationReason').value = '';
            
            // Create patient dropdown
            createPatientDropdown();
        }
        
        // Show modal
        allocationModal.style.display = 'block';
    };

    function createPatientDropdown() {
        // Create datalist for patient suggestions
        let datalist = document.getElementById('patient-suggestions');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'patient-suggestions';
            document.body.appendChild(datalist);
            patientNameInput.setAttribute('list', 'patient-suggestions');
        }
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add patient options
        doctorPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.full_name;
            option.dataset.patientId = patient.patient_id;
            datalist.appendChild(option);
        });
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === allocationModal) {
            allocationModal.style.display = 'none';
        }
    };

    closeModal.addEventListener('click', () => {
        allocationModal.style.display = 'none';
    });

    allocateNewBedBtn.addEventListener('click', () => {
        // Reset form for new allocation
        bedAllocationForm.reset();
        
        // Update modal for new allocation
        allocationModal.querySelector('h2').textContent = 'Allocate New Bed';
        document.getElementById('currentBed').value = '';
        document.getElementById('currentBed').disabled = true;
        patientNameInput.value = '';
        patientNameInput.disabled = false;
        document.getElementById('allocationReason').disabled = false;
        document.getElementById('allocationReason').value = '';
        
        // Create patient dropdown
        createPatientDropdown();
        
        // Show modal
        allocationModal.style.display = 'block';
    });

    bedAllocationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (allocationModal.querySelector('h2').textContent === 'Bed Details') {
            // Just close the modal for view mode
            allocationModal.style.display = 'none';
            return;
        }
        
        try {
            // Get selected patient ID from the datalist option
            const patientName = patientNameInput.value;
            let patientId = null;
            
            for (const patient of doctorPatients) {
                if (patient.full_name === patientName) {
                    patientId = patient.patient_id;
                    break;
                }
            }
            
            if (!patientId) {
                throw new Error('Patient not found. Please select a valid patient.');
            }
            
            const bedId = parseInt(newBedNumberSelect.value);
            
            const response = await fetch('http://localhost:8080/api/doctor/bed/allocate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bedID: bedId,
                    patientID: patientId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Close modal and reload beds
            allocationModal.style.display = 'none';
            
            // Reload bed data
            const activeFilter = document.querySelector('.bed-status-filters .filter-btn.active');
            loadBeds(activeFilter.getAttribute('data-bed-status'));
            
            alert('Bed allocated successfully!');
        } catch (error) {
            console.error('Error allocating bed:', error);
            alert(error.message || 'Failed to allocate bed. Please try again.');
        }
    });

    bedStatusFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            bedStatusFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            
            // Get status from the button's data attribute
            const status = filter.getAttribute('data-bed-status');
            console.log("Selected bed status filter:", status);
            
            // Load beds with selected status
            loadBeds(status);
        });
    });

    bedSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const beds = window.bedsData || [];
        
        if (!searchTerm) {
            renderBeds(beds);
            return;
        }
        
        const filteredBeds = beds.filter(bed => {
            return (
                bed.bedID.toString().includes(searchTerm) ||
                (bed.patientName && bed.patientName.toLowerCase().includes(searchTerm)) ||
                bed.bedType.toLowerCase().includes(searchTerm)
            );
        });
        
        renderBeds(filteredBeds);
    });

    // Handle logout
    window.handleLogout = function() {
        // Clear any user session data
        localStorage.removeItem('doctorID');
        // Redirect to login page
        window.location.href = 'login.html';
    };

    // Initial data load
    loadAppointments();
    loadDoctorProfile();
    loadPatients();
}); 