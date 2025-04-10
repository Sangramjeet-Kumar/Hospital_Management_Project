// Add global error handler
window.addEventListener('error', function(event) {
    console.error('JavaScript Error:', event.message, 'at', event.filename, 'line', event.lineno);
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing application...');
    
    // Initialize global data arrays
    window.bedInventoryData = window.bedInventoryData || [];
    window.bedAssignmentData = window.bedAssignmentData || [];
    window.patientsData = window.patientsData || [];
    
    // Initialize sidebar navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabName = link.dataset.tab;
            
            // Update active nav link
            navLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            
            // Show corresponding content section
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === tabName) {
                    section.classList.add('active');
                }
            });
            
            // Load section-specific data
            loadSectionData(tabName);
        });
    });
    
    // Initialize logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Perform logout actions (e.g., clear session, redirect)
            window.location.href = 'index.html';
        });
    }
    
    // Initialize dashboard on page load
    loadSectionData('dashboard');
    
    // Initialize tabs within beds section
    initializeBedsTabsNavigation();
    
    // Set up automatic refresh for bed assignments every 5 minutes
    setInterval(() => {
        // Only refresh data if we're on the beds tab
        const bedsSection = document.getElementById('beds');
        if (bedsSection && bedsSection.classList.contains('active')) {
            console.log('Auto-refreshing bed assignments...');
            loadBedAssignments();
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Set up bed assignment modal events
    setupBedAssignmentModal();
    
    // Set up new bed modal events
    setupNewBedModal();
    
    // Set up new patient modal events
    setupNewPatientModal();
    
    // Explicitly load bed assignments on initial page load
    loadBedAssignments();
    
    console.log('Application initialization complete');
});

// Setup the bed assignment modal
function setupBedAssignmentModal() {
    // Get modal elements
    const modal = document.getElementById('bedAssignmentModal');
    const closeModalBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('button[type="button"]');
    const assignmentForm = document.getElementById('bedAssignmentForm');
    
    // Set up event listeners
    closeModalBtn.addEventListener('click', closeBedAssignmentModal);
    cancelBtn.addEventListener('click', closeBedAssignmentModal);
    assignmentForm.addEventListener('submit', handleBedAssignmentSubmit);
    
    // Set up the "Add New Patient" button in the modal
    const addNewPatientBtn = document.getElementById('addNewPatientBtn');
    if (addNewPatientBtn) {
        addNewPatientBtn.addEventListener('click', () => {
            document.getElementById('patientSelectArea').style.display = 'none';
            document.getElementById('newPatientForm').style.display = 'block';
        });
    }
    
    // Set up the "Cancel" button in the new patient form
    const cancelNewPatientBtn = document.getElementById('cancelNewPatient');
    if (cancelNewPatientBtn) {
        cancelNewPatientBtn.addEventListener('click', () => {
            document.getElementById('newPatientForm').style.display = 'none';
            document.getElementById('patientSelectArea').style.display = 'block';
        });
    }
}

// Global variables to store data
window.patientsData = [];

// Fetch bed inventory data from the database
window.bedInventoryData = [];

// Function to fetch bed inventory from the server
async function fetchBedInventory() {
    try {
        console.log('Fetching bed inventory from database...');
        // First try to fetch from API
        const response = await fetch('http://localhost:8080/api/beds/inventory');
        
        if (response.ok) {
            const data = await response.json();
            console.log('Successfully loaded bed inventory from API:', data);
            
            // Store in global variable
            window.bedInventoryData = data;
            
            // Display the data
            displayBedInventory(window.bedInventoryData);
            
            return data;
        } else {
            console.warn(`Failed to fetch bed inventory from API: ${response.status} ${response.statusText}`);
            throw new Error(`API returned ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching bed inventory from API:', error);
        return [];
    }
}

// Initialize bed inventory
fetchBedInventory();
console.log(`Loaded ${window.bedInventoryData.length} beds from local storage or default data`);

// Initialize bed assignments from localStorage
window.bedAssignmentData = loadBedAssignmentsFromStorage() || [];
console.log(`Loaded ${window.bedAssignmentData.length} bed assignments from local storage`);

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

// Initialize beds tabs
initializeBedsTabsNavigation();

// Direct event listener for New Assignment button
const newAssignmentBtn = document.querySelector('#bedAssignments .add-btn');
if (newAssignmentBtn) {
    newAssignmentBtn.addEventListener('click', function() {
        openBedAssignmentModal();
        console.log("New Assignment button clicked");
    });
}

// Setup modal close buttons
const closeModalBtn = document.querySelector('.close-modal');
const cancelBtn = document.getElementById('cancelAssignment');
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeBedAssignmentModal);
}
if (cancelBtn) {
    cancelBtn.addEventListener('click', closeBedAssignmentModal);
}

// Setup form submission
const assignmentForm = document.getElementById('bedAssignmentForm');
if (assignmentForm) {
    assignmentForm.addEventListener('submit', handleBedAssignmentSubmit);
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Initially set static values as shown in the screenshot
        document.getElementById('totalAppointments').textContent = '4';
        document.getElementById('totalPatients').textContent = '4';
        document.getElementById('totalDoctors').textContent = '17';
        document.getElementById('availableBeds').textContent = '24';
        
        // Try to fetch from backend API
        const response = await fetch('http://localhost:8080/api/admin/stats');
        if (response.ok) {
        const stats = await response.json();

            // Only update if we got valid values
            if (stats.totalAppointments !== undefined) 
        document.getElementById('totalAppointments').textContent = stats.totalAppointments;
            if (stats.totalPatients !== undefined) 
        document.getElementById('totalPatients').textContent = stats.totalPatients;
            if (stats.totalDoctors !== undefined) 
        document.getElementById('totalDoctors').textContent = stats.totalDoctors;
            if (stats.availableBeds !== undefined) 
                document.getElementById('availableBeds').textContent = stats.availableBeds;
        }

        // Load bed stats as well
        loadBedStatsForDashboard();
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Leave the default values displayed
    }
}

// Load bed stats for dashboard
async function loadBedStatsForDashboard() {
    try {
        const bedStats = await fetchBedStats();
        if (bedStats) {
            document.getElementById('availableBeds').textContent = bedStats.vacantBeds;
        }
    } catch (error) {
        console.error('Error loading bed stats for dashboard:', error);
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
        case 'departments':
            loadDepartments();
            break;
        case 'beds':
            await loadBedSection();
            break;
    }
}

// Initialize beds tabs navigation
function initializeBedsTabsNavigation() {
    const tabButtons = document.querySelectorAll('.beds-tab-btn');
    const tabPanes = document.querySelectorAll('.beds-tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show corresponding tab pane
            const targetPane = document.getElementById(button.dataset.tab);
            tabPanes.forEach(pane => pane.classList.remove('active'));
            targetPane.classList.add('active');
            
            // Refresh data when switching to specific tabs
            if (button.dataset.tab === 'bedAssignments') {
                console.log('Loading bed assignments data');
                loadBedAssignments();
            } else if (button.dataset.tab === 'bedInventory') {
                console.log('Loading bed inventory data');
                loadBedInventory();
            }
        });
    });
}

// Load beds section data
async function loadBedSection() {
    try {
        // Load bed stats
        await loadBedStats();
        
        // Load bed types
        await loadBedTypes();
        
        // Load bed inventory
        await loadBedInventory();
        
        // Load bed assignments
        await loadBedAssignments();
        
        // Initialize bed occupancy chart
        initializeBedOccupancyChart();
        
        // Set up event listeners for bed section filters
        setupBedSectionFilters();
    } catch (error) {
        console.error('Error loading bed section:', error);
    }
}

// Fetch bed statistics
async function fetchBedStats() {
    try {
        // First sync the BedsCount table to ensure accurate stats
        await syncBedsCount();
        
        // Then fetch the stats
        const response = await fetch('http://localhost:8080/api/beds/stats');
        if (!response.ok) {
            throw new Error(`Failed to fetch bed stats: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded bed stats from API:', data);
        
        // Update the UI with the stats
        updateBedStatsDisplay(data);
        return data;
    } catch (error) {
        console.error('Error fetching bed stats from API:', error);
        
        // Calculate stats from local data as fallback
        const localStats = calculateLocalBedStats();
        updateBedStatsDisplay(localStats);
        return localStats;
    }
}

// Load bed statistics
async function loadBedStats() {
    const bedStats = await fetchBedStats();
    
    if (bedStats) {
        // Update stat counters
        document.getElementById('totalBeds').textContent = bedStats.totalBeds;
        document.getElementById('occupiedBeds').textContent = bedStats.occupiedBeds;
        document.getElementById('vacantBeds').textContent = bedStats.vacantBeds;
    }
}

// Load bed types
async function loadBedTypes() {
    try {
        console.log('Loading bed types from inventory data');
        
        // Get unique bed types from inventory data
        const bedTypes = [];
        const uniqueTypes = [...new Set(window.bedInventoryData.map(bed => bed.bedType))];
        
        uniqueTypes.forEach(bedType => {
            bedTypes.push({
                bedType,
                description: getBedTypeDescription(bedType),
                icon: getBedTypeIcon(bedType)
            });
        });
        
        // If no bed types found in inventory, use default types
        if (bedTypes.length === 0) {
            bedTypes.push(
                { bedType: 'General', description: 'Standard hospital bed for general patients', icon: 'fa-bed' },
                { bedType: 'Semi-Private', description: '2 patient room with shared bathroom', icon: 'fa-bed' },
                { bedType: 'Private', description: 'Private room with personal bathroom', icon: 'fa-bed' },
                { bedType: 'ICU', description: 'Intensive Care Unit bed with monitoring', icon: 'fa-procedures' },
                { bedType: 'Pediatric', description: 'Beds specially designed for children', icon: 'fa-child-reaching' }
            );
        }
        
        displayBedTypes(bedTypes);
        populateBedTypeFilter(bedTypes);
    } catch (error) {
        console.error('Error loading bed types:', error);
    }
}

// Helper function to get bed type description
function getBedTypeDescription(type) {
    const descriptions = {
        'General': 'Standard hospital bed for general patients',
        'Semi-Private': '2 patient room with shared bathroom',
        'Private': 'Private room with personal bathroom',
        'ICU': 'Intensive Care Unit bed with monitoring',
        'Pediatric': 'Beds specially designed for children'
    };
    
    return descriptions[type] || `${type} bed`;
}

// Helper function to get bed type icon
function getBedTypeIcon(type) {
    const icons = {
        'General': 'fa-bed',
        'Semi-Private': 'fa-bed',
        'Private': 'fa-bed',
        'ICU': 'fa-procedures',
        'Pediatric': 'fa-child-reaching'
    };
    
    return icons[type] || 'fa-bed';
}

// Display bed types
function displayBedTypes(bedTypes) {
    const bedTypesGrid = document.getElementById('bedTypesGrid');
    bedTypesGrid.innerHTML = '';
    
    if (!bedTypes || bedTypes.length === 0) {
        bedTypesGrid.innerHTML = '<div class="no-data">No bed types found</div>';
        return;
    }
    
    bedTypes.forEach(type => {
        const card = document.createElement('div');
        card.className = 'bed-type-card';
        card.innerHTML = `
            <div class="bed-type-icon">
                <i class="fas ${type.icon}"></i>
            </div>
            <h4>${type.bedType}</h4>
            <p>${type.description}</p>
        `;
        bedTypesGrid.appendChild(card);
    });
}

// Populate bed type filter
function populateBedTypeFilter(bedTypes) {
    const filter = document.getElementById('bedTypeFilter');
    
    // Clear existing options except for the first one
    while (filter.options.length > 1) {
        filter.remove(1);
    }
    
    // Add options based on bed types
    bedTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.bedType;
        option.textContent = type.bedType;
        filter.appendChild(option);
    });
}

// Update bed statistics based on current inventory
function updateBedStats() {
    if (!window.bedInventoryData) return;
    
    const totalBeds = window.bedInventoryData.length;
    const occupiedBeds = window.bedInventoryData.filter(bed => bed.status === 'occupied').length;
    const vacantBeds = window.bedInventoryData.filter(bed => bed.status === 'available').length;
    
    // Update UI
    const totalBedsElement = document.getElementById('totalBeds');
    const occupiedBedsElement = document.getElementById('occupiedBeds');
    const vacantBedsElement = document.getElementById('vacantBeds');
    const availableBedsElement = document.getElementById('availableBeds');
    
    if (totalBedsElement) totalBedsElement.textContent = totalBeds;
    if (occupiedBedsElement) occupiedBedsElement.textContent = occupiedBeds;
    if (vacantBedsElement) vacantBedsElement.textContent = vacantBeds;
    if (availableBedsElement) availableBedsElement.textContent = vacantBeds; // Update dashboard stat
    
    // Update chart
    initializeBedOccupancyChart();
    
    console.log(`Updated bed stats: Total: ${totalBeds}, Occupied: ${occupiedBeds}, Vacant: ${vacantBeds}`);
}

// Function to update bed stats display
function updateBedStatsDisplay(stats) {
    if (!stats) return;
    
    // Update UI elements
    const totalBedsElement = document.getElementById('totalBeds');
    const occupiedBedsElement = document.getElementById('occupiedBeds');
    const vacantBedsElement = document.getElementById('vacantBeds');
    const availableBedsElement = document.getElementById('availableBeds');
    
    if (totalBedsElement && stats.totalBeds !== undefined) totalBedsElement.textContent = stats.totalBeds;
    if (occupiedBedsElement && stats.occupiedBeds !== undefined) occupiedBedsElement.textContent = stats.occupiedBeds;
    if (vacantBedsElement && stats.vacantBeds !== undefined) vacantBedsElement.textContent = stats.vacantBeds;
    if (availableBedsElement && stats.vacantBeds !== undefined) availableBedsElement.textContent = stats.vacantBeds;
    
    console.log(`Updated bed stats display: Total: ${stats.totalBeds}, Occupied: ${stats.occupiedBeds}, Vacant: ${stats.vacantBeds}`);
}

// Load bed inventory
async function loadBedInventory() {
    try {
        console.log('Loading bed inventory...');
        
        // If we already have data in the global variable, use it
        if (window.bedInventoryData && window.bedInventoryData.length > 0) {
            console.log(`Using existing bed inventory data (${window.bedInventoryData.length} beds)`);
            displayBedInventory(window.bedInventoryData);
        } else {
            // Otherwise fetch fresh data
            console.log('No existing data, fetching from server...');
            await fetchBedInventory();
        }
        
        // Update bed stats based on current inventory
        updateBedStats();
    } catch (error) {
        console.error('Error loading bed inventory:', error);
        const container = document.getElementById('bedInventoryTableBody');
        container.innerHTML = `<tr><td colspan="5" class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
    }
}

// Display bed inventory
function displayBedInventory(inventory) {
    const tbody = document.getElementById('bedInventoryTableBody');
    tbody.innerHTML = '';
    
    if (!inventory || inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data"><i class="fas fa-info-circle"></i> No beds found</td></tr>';
        return;
    }
    
    inventory.forEach(bed => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${bed.bedID}</td>
            <td>${bed.hospitalName}</td>
            <td>${bed.bedType}</td>
            <td><span class="bed-status bed-status-${bed.status}">${capitalizeFirstLetter(bed.status)}</span></td>
            <td>
                <button class="action-btn view-btn" title="View details" onclick="viewBed(${bed.bedID})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="Edit bed" onclick="editBed(${bed.bedID})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Fetch bed assignments from the database
async function fetchBedAssignments() {
    console.log('Fetching bed assignments from database...');
    
    try {
        const response = await fetch('http://localhost:8080/api/beds/assignments');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch bed assignments: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched bed assignments from database:', data);
        
        // Update the global variable
        window.bedAssignmentData = data;
        
        // Update the UI
        displayBedAssignments(data);
        
        return data;
    } catch (error) {
        console.error('Error fetching bed assignments:', error);
        
        // Show error in the UI
        const tbody = document.getElementById('bedAssignmentsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="error-message">
                <i class="fas fa-exclamation-circle"></i> 
                Failed to load bed assignments: ${error.message}
            </td></tr>`;
        }
        
        // Return empty array on error
        return [];
    }
}

// Display bed assignments - FIXED VERSION
function displayBedAssignments(assignments) {
    const tbody = document.getElementById('bedAssignmentsTableBody');
    if (!tbody) {
        console.error('Bed assignments table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!assignments || assignments.length === 0) {
        tbody.innerHTML = `<tr>
            <td colspan="8" class="no-data">
                <i class="fas fa-info-circle"></i> 
                No bed assignments found. Click "New Assignment" to assign a bed to a patient.
            </td>
        </tr>`;
        return;
    }
    
    console.log(`Displaying ${assignments.length} bed assignments`);
    
    // Get current date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
    
    assignments.forEach(assignment => {
        // Determine the actual status based on dates, not just the stored status
        let isCurrentlyAssigned = assignment.status === 'current';
        
        // If there's a discharge date, check if it's in the future or past
        if (assignment.dischargeDate) {
            const dischargeDate = new Date(assignment.dischargeDate);
            dischargeDate.setHours(0, 0, 0, 0); // Set to beginning of day
            
            // If discharge date is in the past, it should be "Discharged"
            // If discharge date is today or in the future, it should be "Current"
            isCurrentlyAssigned = dischargeDate >= today;
        }
        
        // Set the appropriate status text and CSS class
        const statusText = isCurrentlyAssigned ? 'Current' : 'Discharged';
        const statusClass = isCurrentlyAssigned ? 'status-scheduled' : 'status-completed';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${assignment.assignmentID}</td>
            <td>#${assignment.bedID}</td>
            <td>${assignment.patientName} (#${assignment.patientID})</td>
            <td>${assignment.bedType}</td>
            <td>${formatDate(assignment.admissionDate)}</td>
            <td>${assignment.dischargeDate ? formatDate(assignment.dischargeDate) : 'N/A'}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <button class="action-btn view-btn" title="View details" onclick="viewAssignment(${assignment.assignmentID})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="${isCurrentlyAssigned ? 'Discharge patient' : 'View history'}" onclick="editAssignment(${assignment.assignmentID})">
                    <i class="fas fa-${isCurrentlyAssigned ? 'edit' : 'history'}"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize bed occupancy chart
function initializeBedOccupancyChart() {
    const ctx = document.getElementById('bedOccupancyChart').getContext('2d');
    
    // First, check if the chart instance exists on window and safely destroy it
    try {
        if (window.bedOccupancyChart) {
            window.bedOccupancyChart.destroy();
            window.bedOccupancyChart = null;
        }
    } catch (error) {
        console.error('Error destroying existing chart:', error);
        // If there was an error destroying the chart, ensure it's set to null
        window.bedOccupancyChart = null;
    }
    
    // Create the chart
    fetchBedStats().then(stats => {
        if (!stats || !stats.bedTypes) {
            console.warn('No bed statistics available for chart');
            return;
        }
        
        try {
            const bedTypes = stats.bedTypes;
            const labels = bedTypes.map(type => type.type);
            const occupiedData = bedTypes.map(type => type.occupied);
            const vacantData = bedTypes.map(type => type.vacant);
            
            window.bedOccupancyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Occupied',
                            data: occupiedData,
                            backgroundColor: '#fa5252',
                            borderColor: '#fa5252',
                            borderWidth: 1
                        },
                        {
                            label: 'Vacant',
                            data: vacantData,
                            backgroundColor: '#40c057',
                            borderColor: '#40c057',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Bed Types'
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Beds'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Bed Occupancy by Type',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
            console.log('Bed occupancy chart successfully created');
        } catch (error) {
            console.error('Error creating bed occupancy chart:', error);
        }
    }).catch(error => {
        console.error('Error fetching bed stats for chart:', error);
    });
}

// Setup bed section filters
function setupBedSectionFilters() {
    // Bed inventory filter
    const bedTypeFilter = document.getElementById('bedTypeFilter');
    if (bedTypeFilter) {
        bedTypeFilter.addEventListener('change', filterBedInventory);
    }
    
    // Bed search
    const bedSearch = document.getElementById('bedSearch');
    if (bedSearch) {
        bedSearch.addEventListener('input', filterBedInventory);
    }
    
    // Bed assignment status filter
    const assignmentStatusFilter = document.getElementById('assignmentStatusFilter');
    if (assignmentStatusFilter) {
        assignmentStatusFilter.addEventListener('change', filterBedAssignments);
    }
    
    // Assignment search
    const assignmentSearch = document.getElementById('assignmentSearch');
    if (assignmentSearch) {
        assignmentSearch.addEventListener('input', filterBedAssignments);
    }
    
    // Setup admission date validation
    const admissionDateInput = document.getElementById('admissionDate');
    const dischargeDateInput = document.getElementById('dischargeDate');
    if (admissionDateInput && dischargeDateInput) {
        // Set default admission date to today
        const today = new Date().toISOString().split('T')[0];
        admissionDateInput.value = today;
        admissionDateInput.min = today;
        
        // Ensure discharge date is after admission date
        admissionDateInput.addEventListener('change', function() {
            dischargeDateInput.min = this.value;
        });
    }
}

// Filter bed inventory
function filterBedInventory() {
    const bedTypeFilter = document.getElementById('bedTypeFilter');
    const bedSearch = document.getElementById('bedSearch');
    const rows = document.querySelectorAll('#bedInventoryTableBody tr');
    
    const bedType = bedTypeFilter.value.toLowerCase();
    const searchTerm = bedSearch.value.toLowerCase();
    
    rows.forEach(row => {
        const rowBedType = row.cells[2].textContent.toLowerCase();
        const rowText = row.textContent.toLowerCase();
        
        const matchesBedType = bedType === '' || rowBedType === bedType;
        const matchesSearch = searchTerm === '' || rowText.includes(searchTerm);
        
        row.style.display = matchesBedType && matchesSearch ? '' : 'none';
    });
}

// Filter bed assignments - FIXED VERSION
function filterBedAssignments() {
    const assignmentStatusFilter = document.getElementById('assignmentStatusFilter');
    const assignmentSearch = document.getElementById('assignmentSearch');
    const rows = document.querySelectorAll('#bedAssignmentsTableBody tr');
    
    const statusFilter = assignmentStatusFilter.value.toLowerCase();
    const searchTerm = assignmentSearch.value.toLowerCase();
    
    // Get current date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for proper comparison
    
    rows.forEach(row => {
        // Find the discharge date cell (index 5) and status cell (index 6)
        const dischargeDateText = row.cells[5].textContent.trim();
        let isCurrentlyAssigned = row.cells[6].textContent.trim().toLowerCase() === 'current';
        
        // Re-evaluate the status based on the discharge date
        if (dischargeDateText && dischargeDateText !== 'N/A') {
            const dischargeDate = new Date(dischargeDateText);
            dischargeDate.setHours(0, 0, 0, 0);
            isCurrentlyAssigned = dischargeDate >= today;
        }
        
        // Current status based on our determination (not the displayed text)
        const currentStatus = isCurrentlyAssigned ? 'current' : 'discharged';
        
        // Check if this row matches our filter criteria
        const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
        const matchesSearch = searchTerm === '' || row.textContent.toLowerCase().includes(searchTerm);
        
        row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
    });
}

// Modified open modal function with more detailed diagnostics
function openBedAssignmentModal() {
    console.log("Opening bed assignment modal - FIX VERSION");
    
    // Ensure we have our data arrays initialized
    if (!window.patientsData) window.patientsData = [];
    if (!window.bedInventoryData) window.bedInventoryData = [];
    if (!window.bedAssignmentData) window.bedAssignmentData = [];
    
    // Show the modal first to ensure it's visible
    const modal = document.getElementById('bedAssignmentModal');
    if (modal) {
        console.log("Making modal visible immediately");
        modal.classList.add('active');
        modal.style.display = 'block';
    } else {
        console.error("Modal element not found!");
        alert("Error: The bed assignment modal could not be found on the page.");
        return;
    }
    
    // First, ensure we have patient data
    ensurePatientsData().then(() => {
        console.log("Patients loaded, populating dropdown");
        populatePatientDropdown();
    }).catch(error => {
        console.error('Failed to load patients:', error);
        showAssignmentError('Failed to load patient data. Please try again.');
    });
    
    // Always fetch fresh bed data from the database
    console.log("Fetching fresh bed data from database");
    fetch('http://localhost:8080/api/beds/inventory')
        .then(response => {
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then(beds => {
            console.log(`Direct fetch retrieved ${beds.length} beds from database`);
            // Update the global data
            window.bedInventoryData = beds;
            // Populate the dropdown
            populateAvailableBedsDropdown();
        })
        .catch(error => {
            console.error('Error directly fetching beds:', error);
            showAssignmentError(`Failed to load beds: ${error.message}. Please try again.`);
        });
    
    // Reset the form
    const form = document.getElementById('bedAssignmentForm');
    if (form) {
        form.reset();
        
        // Remove any existing event listeners to prevent duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Add the submit event listener
        newForm.addEventListener('submit', handleBedAssignmentSubmit);
    }
    
    // Set default admission date to today
    const admissionDateInput = document.getElementById('admissionDate');
    if (admissionDateInput) {
        const today = new Date().toISOString().split('T')[0];
        admissionDateInput.value = today;
        admissionDateInput.min = today;
    }
    
    // Clear any previous error messages
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

// Function to close bed assignment modal
function closeBedAssignmentModal() {
    console.log('Closing bed assignment modal');
    
    const modal = document.getElementById('bedAssignmentModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    } else {
        console.error('Bed assignment modal element not found when trying to close');
    }
    
    // Reset form
    const form = document.getElementById('bedAssignmentForm');
    if (form) {
        form.reset();
    }
    
    // Clear error messages
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
    
    // Reset any select validation styling
    const selects = document.querySelectorAll('#bedAssignmentForm select');
    selects.forEach(select => {
        select.classList.remove('has-error');
        select.classList.remove('is-valid');
    });
}

// Populate patient dropdown for bed assignment modal - FIXED FINAL VERSION
function populatePatientDropdown() {
    console.log('Starting patient dropdown population - FIXED EMPTY TABLE VERSION');
    const patientSelect = document.getElementById('patientSelect');
    if (!patientSelect) {
        console.error('Patient select element not found');
        showAssignmentError('Internal error: Patient dropdown not found');
        return;
    }
    
    // Clear ALL existing options
    patientSelect.innerHTML = '';
    
    // Add the default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Patient';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    patientSelect.appendChild(defaultOption);
    
    // Add loading message
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.disabled = true;
    loadingOption.textContent = 'Loading patients from database...';
    patientSelect.appendChild(loadingOption);
    
    // First fetch all patients
    console.log('Fetching all patients first');
    
    fetch('http://localhost:8080/api/patients')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch patients: ${response.status}`);
            return response.json();
        })
        .then(patients => {
            console.log(`Retrieved ${patients.length} total patients from database`);
            
            if (!patients || patients.length === 0) {
                // Clean the dropdown and show no patients available
                patientSelect.innerHTML = '';
                patientSelect.appendChild(defaultOption);
                
                const noOption = document.createElement('option');
                noOption.value = '';
                noOption.textContent = 'No patients available in database';
                noOption.disabled = true;
                patientSelect.appendChild(noOption);
                showAssignmentError('No patients available in the database. Please add patients first.');
                return;
            }
            
            // Now fetch bed assignments to filter out patients who already have beds
            fetch('http://localhost:8080/api/beds/assignments')
                .then(response => {
                    // If we can't fetch assignments (empty table, etc), we'll show all patients
                    if (!response.ok) {
                        console.log('Could not fetch bed assignments - showing all patients');
                        return { json: () => Promise.resolve([]) }; // Return empty array if can't fetch
                    }
                    return response.json();
                })
                .catch(error => {
                    console.log('Error fetching assignments, showing all patients:', error);
                    return []; // Return empty array on error
                })
                .then(assignments => {
                    // Clean the dropdown
                    patientSelect.innerHTML = '';
                    patientSelect.appendChild(defaultOption);
                    
                    // Create a Set of patient IDs who already have active bed assignments
                    const patientsWithBeds = new Set();
                    
                    if (Array.isArray(assignments) && assignments.length > 0) {
                        // Filter only current assignments
                        const currentAssignments = assignments.filter(a => a && a.status === 'current');
                        
                        // Get today's date for comparison
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // Add patients with current assignments to the set
                        currentAssignments.forEach(assignment => {
                            // Check if assignment has a discharge date in the future
                            let isActive = true;
                            if (assignment.dischargeDate) {
                                const dischargeDate = new Date(assignment.dischargeDate);
                                dischargeDate.setHours(0, 0, 0, 0);
                                isActive = dischargeDate >= today;
                            }
                            
                            // If active assignment, add to exclusion set
                            if (isActive) {
                                patientsWithBeds.add(String(assignment.patientID));
                            }
                        });
                    }
                    
                    console.log(`Found ${patientsWithBeds.size} patients with active bed assignments`);
                    
                    // Filter patients who don't have active bed assignments
                    let availablePatients = patients;
                    if (patientsWithBeds.size > 0) {
                        availablePatients = patients.filter(patient => 
                            !patientsWithBeds.has(String(patient.patient_id))
                        );
                    }
                    
                    console.log(`After filtering, ${availablePatients.length} patients are available for bed assignment`);
                    
                    if (availablePatients.length === 0) {
                        const noOption = document.createElement('option');
                        noOption.value = '';
                        noOption.textContent = 'All patients already have beds assigned';
                        noOption.disabled = true;
                        patientSelect.appendChild(noOption);
                        showAssignmentError('All patients in the database already have bed assignments. Please discharge a patient or add a new patient.');
                        return;
                    }
                    
                    // Create a Set to track patient IDs we've already added to prevent duplicates
                    const addedIds = new Set();
                    
                    // Sort by name for better user experience
                    availablePatients.sort((a, b) => a.full_name.localeCompare(b.full_name));
                    
                    // Add each available patient to dropdown
                    availablePatients.forEach(patient => {
                        // Skip if we've already added this patient to avoid duplicates
                        if (addedIds.has(String(patient.patient_id))) {
                            console.log(`Skipping duplicate patient ID: ${patient.patient_id}`);
                            return;
                        }
                        
                        const option = document.createElement('option');
                        option.value = patient.patient_id;
                        option.textContent = `${patient.full_name} (ID: ${patient.patient_id})`;
                        patientSelect.appendChild(option);
                        
                        // Track that we've added this patient
                        addedIds.add(String(patient.patient_id));
                    });
                    
                    console.log(`Added ${addedIds.size} unique available patients to dropdown`);
                })
                .catch(error => {
                    console.error('Error processing patients or assignments:', error);
                    
                    // On error, still try to show all patients
                    patientSelect.innerHTML = '';
                    patientSelect.appendChild(defaultOption);
                    
                    const addedIds = new Set();
                    patients.forEach(patient => {
                        if (addedIds.has(String(patient.patient_id))) return;
                        
                        const option = document.createElement('option');
                        option.value = patient.patient_id;
                        option.textContent = `${patient.full_name} (ID: ${patient.patient_id})`;
                        patientSelect.appendChild(option);
                        
                        addedIds.add(String(patient.patient_id));
                    });
                    
                    console.log(`Added all ${addedIds.size} patients to dropdown after error`);
                });
        })
        .catch(error => {
            console.error('Error fetching patients:', error);
            
            // Clear the dropdown and add an error message
            patientSelect.innerHTML = '';
            patientSelect.appendChild(defaultOption);
            
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error loading patients';
            errorOption.disabled = true;
            patientSelect.appendChild(errorOption);
            
            showAssignmentError(`Failed to load patients: ${error.message}`);
        });
}

// Ensure patients data is loaded and available
async function ensurePatientsData() {
    console.log('Fetching patients data from database');
    return await loadPatients();
}

// Load patients data from API
async function loadPatients() {
    try {
        console.log('Loading patients data from database...');
        const tbody = document.getElementById('patientsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-data"><i class="fas fa-spinner fa-spin"></i> Loading patients...</td></tr>';
        }
        
        // Fetch patients from the server using the correct API endpoint
        const response = await fetch('http://localhost:8080/api/patients');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch patients: ${response.status} ${response.statusText}`);
        }
        
        const patients = await response.json();
        console.log(`Successfully loaded ${patients.length} patients from database`);
        
        // Normalize patient data to ensure consistent property names
        const normalizedPatients = patients.map(patient => {
            return {
                patient_id: patient.patient_id,
                full_name: patient.full_name,
                contact_number: patient.contact_number,
                email: patient.email,
                gender: patient.gender,
                last_visit: patient.last_visit
            };
        });
        
        // Store the normalized data globally for reuse
        window.patientsData = normalizedPatients;
        console.log('Normalized patient data stored globally:', window.patientsData);
        
        // Display the patients in the table if we're on the patients tab
        if (tbody) {
            displayPatients(window.patientsData);
        }
        
        return window.patientsData;
    } catch (error) {
        console.error('Error in loadPatients:', error);
        const tbody = document.getElementById('patientsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
        }
        return [];
    }
}

// Load doctors data
async function loadDoctors() {
    try {
        const tbody = document.getElementById('doctorsTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-data"><i class="fas fa-spinner fa-spin"></i> Loading doctors...</td></tr>';
        
        const response = await fetch('http://localhost:8080/api/doctors');
        if (!response.ok) {
            throw new Error(`Failed to fetch doctors: ${response.status}`);
        }
        
        const doctors = await response.json();
        displayDoctors(doctors);
    } catch (error) {
        console.error('Error loading doctors:', error);
        const tbody = document.getElementById('doctorsTableBody');
        tbody.innerHTML = `<tr><td colspan="6" class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
    }
}

// Display patients in table
function displayPatients(patients) {
    const tbody = document.getElementById('patientsTableBody');
    tbody.innerHTML = '';

    if (!patients || patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-info-circle"></i> No patients found</td></tr>';
        return;
    }

    patients.forEach(patient => {
        const row = document.createElement('tr');
        // Handle null last_visit values
        const lastVisitDisplay = patient.last_visit && patient.last_visit !== 'null' ? 
            formatDate(patient.last_visit) : 'N/A';
            
        row.innerHTML = `
            <td>#${patient.patient_id}</td>
            <td>${patient.full_name}</td>
            <td>${patient.contact_number}</td>
            <td>${patient.email}</td>
            <td>${patient.gender}</td>
            <td>${lastVisitDisplay}</td>
            <td>
                <button class="action-btn view-btn" title="View details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="Edit patient">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Display doctors in table
function displayDoctors(doctors) {
    const tbody = document.getElementById('doctorsTableBody');
    tbody.innerHTML = '';

    if (!doctors || doctors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-info-circle"></i> No doctors found</td></tr>';
        return;
    }

    doctors.forEach(doctor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${doctor.doctor_id}</td>
            <td>Dr. ${doctor.full_name}</td>
            <td>${doctor.department}</td>
            <td>${doctor.contact_number}</td>
            <td>${doctor.email}</td>
            <td>
                <button class="action-btn view-btn" title="View details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="Edit doctor">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load departments
function loadDepartments() {
    const departments = [
        { id: 1, name: 'Cardiology', icon: 'fa-heart-pulse', doctorCount: 4 },
        { id: 2, name: 'Neurology', icon: 'fa-brain', doctorCount: 4 },
        { id: 3, name: 'Orthopedics', icon: 'fa-bone', doctorCount: 3 },
        { id: 4, name: 'Pediatrics', icon: 'fa-child', doctorCount: 3 },
        { id: 5, name: 'Ophthalmology', icon: 'fa-eye', doctorCount: 3 }
    ];
    
    const container = document.querySelector('.departments-grid');
    container.innerHTML = '';
    
    departments.forEach(dept => {
        const card = document.createElement('div');
        card.className = 'department-card';
        card.innerHTML = `
            <div class="department-icon">
                <i class="fas ${dept.icon}"></i>
            </div>
            <h3>${dept.name}</h3>
            <p>${dept.doctorCount} Doctors</p>
        `;
        container.appendChild(card);
    });
}

// Format date helper function
function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Filter data based on search term
function filterData(section, searchTerm) {
    const tbody = document.querySelector(`#${section} tbody`);
    if (!tbody) return;
    
    const rows = tbody.getElementsByTagName('tr');

    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Load recent activity
async function loadRecentActivity() {
    try {
        // Sample activity data if API fails
        const sampleActivities = [
            { type: 'appointment', description: 'New appointment booked for Dr. Sarah Johnson', timestamp: new Date() },
            { type: 'patient', description: 'New patient registered: Harry Singh', timestamp: new Date() },
            { type: 'appointment', description: 'Appointment status updated to completed', timestamp: new Date() }
        ];
        
        // Display sample activities initially
        displayRecentActivity(sampleActivities);
        
        // Try to load from API
        const response = await fetch('http://localhost:8080/api/admin/activity');
        if (response.ok) {
        const activities = await response.json();
            if (activities && activities.length > 0) {
        displayRecentActivity(activities);
            }
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        // Sample data is already displayed, so no need to handle error here
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const activityList = document.getElementById('recentActivity');
    activityList.innerHTML = '';

    if (!activities || activities.length === 0) {
        activityList.innerHTML = '<div class="no-data">No recent activity</div>';
        return;
    }

    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-details">
                <p>${activity.description}</p>
                <small>${formatDate(activity.timestamp) || 'Just now'}</small>
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

// Display appointments function
function displayAppointments(appointments) {
    const container = document.querySelector('#appointments .table-container');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<div class="no-data"><i class="fas fa-calendar-times"></i> No appointments found</div>';
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
                    <td>${apt.doctor_name.startsWith('Dr.') ? apt.doctor_name : 'Dr. ' + apt.doctor_name}</td>
                    <td>${formatDate(apt.appointment_date)}</td>
                    <td>${apt.appointment_time}</td>
                    <td>
                        <span class="status-badge status-${apt.status?.toLowerCase() || 'scheduled'}">
                            ${apt.status || 'Scheduled'}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn view-btn" title="View details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit-btn" title="Edit status">
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

// Add global event listeners
window.viewPatient = function(patientId) {
    alert(`Viewing patient #${patientId}`);
};

window.editPatient = function(patientId) {
    alert(`Editing patient #${patientId}`);
};

window.viewAppointment = function(appointmentId) {
    alert(`Viewing appointment #${appointmentId}`);
};

window.updateAppointmentStatus = function(appointmentId) {
    alert(`Updating status for appointment #${appointmentId}`);
};

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

// Add a global window.viewBed function
window.viewBed = function(bedId) {
    console.log(`Viewing bed #${bedId}`);
    
    // Find the bed in the inventory
    const bed = window.bedInventoryData.find(b => b.bedID == bedId);
    if (!bed) {
        alert('Bed not found');
        return;
    }
    
    // Show bed details
    const details = `
        Bed Details:
        - Bed ID: ${bed.bedID}
        - Hospital: ${bed.hospitalName}
        - Bed Type: ${bed.bedType}
        - Status: ${capitalizeFirstLetter(bed.status)}
    `;
    
    alert(details);
};

// Add a global window.editBed function
window.editBed = function(bedId) {
    console.log(`Editing bed #${bedId}`);
    
    // Find the bed in the inventory
    const bed = window.bedInventoryData.find(b => b.bedID == bedId);
    if (!bed) {
        alert('Bed not found');
        return;
    }
    
    // Show a dialog to edit the status
    const newStatus = prompt(
        `Current status of Bed #${bedId} is "${capitalizeFirstLetter(bed.status)}". 
        Enter new status (available, occupied, maintenance):`, 
        bed.status
    );
    
    if (!newStatus) {
        return; // User cancelled
    }
    
    // Validate status
    const validStatuses = ['available', 'occupied', 'maintenance'];
    if (!validStatuses.includes(newStatus.toLowerCase())) {
        alert('Invalid status. Please enter "available", "occupied", or "maintenance".');
        return;
    }
    
    // Update bed status
    const bedIndex = window.bedInventoryData.findIndex(b => b.bedID == bedId);
    if (bedIndex !== -1) {
        const oldStatus = window.bedInventoryData[bedIndex].status;
        window.bedInventoryData[bedIndex].status = newStatus.toLowerCase();
        
        console.log(`Updated bed #${bedId} status from ${oldStatus} to ${newStatus.toLowerCase()}`);
        
        // Save to localStorage
        saveBedInventoryToStorage();
        
        // Update UI
        displayBedInventory(window.bedInventoryData);
        
        // Update stats
        updateBedStats();
        
        // Show success message
        alert(`Bed #${bedId} status updated to ${capitalizeFirstLetter(newStatus.toLowerCase())}`);
    }
};

// Add a global window.viewAssignment function
window.viewAssignment = function(assignmentId) {
    console.log(`Viewing assignment #${assignmentId}`);
    
    // Find the assignment data
    const assignment = window.bedAssignmentData?.find(a => a.assignmentID == assignmentId);
    if (!assignment) {
        alert('Assignment not found');
        return;
    }
    
    const details = `
        Assignment Details:
        - Assignment ID: ${assignment.assignmentID}
        - Patient: ${assignment.patientName} (ID: ${assignment.patientID})
        - Bed: #${assignment.bedID} (${assignment.bedType})
        - Admission Date: ${formatDate(assignment.admissionDate)}
        - Discharge Date: ${assignment.dischargeDate ? formatDate(assignment.dischargeDate) : 'Not discharged yet'}
        - Status: ${assignment.status === 'current' ? 'Current' : 'Discharged'}
    `;
    
    alert(details);
};

// Add a global window.editAssignment function
window.editAssignment = function(assignmentId) {
    console.log(`Editing assignment #${assignmentId}`);
    
    // Find the assignment in our data
    const assignment = window.bedAssignmentData?.find(a => a.assignmentID == assignmentId);
    if (!assignment) {
        alert('Assignment not found');
        return;
    }
    
    // If already discharged, just show information
    if (assignment.status !== 'current') {
        alert(`This patient was discharged on ${formatDate(assignment.dischargeDate)}`);
        return;
    }
    
    // For current assignments, ask if user wants to discharge
    const confirmDischarge = confirm(`Do you want to discharge patient ${assignment.patientName} from Bed #${assignment.bedID}?`);
    
    if (confirmDischarge) {
        const dischargeDate = new Date().toISOString().split('T')[0];
        
        // If API is available, uncomment this block
        /*
        fetch(`http://localhost:8080/api/admin/beds/assignments/${assignmentId}/discharge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dischargeDate
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to discharge patient');
            }
            return response.json();
        })
        .then(() => {
            // Reload the data
            loadBedInventory();
            loadBedAssignments();
            alert('Patient successfully discharged');
        })
        .catch(error => {
            console.error('Error discharging patient:', error);
            alert('Failed to discharge patient: ' + error.message);
        });
        */
        
        // Simulate API response
        console.log(`Discharging patient from assignment #${assignmentId} with date ${dischargeDate}`);
        
        // Find the assignment and update it
        const assignmentIndex = window.bedAssignmentData.findIndex(a => a.assignmentID == assignmentId);
        
        if (assignmentIndex !== -1) {
            window.bedAssignmentData[assignmentIndex].dischargeDate = dischargeDate;
            window.bedAssignmentData[assignmentIndex].status = 'discharged';
            
            // Update the bed status to available
            const bedId = window.bedAssignmentData[assignmentIndex].bedID;
            const bedIndex = window.bedInventoryData.findIndex(b => b.bedID == bedId);
            if (bedIndex !== -1) {
                console.log(`Marking bed #${bedId} as available`);
                window.bedInventoryData[bedIndex].status = 'available';
            }
            
            // Save the updated assignments to localStorage
            saveBedAssignmentsToStorage();
        }
        
        // Reload data
        loadBedInventory();
        loadBedAssignments();
        alert('Patient successfully discharged');
    }
};

// Helper function to diagnose modal issue
function diagnoseModalIssue() {
    const modal = document.getElementById('bedAssignmentModal');
    if (!modal) {
        console.error('Modal element does not exist in the DOM');
        return;
    }

    console.log('Modal element exists, checking visibility...');
    console.log('- display:', window.getComputedStyle(modal).display);
    console.log('- visibility:', window.getComputedStyle(modal).visibility);
    console.log('- opacity:', window.getComputedStyle(modal).opacity);
    console.log('- z-index:', window.getComputedStyle(modal).zIndex);
    
    const form = document.getElementById('bedAssignmentForm');
    if (!form) {
        console.error('Form element does not exist in the DOM');
    } else {
        console.log('Form element exists, checking submit listener...');
        console.log('- has onsubmit:', form.onsubmit !== null);
    }
}

// Save bed assignments to localStorage
function saveBedAssignmentsToStorage() {
    try {
        localStorage.setItem('bedAssignments', JSON.stringify(window.bedAssignmentData || []));
        console.log(`Saved ${window.bedAssignmentData?.length || 0} bed assignments to localStorage`);
    } catch (error) {
        console.error('Error saving bed assignments to localStorage:', error);
    }
}

// Load bed assignments from localStorage
function loadBedAssignmentsFromStorage() {
    try {
        const savedAssignments = localStorage.getItem('bedAssignments');
        if (savedAssignments) {
            return JSON.parse(savedAssignments);
        }
        return [];
    } catch (error) {
        console.error('Error loading bed assignments from localStorage:', error);
        return [];
    }
}

// Save bed inventory to localStorage
function saveBedInventoryToStorage() {
    try {
        localStorage.setItem('bedInventory', JSON.stringify(window.bedInventoryData || []));
        console.log(`Saved ${window.bedInventoryData?.length || 0} beds to localStorage`);
    } catch (error) {
        console.error('Error saving bed inventory to localStorage:', error);
    }
}

// Load bed inventory from localStorage
function loadBedInventoryFromStorage() {
    try {
        const savedInventory = localStorage.getItem('bedInventory');
        if (savedInventory) {
            return JSON.parse(savedInventory);
        }
        return null;
    } catch (error) {
        console.error('Error loading bed inventory from localStorage:', error);
        return null;
    }
}

// Function to open a modal for creating a new bed
window.openNewBedModal = function() {
    console.log('Opening new bed modal');
    const modal = document.getElementById('new-bed-modal');
    if (!modal) {
        console.error('New bed modal element not found in the DOM');
        alert('Error: Could not find the modal element');
        return;
    }
    
    // Display the modal with simple display property
    modal.style.display = 'block';
    
    // Fetch bed types from the server
    fetch('http://localhost:8080/api/beds/types')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch bed types: ${response.status}`);
            }
            return response.json();
        })
        .then(bedTypes => {
            console.log('Fetched bed types:', bedTypes);
            const bedTypeSelect = document.getElementById('bed-type');
            if (bedTypeSelect) {
                // Clear existing options
                bedTypeSelect.innerHTML = '<option value="">Select Bed Type</option>';
                
                // Add bed types from server
                bedTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.bedType;
                    option.textContent = type.bedType;
                    bedTypeSelect.appendChild(option);
                });
            } else {
                console.error('Bed type select element not found');
            }
        })
        .catch(error => {
            console.error('Error fetching bed types:', error);
            
            // Fallback to hardcoded bed types
            const bedTypeSelect = document.getElementById('bed-type');
            if (bedTypeSelect) {
                bedTypeSelect.innerHTML = '<option value="">Select Bed Type</option>';
                const bedTypes = ['General', 'ICU', 'Pediatric', 'Private', 'Semi-Private'];
                bedTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type;
                    bedTypeSelect.appendChild(option);
                });
            }
        });
    
    // Fetch hospitals from the server
    fetch('http://localhost:8080/api/hospitals')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch hospitals: ${response.status}`);
            }
            return response.json();
        })
        .then(hospitals => {
            console.log('Fetched hospitals:', hospitals);
            const hospitalSelect = document.getElementById('hospital-id');
            if (hospitalSelect) {
                // Clear existing options
                hospitalSelect.innerHTML = '<option value="">Select Hospital</option>';
                
                // Add hospitals from server
                hospitals.forEach(hospital => {
                    const option = document.createElement('option');
                    option.value = hospital.hospitalID;
                    option.textContent = hospital.address;
                    hospitalSelect.appendChild(option);
                });
            } else {
                console.error('Hospital select element not found');
            }
        })
        .catch(error => {
            console.error('Error fetching hospitals:', error);
            
            // Fallback to hardcoded hospital
            const hospitalSelect = document.getElementById('hospital-id');
            if (hospitalSelect) {
                hospitalSelect.innerHTML = '<option value="">Select Hospital</option>';
                const option = document.createElement('option');
                option.value = '1';
                option.textContent = '123 Main Rd';
                hospitalSelect.appendChild(option);
            }
        });
    
    // Get the form and add submit event listener
    const form = document.getElementById('new-bed-form');
    if (form) {
        // Remove any existing event listeners to prevent duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Add new event listener
        newForm.addEventListener('submit', submitNewBed);
    } else {
        console.error('New bed form element not found in the DOM');
    }
}

// Function to handle new bed form submission
function submitNewBed(event) {
    event.preventDefault();
    console.log('Submit new bed form triggered');
    
    // Get form values
    const bedType = document.getElementById('bed-type').value;
    const hospitalId = document.getElementById('hospital-id').value;
    const bedStatus = document.getElementById('bed-status').value;
    
    console.log('Form values:', { bedType, hospitalId, bedStatus });
    
    // Validate form inputs
    if (!hospitalId || !bedType) {
        alert('Please select both a hospital and bed type');
        return;
    }
    
    // Create bed data object
    const bedData = {
        hospitalID: parseInt(hospitalId),
        bedType: bedType,
        status: bedStatus || 'available'
    };
    
    console.log('Sending new bed data to database:', JSON.stringify(bedData));
    
    // Disable the submit button during request
    const submitButton = document.querySelector('#new-bed-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';
    
    // Send API request to create bed in the database
    fetch('http://localhost:8080/api/beds/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bedData)
    })
    .then(response => {
        console.log('Database response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Database error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('New bed created in database:', data);
        
        // Close the modal
        const modal = document.getElementById('new-bed-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset the form
        document.getElementById('new-bed-form').reset();
        
        // Show success message
        alert(`New ${bedType} bed created successfully with ID #${data.bedID}`);
        
        // Refresh the bed inventory data
        fetchBedInventory().then(() => {
            console.log('Bed inventory refreshed after adding new bed');
            
            // Refresh bed stats to update counts
            fetchBedStats().then(() => {
                console.log('Bed stats refreshed after adding new bed');
            });
        });
    })
    .catch(error => {
        console.error('Error creating new bed in database:', error);
        alert('Failed to create new bed in database: ' + error.message);
    })
    .finally(() => {
        // Restore the button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    });
}

// Helper function to capitalize first letter of string
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to handle refresh button click
window.refreshBedData = function() {
    console.log('Refreshing bed data...');
    
    // Show loading indicator
    const tbody = document.getElementById('bedInventoryTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-data"><i class="fas fa-spinner fa-spin"></i> Loading beds data...</td></tr>';
    }
    
    // Fetch fresh data from the server
    fetchBedInventory().then(() => {
        console.log('Bed inventory refreshed');
        
        // Refresh bed stats to update counts
        fetchBedStats().then(() => {
            console.log('Bed stats refreshed');
        });
    }).catch(error => {
        console.error('Error refreshing bed data:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
        }
    });
}

// Function to test modal opening
function testOpenModal() {
    console.log('TEST: Opening modal directly');
    const modal = document.getElementById('new-bed-modal');
    if (modal) {
        modal.style.display = 'block';
        console.log('Modal display set to block');
    } else {
        console.error('TEST: Modal element not found');
    }
}

// Function to handle new patient form submission
function submitNewPatient(event) {
    event.preventDefault();
    console.log('Submit new patient form triggered');
    
    // Get form values
    const fullName = document.getElementById('patient-name').value;
    const contactNumber = document.getElementById('patient-contact').value;
    const email = document.getElementById('patient-email').value;
    const gender = document.getElementById('patient-gender').value;
    
    console.log('Form values:', { fullName, contactNumber, email, gender });
    
    // Validate form inputs
    if (!fullName || !contactNumber || !gender) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create patient data object
    const patientData = {
        full_name: fullName,
        contact_number: contactNumber,
        email: email,
        gender: gender
    };
    
    console.log('Sending new patient data to database:', JSON.stringify(patientData));
    
    // Disable the submit button during request
    const submitButton = document.querySelector('#new-patient-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';
    
    // Send API request to create patient in the database
    fetch('http://localhost:8080/api/patients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
    })
    .then(response => {
        console.log('Database response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Database error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('New patient created in database:', data);
        
        // Close the modal
        const modal = document.getElementById('new-patient-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset the form
        document.getElementById('new-patient-form').reset();
        
        // Show success message
        alert(`New patient added successfully with ID #${data.patient_id}`);
        
        // Refresh the patients data
        loadPatients().then(() => {
            console.log('Patient data refreshed after adding new patient');
        });
    })
    .catch(error => {
        console.error('Error creating new patient in database:', error);
        alert('Failed to create new patient: ' + error.message);
    })
    .finally(() => {
        // Restore the button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    });
}

// Function to handle refresh patients data
function refreshPatientsData() {
    console.log('Refreshing patients data...');
    
    // Show loading indicator
    const tbody = document.getElementById('patientsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-data"><i class="fas fa-spinner fa-spin"></i> Loading patients...</td></tr>';
    }
    
    // Fetch fresh data from the server
    loadPatients().then(() => {
        console.log('Patients data refreshed');
    }).catch(error => {
        console.error('Error refreshing patients data:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
        }
    });
}

// Function to handle bed assignment form submission - FIXED VERSION
function handleBedAssignmentSubmit(event) {
    event.preventDefault();
    console.log('Bed assignment form submission triggered');
    
    // Get form values
    const patientId = document.getElementById('patientSelect').value;
    const bedId = document.getElementById('bedSelect').value;
    const admissionDate = document.getElementById('admissionDate').value;
    const dischargeDate = document.getElementById('dischargeDate').value;
    const notes = document.getElementById('assignmentNotes').value;
    
    console.log('Form values:', { patientId, bedId, admissionDate, dischargeDate, notes });
    
    // Validate form inputs
    if (!patientId) {
        showAssignmentError('Please select a patient');
        document.getElementById('patientSelect').focus();
        return;
    }
    
    if (!bedId) {
        showAssignmentError('Please select a bed');
        document.getElementById('bedSelect').focus();
        return;
    }
    
    if (!admissionDate) {
        showAssignmentError('Please select an admission date');
        document.getElementById('admissionDate').focus();
        return;
    }
    
    // Extra validation - verify this patient doesn't already have an active bed assignment
    // This is a secondary check in case the dropdown population logic missed something
    if (window.bedAssignmentData && window.bedAssignmentData.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingAssignment = window.bedAssignmentData.find(assignment => {
            // Check if this is the same patient
            if (parseInt(assignment.patientID) !== parseInt(patientId)) {
                return false;
            }
            
            // Check if this is a current assignment
            let isCurrentlyAssigned = assignment.status === 'current';
            
            // If there's a discharge date, check if it's in the future
            if (assignment.dischargeDate) {
                const dischargeDate = new Date(assignment.dischargeDate);
                dischargeDate.setHours(0, 0, 0, 0);
                isCurrentlyAssigned = dischargeDate >= today;
            }
            
            return isCurrentlyAssigned;
        });
        
        if (existingAssignment) {
            showAssignmentError(`This patient already has an active bed assignment (Bed #${existingAssignment.bedID}). Please discharge the patient from their current bed before assigning a new one.`);
            return;
        }
    }
    
    // Create assignment data object
    const assignmentData = {
        patientID: parseInt(patientId),
        bedID: parseInt(bedId),
        admissionDate: admissionDate,
        dischargeDate: dischargeDate || null,
        notes: notes || '',
        status: 'current'
    };
    
    console.log('Sending bed assignment data to database:', JSON.stringify(assignmentData));
    
    // Clear previous error
    document.getElementById('assignmentErrorMessage').style.display = 'none';
    
    // Show loading state
    const submitButton = document.querySelector('#bedAssignmentForm button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Assigning...';
    
    // Display a spinner or loading message in the modal
    const modalBody = document.querySelector('.modal-body');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = '<div class="spinner"></div><p>Processing assignment...</p>';
    loadingEl.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;';
    modalBody.appendChild(loadingEl);
    
    // Send API request to create bed assignment in the database
    fetch('http://localhost:8080/api/beds/assignments/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
    })
    .then(response => {
        console.log('Database response status:', response.status);
        
        // Remove loading overlay
        if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
        }
        
        // Handle 400 errors (validation failures)
        if (response.status === 400) {
            return response.json().then(data => {
                throw new Error(data.message || "Validation failed");
            });
        }
        
        // Handle 404 errors (resources not found)
        if (response.status === 404) {
            throw new Error("The patient or bed could not be found");
        }
        
        // Handle 409 errors (conflict - bed already assigned)
        if (response.status === 409) {
            throw new Error("This bed is already assigned to another patient");
        }
        
        if (!response.ok) {
            throw new Error(`Database error: ${response.status}`);
        }
        
        return response.json();
    })
    .then(data => {
        console.log('New bed assignment created in database:', data);
        
        // Close the modal
        closeBedAssignmentModal();
        
        // Show success message
        alert(`Patient successfully assigned to bed #${bedId}`);
        
        // Refresh data
        Promise.all([
            fetchBedInventory(),
            fetchBedAssignments(),
            fetchBedStats()
        ]).then(() => {
            console.log('Data refreshed after adding new bed assignment');
        });
    })
    .catch(error => {
        console.error('Error creating bed assignment in database:', error);
        showAssignmentError('Failed to create bed assignment: ' + error.message);
    })
    .finally(() => {
        // Restore the button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        
        // Remove loading overlay if still present
        if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
        }
    });
}

// Function to show assignment error message
function showAssignmentError(message) {
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    } else {
        console.error('Error message element not found:', message);
        alert(message); // Fallback to alert if element not found
    }
}

// Function to populate available beds dropdown - ENHANCED VERSION
function populateAvailableBedsDropdown() {
    console.log('Starting bed dropdown population - ENHANCED VERSION');
    const bedSelect = document.getElementById('bedSelect');
    if (!bedSelect) {
        console.error('Bed select element not found!');
        showAssignmentError('Internal error: Bed select element not found.');
        return;
    }
    
    // Clear ALL existing options
    bedSelect.innerHTML = '';
    
    // Add the default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Bed';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    bedSelect.appendChild(defaultOption);
    
    // Check if we have bed data
    if (!window.bedInventoryData || window.bedInventoryData.length === 0) {
        console.error('No bed inventory data available!');
        const noOption = document.createElement('option');
        noOption.value = '';
        noOption.textContent = 'No beds available - please refresh';
        noOption.disabled = true;
        bedSelect.appendChild(noOption);
        showAssignmentError('No bed data available. Please refresh the page and try again.');
        return;
    }
    
    console.log(`Found ${window.bedInventoryData.length} total beds in inventory`);
    
    // Filter only AVAILABLE beds
    const availableBeds = window.bedInventoryData.filter(bed => bed && bed.status === 'available');
    console.log(`${availableBeds.length} beds are available for assignment`);
    
    if (availableBeds.length === 0) {
        const noOption = document.createElement('option');
        noOption.value = '';
        noOption.textContent = 'No available beds';
        noOption.disabled = true;
        bedSelect.appendChild(noOption);
        showAssignmentError('No beds available. All beds are currently assigned or in maintenance.');
        return;
    }
    
    // Sort beds by ID for consistency
    availableBeds.sort((a, b) => parseInt(a.bedID) - parseInt(b.bedID));
    
    // Log the first few beds for debugging
    console.log("First 5 available beds:", availableBeds.slice(0, 5));
    
    // Add each available bed to dropdown
    let count = 0;
    availableBeds.forEach(bed => {
        const option = document.createElement('option');
        option.value = bed.bedID;
        option.textContent = `Bed #${bed.bedID} - ${bed.bedType} - ${bed.hospitalName || 'Unknown Hospital'}`;
        bedSelect.appendChild(option);
        count++;
    });
    
    console.log(`Added ${count} available beds to dropdown`);
    
    // Add a visual check to see if the dropdown is populated
    if (count > 0) {
        bedSelect.classList.add('has-options');
        bedSelect.style.borderColor = "#28a745";
    } else {
        bedSelect.classList.remove('has-options');
        bedSelect.style.borderColor = "#dc3545";
    }
    
    // Force the dropdown to refresh visually
    bedSelect.size = bedSelect.size;
}

// Function to get assigned patient IDs
async function getAssignedPatientIds() {
    try {
        // First, ensure we have the latest bed assignments
        const assignments = await fetchBedAssignments();
        
        // Extract patient IDs from current assignments
        return assignments
            .filter(assignment => assignment.status === 'current')
            .map(assignment => parseInt(assignment.patientID));
    } catch (error) {
        console.error('Error fetching assigned patient IDs:', error);
        return [];
    }
}

// Load bed assignments data
async function loadBedAssignments() {
    console.log('Loading bed assignments data...');
    try {
        // Fetch bed assignments from the database
        const assignments = await fetchBedAssignments();
        
        // Ensure the table is visible
        const assignmentsTable = document.querySelector('#bedAssignmentsTable');
        if (assignmentsTable) {
            assignmentsTable.style.display = 'table';
        }
        
        // Make sure the table container is visible
        const tableContainer = document.querySelector('#bedAssignments .table-container');
        if (tableContainer) {
            tableContainer.style.display = 'block';
        }
        
        // If we have a tab pane for bed assignments, make sure it's properly initialized
        const assignmentsPane = document.getElementById('bedAssignments');
        if (assignmentsPane) {
            assignmentsPane.classList.remove('hidden');
        }
        
        return assignments;
    } catch (error) {
        console.error('Error loading bed assignments:', error);
        return [];
    }
}

// Setup the new bed modal
function setupNewBedModal() {
    // Get modal elements
    const modal = document.getElementById('new-bed-modal');
    const closeModalBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-bed-btn');
    const newBedForm = document.getElementById('new-bed-form');
    
    // Add event listener to the Add New Bed button
    const addBedBtn = document.getElementById('add-bed-btn');
    if (addBedBtn) {
        console.log('Add New Bed button found, adding event listener');
        addBedBtn.addEventListener('click', openNewBedModal);
    }
    
    // Set up event listeners
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (newBedForm) {
        newBedForm.addEventListener('submit', submitNewBed);
    }
}

// Setup the new patient modal
function setupNewPatientModal() {
    // Get modal elements
    const modal = document.getElementById('new-patient-modal');
    const closeModalBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('button[type="button"]');
    const newPatientForm = document.getElementById('new-patient-form');
    
    // Add event listener to the Add New Patient button
    const addPatientBtn = document.querySelector('button[onclick="document.getElementById(\'new-patient-modal\').style.display=\'block\'"]');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });
    }
    
    // Set up event listeners
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

// Sync BedsCount table with actual data
async function syncBedsCount() {
    console.log('Syncing BedsCount table with actual bed data...');
    
    try {
        const response = await fetch('http://localhost:8080/api/beds/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to sync BedsCount: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('BedsCount sync result:', data);
        
        return data;
    } catch (error) {
        console.error('Error syncing BedsCount table:', error);
        return { success: false, error: error.message };
    }
}