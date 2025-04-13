document.addEventListener('DOMContentLoaded', () => {
    const dateRange = document.getElementById('dateRange');
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('appointmentsTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noAppointments = document.getElementById('noAppointments');

    let appointments = [];

    // Fetch appointments based on date range
    async function fetchAppointments(range) {
        try {
            loadingIndicator.style.display = 'block';
            noAppointments.style.display = 'none';
            tableBody.innerHTML = '';

            console.log(`Fetching appointments for range: ${range}`);
            const response = await fetch(`http://localhost:8080/api/appointments/list?range=${range}`);
            if (!response.ok) {
                console.error(`API returned status: ${response.status}`);
                const errorText = await response.text();
                console.error(`Error response: ${errorText}`);
                throw new Error(`Failed to fetch appointments: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('API response:', responseData);
            appointments = responseData;
            
            // Sort appointments by date and time
            appointments.sort((a, b) => {
                const dateA = new Date(a.appointment_date + 'T' + a.appointment_time);
                const dateB = new Date(b.appointment_date + 'T' + b.appointment_time);
                return dateA - dateB;
            });

            updateStats(appointments);
            displayAppointments(appointments);
        } catch (error) {
            console.error('Error details:', error);
            showError(`Failed to load appointments: ${error.message}`);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Make fetchAppointments available globally
    window.fetchAppointments = fetchAppointments;

    // Display appointments in table
    function displayAppointments(appointments) {
        tableBody.innerHTML = '';
        
        if (!appointments || appointments.length === 0) {
            noAppointments.style.display = 'block';
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <i class="fas fa-calendar-times"></i>
                        <p>No appointments found</p>
                    </td>
                </tr>`;
            return;
        }

        noAppointments.style.display = 'none';

        appointments.forEach(apt => {
            const doctorName = apt.doctor_name.startsWith('Dr.') ? 
                apt.doctor_name : 
                `Dr. ${apt.doctor_name}`;

            // Parse appointment date
            const appointmentDate = new Date(apt.appointment_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
            
            // Determine if appointment is in the future
            const isDisabled = appointmentDate.getTime() > today.getTime();

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${apt.appointment_id}</td>
                <td>${apt.patient_name}</td>
                <td>${doctorName}</td>
                <td>${formatDate(apt.appointment_date)}</td>
                <td><span class="status-badge status-${apt.status.toLowerCase()}">${apt.status}</span></td>
                <td class="action-cell">
                    <label class="checkbox-container" title="${isDisabled ? 'Future appointments cannot be marked as completed' : ''}">
                        <input type="checkbox" 
                               ${apt.status.toLowerCase() === 'completed' ? 'checked' : ''} 
                               onchange="updateAppointmentStatus(${apt.appointment_id}, this.checked)"
                               ${isDisabled ? 'disabled' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        const options = { 
            weekday: 'short',
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString(undefined, options);
    }

    // Format time
    function formatTime(timeString) {
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':');
            const time = new Date();
            time.setHours(hours, minutes);
            return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return timeString;
        }
    }

    // Update statistics
    function updateStats(appointments) {
        const now = new Date();
        const total = appointments.length;
        const upcoming = appointments.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= now && apt.status.toLowerCase() === 'scheduled';
        }).length;
        const completed = appointments.filter(apt => 
            apt.status.toLowerCase() === 'completed'
        ).length;

        document.getElementById('totalAppointments').textContent = total;
        document.getElementById('upcomingAppointments').textContent = upcoming;
        document.getElementById('completedAppointments').textContent = completed;
    }

    // Show error message
    function showError(message) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                </td>
            </tr>`;
    }

    // Event listeners
    dateRange.addEventListener('change', () => {
        fetchAppointments(dateRange.value);
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredAppointments = appointments.filter(apt => 
            apt.patient_name.toLowerCase().includes(searchTerm) ||
            apt.doctor_name.toLowerCase().includes(searchTerm) ||
            apt.appointment_id.toString().includes(searchTerm)
        );
        displayAppointments(filteredAppointments);
    });

    // Initial load
    fetchAppointments(dateRange.value);
});

// View appointment details
function viewAppointment(id) {
    // Implement appointment details view
    console.log('Viewing appointment:', id);
}

// Add this function to handle appointment status updates
async function updateAppointmentStatus(appointmentId, isCompleted) {
    try {
        const response = await fetch(`http://localhost:8080/api/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: isCompleted ? 'completed' : 'scheduled'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update appointment status');
        }

        // Refresh the appointments list using the global function
        const dateRangeElement = document.getElementById('dateRange');
        window.fetchAppointments(dateRangeElement.value);
    } catch (error) {
        console.error('Error updating appointment status:', error);
        alert('Failed to update appointment status. Please try again.');
    }
}

// Make updateAppointmentStatus available globally
window.updateAppointmentStatus = updateAppointmentStatus; 