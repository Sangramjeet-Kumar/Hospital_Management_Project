document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const doctorSelection = document.getElementById('doctorSelection');
    const dateTimeSelection = document.getElementById('dateTimeSelection');
    const patientDetails = document.getElementById('patientDetails');
    const doctorsSection = document.querySelector('.doctors-section');
    const doctorsContainer = document.getElementById('doctorsContainer');
    const doctorsGrid = document.getElementById('doctorsGrid');
    const departmentCards = document.querySelectorAll('.department-card');
    
    // State management
    let selectedDoctor = null;
    let selectedDate = null;
    let selectedTime = null;

    // Initialize sections
    function showSection(section) {
        [doctorSelection, dateTimeSelection, patientDetails].forEach(s => {
            s.style.display = 'none';
        });
        section.style.display = 'block';
    }

    // Department selection
    departmentCards.forEach(card => {
        card.addEventListener('click', async () => {
            try {
                // Show doctors section and loading state
                doctorsSection.style.display = 'block';
                doctorsContainer.innerHTML = '<div class="loading">Loading doctors...</div>';

                // Reset previous selection
                departmentCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                const department = card.dataset.department;
                console.log('Selected department:', department);

                const doctors = await fetchDoctorsByDepartment(department);
                console.log('Received doctors:', doctors);

                if (!doctors || doctors.length === 0) {
                    doctorsContainer.innerHTML = '<p class="no-doctors">No doctors available in this department</p>';
                } else {
                    // Clear and show doctors grid
                    doctorsContainer.innerHTML = '<div id="doctorsGrid" class="doctors-grid"></div>';
                    const grid = document.getElementById('doctorsGrid');
                    doctors.forEach(doctor => {
                        grid.appendChild(createDoctorCard(doctor));
                    });
                }
            } catch (error) {
                console.error('Error in click handler:', error);
                doctorsContainer.innerHTML = `
                    <div class="error-message">
                        <p>Error: ${error.message}</p>
                        <button onclick="retryFetch('${card.dataset.department}')" class="retry-btn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>`;
            }
        });
    });

    // Fetch doctors by department
    async function fetchDoctorsByDepartment(department) {
        try {
            const response = await fetch(`http://localhost:8080/api/doctors?department=${department}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched doctors:', data);

            if (!Array.isArray(data)) {
                throw new Error('Invalid data format received from server');
            }

            return data;
        } catch (error) {
            console.error('Error details:', error);
            throw new Error(`Failed to fetch doctors: ${error.message}`);
        }
    }

    // Create doctor card
    function createDoctorCard(doctor) {
        console.log('Creating card for doctor:', doctor);
        
        const card = document.createElement('div');
        card.className = 'doctor-card';
        card.dataset.doctorId = doctor.doctor_id;
        
        card.innerHTML = `
            <div class="doctor-image">
                <i class="fas fa-user-md"></i>
            </div>
            <h3>${doctor.full_name || 'Unknown Doctor'}</h3>
            <p class="department">${doctor.department || 'No Department'}</p>
            <p class="description">${doctor.description || 'No description available'}</p>
            <div class="doctor-contact">
                <p><i class="fas fa-phone"></i> ${doctor.contact_number || 'N/A'}</p>
                <p><i class="fas fa-envelope"></i> ${doctor.email || 'N/A'}</p>
            </div>
            <button class="select-doctor-btn">Select Doctor</button>
        `;

        const selectBtn = card.querySelector('.select-doctor-btn');
        selectBtn.addEventListener('click', () => {
            document.querySelectorAll('.doctor-card').forEach(c => 
                c.classList.remove('selected'));
            card.classList.add('selected');
            
            selectedDoctor = doctor;
            updateAppointmentSummary();
            showSection(dateTimeSelection);
            initializeCalendar();
        });

        return card;
    }

    // Calendar functionality
    function initializeCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        const currentMonthElement = document.querySelector('.current-month');
        const today = new Date();
        let currentMonth = today;

        function renderCalendar(date) {
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            currentMonthElement.textContent = date.toLocaleString('default', { 
                month: 'long', 
                year: 'numeric' 
            });

            calendarGrid.innerHTML = '';
            
            // Add day headers
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
                calendarGrid.innerHTML += `<div class="calendar-day day-name">${day}</div>`;
            });

            // Add empty cells for days before first day of month
            for (let i = 0; i < firstDay.getDay(); i++) {
                calendarGrid.innerHTML += '<div class="calendar-day empty"></div>';
            }

            // Add days of the month
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const dateCell = document.createElement('div');
                dateCell.className = 'calendar-day';
                dateCell.textContent = day;

                const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
                if (currentDate < today) {
                    dateCell.classList.add('disabled');
                } else {
                    dateCell.addEventListener('click', () => selectDate(currentDate, dateCell));
                }

                calendarGrid.appendChild(dateCell);
            }
        }

        function selectDate(date, element) {
            document.querySelectorAll('.calendar-day.selected').forEach(el => 
                el.classList.remove('selected'));
            element.classList.add('selected');
            selectedDate = date;
            updateAppointmentSummary();
            generateTimeSlots();
        }

        // Navigation buttons
        document.querySelector('.prev-month').addEventListener('click', () => {
            if (currentMonth.getMonth() === today.getMonth()) return;
            currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
            renderCalendar(currentMonth);
        });

        document.querySelector('.next-month').addEventListener('click', () => {
            currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
            renderCalendar(currentMonth);
        });

        renderCalendar(currentMonth);
    }

    // Generate time slots
    function generateTimeSlots() {
        const slotsGrid = document.querySelector('.slots-grid');
        slotsGrid.innerHTML = '';
        
        const timeSlots = [
            '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
            '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
            '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
        ];

        timeSlots.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = time;
            
            slot.addEventListener('click', () => {
                document.querySelectorAll('.time-slot.selected').forEach(el => 
                    el.classList.remove('selected'));
                slot.classList.add('selected');
                selectedTime = time;
                updateAppointmentSummary();
            });

            slotsGrid.appendChild(slot);
        });
    }

    // Update appointment summary
    function updateAppointmentSummary() {
        if (selectedDoctor) {
            document.getElementById('summaryDoctor').textContent = selectedDoctor.full_name;
            document.getElementById('summaryDepartment').textContent = selectedDoctor.department;
        }
        if (selectedDate) {
            document.getElementById('summaryDate').textContent = selectedDate.toLocaleDateString();
        }
        if (selectedTime) {
            document.getElementById('summaryTime').textContent = selectedTime;
        }
    }

    // Navigation buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.closest('#dateTimeSelection')) {
                showSection(doctorSelection);
            } else if (btn.closest('#patientDetails')) {
                showSection(dateTimeSelection);
            }
        });
    });

    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.closest('#dateTimeSelection')) {
                if (!selectedDate || !selectedTime) {
                    alert('Please select both date and time');
                    return;
                }
                showSection(patientDetails);
            }
        });
    });

    // Update the form submission handler
    document.getElementById('patientForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedDoctor || !selectedDate || !selectedTime) {
            alert('Please complete all selections');
            return;
        }

        try {
            // Show loading state
            const submitBtn = e.target.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Booking...';
            submitBtn.disabled = true;

            const formData = {
                doctor_id: selectedDoctor.doctor_id,
                appointment_date: selectedDate.toISOString().split('T')[0],
                appointment_time: selectedTime,
                description: document.getElementById('description').value,
                patient: {
                    full_name: document.getElementById('fullName').value,
                    contact_number: document.getElementById('contactNumber').value,
                    email: document.getElementById('email').value,
                    adhar: document.getElementById('adhar').value,
                    gender: document.querySelector('input[name="gender"]:checked').value,
                    address: document.getElementById('address').value,
                    city: document.getElementById('city').value,
                    state: document.getElementById('state').value,
                    pin_code: document.getElementById('pinCode').value
                }
            };

            const response = await fetch('http://localhost:8080/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to book appointment');
            }

            // Show success message
            const successModal = document.createElement('div');
            successModal.className = 'success-modal';
            successModal.innerHTML = `
                <div class="success-content">
                    <i class="fas fa-check-circle"></i>
                    <h2>Booking Successful!</h2>
                    <p>Your appointment has been confirmed.</p>
                    <p>Appointment ID: ${result.appointment_id}</p>
                    <button onclick="window.location.href='index.html'">Return to Homepage</button>
                </div>
            `;
            document.body.appendChild(successModal);

            // Automatically redirect after 5 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 5000);

        } catch (error) {
            alert('Error booking appointment: ' + error.message);
        }
    });

    // Initialize the page
    showSection(doctorSelection);
});

// Function to fetch doctors from backend
async function fetchDoctors() {
    try {
        const response = await fetch('http://localhost:8080/api/doctors');
        const doctors = await response.json();
        return doctors;
    } catch (error) {
        console.error('Error fetching doctors:', error);
        return [];
    }
}

// Function to book appointment
async function bookAppointment(appointmentData) {
    try {
        const response = await fetch('http://localhost:8080/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
        });
        
        const result = await response.json();
        if (response.ok) {
            alert('Appointment booked successfully!');
            window.location.href = '/'; // Redirect to home page
        } else {
            throw new Error(result.message || 'Failed to book appointment');
        }
    } catch (error) {
        alert('Error booking appointment: ' + error.message);
    }
}

// Update the confirm appointment function
function confirmAppointment() {
    const selectedDoctor = document.querySelector('.doctor-card.selected');
    const selectedDate = document.getElementById('selected-date').textContent;
    const selectedTime = document.getElementById('selected-time').textContent;
    const patientName = document.querySelector('input[placeholder="Full Name"]').value;
    const phoneNumber = document.querySelector('input[placeholder="Phone Number"]').value;
    const concerns = document.querySelector('textarea').value;

    if (!selectedDoctor || !selectedDate || !selectedTime || !patientName || !phoneNumber) {
        alert('Please fill in all required fields');
        return;
    }

    const appointmentData = {
        doctor_id: parseInt(selectedDoctor.dataset.doctorId),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        description: concerns,
        patient: {
            full_name: patientName,
            contact_number: phoneNumber
        }
    };

    bookAppointment(appointmentData);
}

// Add retry functionality
window.retryFetch = async (department) => {
    const card = document.querySelector(`[data-department="${department}"]`);
    if (card) {
        card.click();
    }
}; 