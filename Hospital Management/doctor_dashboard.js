document.addEventListener('DOMContentLoaded', function() {
    // Tab Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.getAttribute('data-tab');
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Appointments Management
    const appointmentsList = document.getElementById('appointmentsList');
    const appointmentFilters = document.querySelectorAll('.appointment-filters .filter-btn');

    // Sample appointments data (replace with actual API call)
    const appointments = [
        { id: 1, patientName: 'John Doe', time: '09:00 AM', status: 'checked-in' },
        { id: 2, patientName: 'Jane Smith', time: '10:30 AM', status: 'waiting' },
        { id: 3, patientName: 'Mike Johnson', time: '02:00 PM', status: 'completed' }
    ];

    function renderAppointments(status = 'all') {
        appointmentsList.innerHTML = '';
        const filteredAppointments = status === 'all' 
            ? appointments 
            : appointments.filter(apt => apt.status === status);

        filteredAppointments.forEach(apt => {
            const appointmentCard = document.createElement('div');
            appointmentCard.className = `appointment-card ${apt.status}`;
            appointmentCard.innerHTML = `
                <div class="appointment-time">${apt.time}</div>
                <div class="appointment-details">
                    <h3>${apt.patientName}</h3>
                    <span class="status-badge ${apt.status}">${apt.status}</span>
                </div>
                <div class="appointment-actions">
                    <button class="btn-primary" onclick="updateAppointmentStatus(${apt.id})">
                        Update Status
                    </button>
                </div>
            `;
            appointmentsList.appendChild(appointmentCard);
        });
    }

    appointmentFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            appointmentFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            renderAppointments(filter.getAttribute('data-status'));
        });
    });

    // Profile Management
    const profileForm = document.getElementById('profileForm');
    
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(profileForm);
        const profileData = Object.fromEntries(formData.entries());
        
        // Update profile (replace with actual API call)
        console.log('Updating profile:', profileData);
        // After successful update:
        document.getElementById('doctorName').textContent = `Dr. ${profileData.fullName}`;
        document.getElementById('specialty').textContent = profileData.specialty;
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

    // Sample beds data (replace with actual API call)
    const beds = [
        { id: 1, number: '101', status: 'occupied', patient: 'John Doe' },
        { id: 2, number: '102', status: 'available', patient: null },
        { id: 3, number: '103', status: 'maintenance', patient: null },
        { id: 4, number: '104', status: 'available', patient: null },
        { id: 5, number: '105', status: 'available', patient: null }
    ];

    function updateAvailableBeds() {
        // Clear existing options
        newBedNumberSelect.innerHTML = '';
        
        // Add available beds to the select dropdown
        beds.filter(bed => bed.status === 'available').forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.number;
            option.textContent = `Bed ${bed.number}`;
            newBedNumberSelect.appendChild(option);
        });
    }

    function renderBeds(filteredBeds = beds) {
        bedGrid.innerHTML = '';
        filteredBeds.forEach(bed => {
            const bedCard = document.createElement('div');
            bedCard.className = `bed-card ${bed.status}`;
            bedCard.innerHTML = `
                <h3>Bed ${bed.number}</h3>
                <div class="bed-status">
                    <span class="status-badge ${bed.status}">${bed.status}</span>
                </div>
                ${bed.patient ? `<p>Patient: ${bed.patient}</p>` : ''}
                <button class="btn-primary" onclick="manageBed(${bed.id}, '${bed.status}', '${bed.number}')">
                    ${bed.status === 'occupied' ? 'Transfer Patient' : 'Allocate Bed'}
                </button>
            `;
            bedGrid.appendChild(bedCard);
        });
    }

    // Global function to manage beds
    window.manageBed = function(bedId, status, bedNumber) {
        const bed = beds.find(b => b.id === bedId);
        if (!bed) return;

        // Reset form
        bedAllocationForm.reset();
        
        // Update modal title and form based on action type
        const modalTitle = allocationModal.querySelector('h2');
        const currentBedInput = document.getElementById('currentBed');
        const patientNameInput = document.getElementById('patientName');

        if (status === 'occupied') {
            modalTitle.textContent = 'Transfer Patient';
            currentBedInput.value = bedNumber;
            currentBedInput.disabled = true;
            if (bed.patient) {
                patientNameInput.value = bed.patient;
                patientNameInput.disabled = true;
            }
        } else {
            modalTitle.textContent = 'Allocate New Bed';
            currentBedInput.value = '';
            currentBedInput.disabled = true;
            patientNameInput.value = '';
            patientNameInput.disabled = false;
        }

        // Update available beds in dropdown
        updateAvailableBeds();
        
        // Show modal
        allocationModal.style.display = 'block';
    };

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === allocationModal) {
            allocationModal.style.display = 'none';
        }
    };

    allocateNewBedBtn.addEventListener('click', () => {
        // Reset form
        bedAllocationForm.reset();
        
        // Update modal for new allocation
        const modalTitle = allocationModal.querySelector('h2');
        modalTitle.textContent = 'Allocate New Bed';
        
        const currentBedInput = document.getElementById('currentBed');
        const patientNameInput = document.getElementById('patientName');
        
        currentBedInput.value = '';
        currentBedInput.disabled = true;
        patientNameInput.value = '';
        patientNameInput.disabled = false;

        // Update available beds
        updateAvailableBeds();
        
        // Show modal
        allocationModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        allocationModal.style.display = 'none';
    });

    bedAllocationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(bedAllocationForm);
        const allocationData = Object.fromEntries(formData.entries());
        
        // Process bed allocation
        const currentBedNumber = allocationData.currentBed;
        const newBedNumber = allocationData.newBedNumber;
        const patientName = allocationData.patientName;
        
        // Update beds data
        if (currentBedNumber) {
            // Handle transfer
            const currentBed = beds.find(b => b.number === currentBedNumber);
            const newBed = beds.find(b => b.number === newBedNumber);
            
            if (currentBed && newBed) {
                currentBed.status = 'available';
                currentBed.patient = null;
                newBed.status = 'occupied';
                newBed.patient = patientName;
            }
        } else {
            // Handle new allocation
            const newBed = beds.find(b => b.number === newBedNumber);
            if (newBed) {
                newBed.status = 'occupied';
                newBed.patient = patientName;
            }
        }

        // Close modal and refresh bed grid
        allocationModal.style.display = 'none';
        renderBeds();
    });

    bedStatusFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            bedStatusFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            const status = filter.getAttribute('data-bed-status');
            const filteredBeds = status === 'all' 
                ? beds 
                : beds.filter(bed => bed.status === status);
            renderBeds(filteredBeds);
        });
    });

    bedSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredBeds = beds.filter(bed => 
            bed.number.toLowerCase().includes(searchTerm) ||
            (bed.patient && bed.patient.toLowerCase().includes(searchTerm))
        );
        renderBeds(filteredBeds);
    });

    // Logout functionality
    window.handleLogout = function() {
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (confirmLogout) {
            // Add any cleanup or session termination logic here
            window.location.href = 'login.html'; // Redirect to login page
        }
    };

    // Initial renders
    renderAppointments();
    renderAvailabilityCalendar();
    renderBeds();
}); 