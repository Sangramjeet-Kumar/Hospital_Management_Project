document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Update active tab
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show corresponding section
            const targetSection = document.getElementById(link.dataset.tab);
            sections.forEach(s => s.classList.remove('active'));
            targetSection.classList.add('active');

            // Load section data
            loadSectionData(link.dataset.tab);
        });
    });

    // Load initial dashboard data
    loadDashboardStats();
    loadRecentActivity();

    // Search functionality
    const searchInputs = document.querySelectorAll('.search-filter input');
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const section = e.target.closest('.content-section').id;
            filterData(section, searchTerm);
        });
    });

    // Date range filter for appointments
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('change', () => {
            loadAppointments(dateRange.value);
        });
    }
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('http://localhost:8080/api/admin/stats');
        const stats = await response.json();

        document.getElementById('totalAppointments').textContent = stats.totalAppointments;
        document.getElementById('totalPatients').textContent = stats.totalPatients;
        document.getElementById('totalDoctors').textContent = stats.totalDoctors;
        document.getElementById('completedAppointments').textContent = stats.completedAppointments;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load section specific data
async function loadSectionData(section) {
    switch (section) {
        case 'appointments':
            await loadAppointments('week');
            break;
        case 'patients':
            await loadPatients();
            break;
        case 'doctors':
            await loadDoctors();
            break;
    }
}

// Load appointments data
async function loadAppointments(range) {
    try {
        const response = await fetch(`http://localhost:8080/api/appointments/list?range=${range}`);
        const appointments = await response.json();
        displayAppointments(appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Load patients data
async function loadPatients() {
    try {
        const response = await fetch('http://localhost:8080/api/patients');
        const patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

// Display patients in table
function displayPatients(patients) {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = '';

    patients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${patient.patient_id}</td>
            <td>${patient.full_name}</td>
            <td>${patient.contact_number}</td>
            <td>${patient.email}</td>
            <td>${patient.gender}</td>
            <td>${formatDate(patient.last_visit)}</td>
            <td>
                <button class="action-btn view-btn" onclick="viewPatient(${patient.patient_id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" onclick="editPatient(${patient.patient_id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Format date helper function
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Filter data based on search term
function filterData(section, searchTerm) {
    const tbody = document.querySelector(`#${section} tbody`);
    const rows = tbody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('http://localhost:8080/api/admin/activity');
        const activities = await response.json();
        displayRecentActivity(activities);
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const activityList = document.querySelector('.activity-list');
    activityList.innerHTML = '';

    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-details">
                <p>${activity.description}</p>
                <small>${formatDate(activity.timestamp)}</small>
            </div>
        `;
        activityList.appendChild(item);
    });
}

// Helper function to get activity icon
function getActivityIcon(type) {
    const icons = {
        appointment: 'fa-calendar-check',
        patient: 'fa-user',
        doctor: 'fa-user-md',
        system: 'fa-cog'
    };
    return icons[type] || 'fa-info-circle';
}

// Update the displayAppointments function
function displayAppointments(appointments) {
    const container = document.querySelector('.table-container');
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<p class="no-data">No appointments found</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${appointments.map(apt => `
                <tr>
                    <td>#${apt.appointment_id}</td>
                    <td>${apt.patient_name}</td>
                    <td>Dr. ${apt.doctor_name}</td>
                    <td>${formatDate(apt.appointment_date)}</td>
                    <td>${apt.appointment_time}</td>
                    <td>
                        <span class="status-badge status-${apt.status.toLowerCase()}">
                            ${apt.status}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn view-btn" onclick="viewAppointment(${apt.appointment_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="updateAppointmentStatus(${apt.appointment_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    container.innerHTML = '';
    container.appendChild(table);
}

// Add styles for status badges
const styles = document.createElement('style');
styles.textContent = `
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 50px;
        font-size: 0.85rem;
        font-weight: 500;
    }
    .status-scheduled {
        background: #e3f2fd;
        color: #1976d2;
    }
    .status-completed {
        background: #e8f5e9;
        color: #2e7d32;
    }
    .status-cancelled {
        background: #ffebee;
        color: #c62828;
    }
    .action-btn {
        padding: 0.5rem;
        border: none;
        border-radius: 4px;
        margin: 0 0.25rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .view-btn {
        background: #e3f2fd;
        color: #1976d2;
    }
    .edit-btn {
        background: #e8f5e9;
        color: #2e7d32;
    }
    .action-btn:hover {
        opacity: 0.8;
        transform: translateY(-2px);
    }
`;
document.head.appendChild(styles); 