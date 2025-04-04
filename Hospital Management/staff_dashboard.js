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

    // Sample data (replace with actual API calls)
    const patients = [
        { id: 1, name: 'John Doe', age: 45, ward: 'general', bed: '101', doctor: 'Dr. Smith', status: 'admitted' },
        { id: 2, name: 'Jane Smith', age: 32, ward: 'icu', bed: '201', doctor: 'Dr. Johnson', status: 'critical' }
    ];

    const beds = [
        { id: 1, number: '101', ward: 'general', status: 'occupied', patient: 'John Doe' },
        { id: 2, number: '102', ward: 'general', status: 'available', patient: null },
        { id: 3, number: '201', ward: 'icu', status: 'occupied', patient: 'Jane Smith' },
        { id: 4, number: '202', ward: 'icu', status: 'maintenance', patient: null }
    ];

    const doctors = [
        { id: 1, name: 'Dr. Smith', department: 'General Medicine' },
        { id: 2, name: 'Dr. Johnson', department: 'ICU' }
    ];

    const appointments = [
        { id: 1, patient: 'John Doe', doctor: 'Dr. Smith', time: '09:00 AM', status: 'scheduled' },
        { id: 2, patient: 'Jane Smith', doctor: 'Dr. Johnson', time: '10:30 AM', status: 'checked-in' }
    ];

    // Patient Management Functions
    function renderPatients() {
        const patientsList = document.getElementById('patientsList');
        patientsList.innerHTML = '';

        patients.forEach(patient => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            patientCard.innerHTML = `
                <h3>${patient.name}</h3>
                <div class="patient-info">
                    <p><strong>Age:</strong> ${patient.age}</p>
                    <p><strong>Ward:</strong> ${patient.ward}</p>
                    <p><strong>Bed:</strong> ${patient.bed}</p>
                    <p><strong>Doctor:</strong> ${patient.doctor}</p>
                    <span class="status-badge ${patient.status}">${patient.status}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-primary" onclick="showTransferModal(${patient.id})">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                    <button class="btn-primary" onclick="showDischargeModal(${patient.id})">
                        <i class="fas fa-sign-out-alt"></i> Discharge
                    </button>
                </div>
            `;
            patientsList.appendChild(patientCard);
        });
    }

    // Bed Management Functions
    function updateBedStats() {
        document.getElementById('totalBeds').textContent = beds.length;
        document.getElementById('availableBeds').textContent = beds.filter(b => b.status === 'available').length;
        document.getElementById('occupiedBeds').textContent = beds.filter(b => b.status === 'occupied').length;
        document.getElementById('maintenanceBeds').textContent = beds.filter(b => b.status === 'maintenance').length;
    }

    function renderBeds(filteredBeds = beds) {
        const bedGrid = document.getElementById('bedGrid');
        bedGrid.innerHTML = '';

        filteredBeds.forEach(bed => {
            const bedCard = document.createElement('div');
            bedCard.className = `bed-card ${bed.status}`;
            bedCard.innerHTML = `
                <h3>Bed ${bed.number}</h3>
                <p><strong>Ward:</strong> ${bed.ward}</p>
                <span class="status-badge ${bed.status}">${bed.status}</span>
                ${bed.patient ? `<p><strong>Patient:</strong> ${bed.patient}</p>` : ''}
                ${bed.status === 'available' ? `
                    <button class="btn-primary" onclick="showPatientRegistrationModal('${bed.number}')">
                        <i class="fas fa-user-plus"></i> Allocate
                    </button>
                ` : ''}
            `;
            bedGrid.appendChild(bedCard);
        });
    }

    // Appointment Management Functions
    function renderAppointments(filteredAppointments = appointments) {
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        appointmentsGrid.innerHTML = '';

        filteredAppointments.forEach(apt => {
            const appointmentCard = document.createElement('div');
            appointmentCard.className = 'appointment-card';
            appointmentCard.innerHTML = `
                <div class="appointment-time">${apt.time}</div>
                <h3>${apt.patient}</h3>
                <p><strong>Doctor:</strong> ${apt.doctor}</p>
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

    // Modal Functions
    window.showPatientRegistrationModal = function(bedNumber = '') {
        const modal = document.getElementById('patientRegistrationModal');
        const bedSelect = document.getElementById('availableBedSelect');
        
        // Populate available beds
        bedSelect.innerHTML = '';
        beds.filter(b => b.status === 'available').forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.number;
            option.textContent = `Bed ${bed.number} (${bed.ward})`;
            if (bed.number === bedNumber) option.selected = true;
            bedSelect.appendChild(option);
        });

        // Populate doctors
        const doctorSelect = modal.querySelector('select[name="doctor"]');
        doctorSelect.innerHTML = '';
        doctors.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.name;
            option.textContent = `${doc.name} (${doc.department})`;
            doctorSelect.appendChild(option);
        });

        modal.style.display = 'block';
    };

    window.showDischargeModal = function(patientId) {
        const modal = document.getElementById('dischargeModal');
        const patientSelect = modal.querySelector('select[name="patientId"]');
        
        // Populate admitted patients
        patientSelect.innerHTML = '';
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (Bed ${patient.bed})`;
            if (patient.id === patientId) option.selected = true;
            patientSelect.appendChild(option);
        });

        modal.style.display = 'block';
    };

    window.showTransferModal = function(patientId) {
        const modal = document.getElementById('transferModal');
        const patientSelect = modal.querySelector('select[name="patientId"]');
        
        // Populate admitted patients
        patientSelect.innerHTML = '';
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.name} (Current: ${patient.ward})`;
            if (patient.id === patientId) option.selected = true;
            patientSelect.appendChild(option);
        });

        // Update current department
        if (patientId) {
            const patient = patients.find(p => p.id === patientId);
            if (patient) {
                document.getElementById('currentDepartment').value = patient.ward;
            }
        }

        modal.style.display = 'block';
    };

    window.showEmergencyAllotmentModal = function() {
        const modal = document.getElementById('emergencyAllotmentModal');
        const bedSelect = document.getElementById('emergencyBedSelect');
        
        // Populate available emergency beds
        bedSelect.innerHTML = '';
        beds.filter(b => b.status === 'available' && b.ward === 'emergency').forEach(bed => {
            const option = document.createElement('option');
            option.value = bed.number;
            option.textContent = `Bed ${bed.number}`;
            bedSelect.appendChild(option);
        });

        modal.style.display = 'block';
    };

    // Form Submissions
    document.getElementById('patientRegistrationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Add new patient
        const newPatient = {
            id: patients.length + 1,
            name: data.patientName,
            age: data.age,
            ward: data.ward,
            bed: data.bedNumber,
            doctor: data.doctor,
            status: 'admitted'
        };
        patients.push(newPatient);

        // Update bed status
        const bed = beds.find(b => b.number === data.bedNumber);
        if (bed) {
            bed.status = 'occupied';
            bed.patient = data.patientName;
        }

        // Close modal and refresh views
        document.getElementById('patientRegistrationModal').style.display = 'none';
        renderPatients();
        renderBeds();
        updateBedStats();
    });

    document.getElementById('dischargeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Process discharge
        const patient = patients.find(p => p.id === parseInt(data.patientId));
        if (patient) {
            // Free up the bed
            const bed = beds.find(b => b.number === patient.bed);
            if (bed) {
                bed.status = 'available';
                bed.patient = null;
            }
            // Remove patient from list
            const index = patients.indexOf(patient);
            patients.splice(index, 1);
        }

        // Close modal and refresh views
        document.getElementById('dischargeModal').style.display = 'none';
        renderPatients();
        renderBeds();
        updateBedStats();
    });

    document.getElementById('transferForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Process transfer
        const patient = patients.find(p => p.id === parseInt(data.patientId));
        if (patient) {
            // Free up old bed
            const oldBed = beds.find(b => b.number === patient.bed);
            if (oldBed) {
                oldBed.status = 'available';
                oldBed.patient = null;
            }
            // Assign new bed
            const newBed = beds.find(b => b.number === data.newBed);
            if (newBed) {
                newBed.status = 'occupied';
                newBed.patient = patient.name;
                patient.bed = data.newBed;
                patient.ward = data.newDepartment;
            }
        }

        // Close modal and refresh views
        document.getElementById('transferModal').style.display = 'none';
        renderPatients();
        renderBeds();
        updateBedStats();
    });

    document.getElementById('emergencyAllotmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Process emergency allocation
        const newPatient = {
            id: patients.length + 1,
            name: data.patientName,
            ward: 'emergency',
            bed: data.emergencyBed,
            status: 'critical'
        };
        patients.push(newPatient);

        // Update bed status
        const bed = beds.find(b => b.number === data.emergencyBed);
        if (bed) {
            bed.status = 'occupied';
            bed.patient = data.patientName;
        }

        // Close modal and refresh views
        document.getElementById('emergencyAllotmentModal').style.display = 'none';
        renderPatients();
        renderBeds();
        updateBedStats();
    });

    // Filter Handlers
    document.getElementById('wardFilter').addEventListener('change', function(e) {
        const ward = e.target.value;
        const filteredBeds = ward === 'all' ? beds : beds.filter(bed => bed.ward === ward);
        renderBeds(filteredBeds);
    });

    document.getElementById('statusFilter').addEventListener('change', function(e) {
        const status = e.target.value;
        const filteredBeds = status === 'all' ? beds : beds.filter(bed => bed.status === status);
        renderBeds(filteredBeds);
    });

    document.getElementById('doctorFilter').addEventListener('change', function(e) {
        const doctor = e.target.value;
        const filteredAppointments = doctor === 'all' 
            ? appointments 
            : appointments.filter(apt => apt.doctor === doctor);
        renderAppointments(filteredAppointments);
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modals = document.getElementsByClassName('modal');
        Array.from(modals).forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // Close buttons in modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Profile Management
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profileData = {
            email: formData.get('email'),
            phone: formData.get('phone')
        };
        
        // Update profile (replace with actual API call)
        console.log('Updating contact details:', profileData);
        
        // Show success message
        alert('Contact details updated successfully!');
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
    renderPatients();
    renderBeds();
    renderAppointments();
    updateBedStats();

    // Populate doctor filter
    const doctorFilter = document.getElementById('doctorFilter');
    doctors.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.name;
        option.textContent = doc.name;
        doctorFilter.appendChild(option);
    });
}); 