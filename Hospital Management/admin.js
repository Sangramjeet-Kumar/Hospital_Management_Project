// Add global error handler
window.addEventListener('error', function(event) {
    console.error('JavaScript Error:', event.message, 'at', event.filename, 'line', event.lineno);
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded, initializing application');
    
    // Add click event listener to the Add New Bed button
    const addBedBtn = document.getElementById('add-bed-btn');
    if (addBedBtn) {
        console.log('Add New Bed button found, adding event listener');
        addBedBtn.addEventListener('click', function() {
            console.log('Add New Bed button clicked');
            testOpenModal(); // Use the test function
        });
    } else {
        console.error('Add New Bed button not found!');
    }
    
    // Add click event listener to the Refresh Data button
    const refreshBtn = document.getElementById('refresh-beds-btn');
    if (refreshBtn) {
        console.log('Refresh button found, adding event listener');
        refreshBtn.addEventListener('click', function() {
            console.log('Refresh button clicked');
            refreshBedData();
        });
    } else {
        console.error('Refresh button not found!');
    }
    
    // Add event listeners for modal close buttons
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Close button clicked');
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Add event listener for the Cancel button in the modal
    const cancelBtn = document.getElementById('cancel-bed-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            console.log('Cancel button clicked');
            const modal = document.getElementById('new-bed-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Initialize other components
    initializeBedForm();
    
    // Initial data load - ensures we display beds immediately on page load
    fetchBedInventory().then(() => {
        console.log('Initial bed inventory loaded');
        
        // Initialize other data
        fetchBedStats().then(() => {
            console.log('Initial bed stats loaded');
        });
    });
});

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

// Load bed assignments
async function loadBedAssignments() {
    try {
        // If API is available, uncomment this block
        /*
        const response = await fetch('http://localhost:8080/api/admin/beds/assignments');
        if (!response.ok) {
            throw new Error(`Failed to fetch bed assignments: ${response.status}`);
        }
        const assignments = await response.json();
        */
        
        // Instead of using sample data, check if there are any manually added assignments
        let assignments = [];
        
        // Only use the assignments that were manually added via the form
        // These are stored in the window.bedAssignmentData global variable
        if (window.bedAssignmentData && window.bedAssignmentData.length > 0) {
            assignments = window.bedAssignmentData;
            console.log(`Found ${assignments.length} manually added bed assignments`);
        } else {
            console.log('No manually added bed assignments found');
        }
        
        // First, make sure we have patient data
        if (window.patientsData.length === 0) {
            await loadPatients();
        }
        
        // Ensure we only use assignments with valid patients
        const validAssignments = assignments.filter(assignment => {
            // Check if patient exists in our patient data
            return window.patientsData.some(patient => 
                patient.patient_id == assignment.patientID
            );
        });
        
        // Store assignments in global variable
        window.bedAssignmentData = validAssignments;
        
        displayBedAssignments(validAssignments);
    } catch (error) {
        console.error('Error loading bed assignments:', error);
        const container = document.getElementById('bedAssignmentsTableBody');
        container.innerHTML = `<tr><td colspan="8" class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</td></tr>`;
    }
}

// Display bed assignments
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
    
    assignments.forEach(assignment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${assignment.assignmentID}</td>
            <td>#${assignment.bedID}</td>
            <td>${assignment.patientName} (#${assignment.patientID})</td>
            <td>${assignment.bedType}</td>
            <td>${formatDate(assignment.admissionDate)}</td>
            <td>${assignment.dischargeDate ? formatDate(assignment.dischargeDate) : 'N/A'}</td>
            <td>
                <span class="status-badge ${assignment.status === 'current' ? 'status-scheduled' : 'status-completed'}">
                    ${assignment.status === 'current' ? 'Current' : 'Discharged'}
                </span>
            </td>
            <td>
                <button class="action-btn view-btn" title="View details" onclick="viewAssignment(${assignment.assignmentID})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="${assignment.status === 'current' ? 'Discharge patient' : 'View history'}" onclick="editAssignment(${assignment.assignmentID})">
                    <i class="fas fa-${assignment.status === 'current' ? 'edit' : 'history'}"></i>
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

// Filter bed assignments
function filterBedAssignments() {
    const statusFilter = document.getElementById('assignmentStatusFilter');
    const assignmentSearch = document.getElementById('assignmentSearch');
    const rows = document.querySelectorAll('#bedAssignmentsTableBody tr');
    
    const status = statusFilter.value.toLowerCase();
    const searchTerm = assignmentSearch.value.toLowerCase();
    
    rows.forEach(row => {
        // Check if the row has enough cells before trying to access them
        if (row.cells.length < 7) return;
        
        const rowStatus = row.cells[6].textContent.toLowerCase().includes('current') ? 'current' : 'discharged';
        const rowText = row.textContent.toLowerCase();
        
        const matchesStatus = status === '' || rowStatus === status;
        const matchesSearch = searchTerm === '' || rowText.includes(searchTerm);
        
        row.style.display = matchesStatus && matchesSearch ? '' : 'none';
    });
}

// Modified open modal function with diagnostics
function openBedAssignmentModal() {
    console.log("Opening bed assignment modal");
    
    // Ensure we have our data arrays initialized
    if (!window.patientsData) window.patientsData = [];
    if (!window.bedInventoryData) window.bedInventoryData = [];
    if (!window.bedAssignmentData) window.bedAssignmentData = [];
    
    // First, ensure we have patient data
    if (!window.patientsData || window.patientsData.length === 0) {
        console.log("No patient data, loading patients first");
        // Load patient data if not already loaded
        loadPatients().then(() => {
            console.log("Patients loaded, populating dropdown");
            populatePatientDropdown();
        }).catch(error => {
            console.error('Failed to load patients:', error);
            showAssignmentError('Failed to load patient data. Please try again.');
        });
    } else {
        console.log("Using existing patient data");
        populatePatientDropdown();
    }
    
    // Load bed inventory if needed
    if (!window.bedInventoryData || window.bedInventoryData.length === 0) {
        console.log("No bed inventory data, loading beds first");
        loadBedInventory().then(() => {
            console.log("Beds loaded, populating dropdown");
            populateAvailableBedsDropdown();
        }).catch(error => {
            console.error('Failed to load beds:', error);
            showAssignmentError('Failed to load bed data. Please try again.');
        });
    } else {
        console.log("Using existing bed inventory data");
        populateAvailableBedsDropdown();
    }
    
    // Reset the form
    const form = document.getElementById('bedAssignmentForm');
    if (form) {
        form.reset();
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
    
    // Show the modal
    const modal = document.getElementById('bedAssignmentModal');
    if (modal) {
        console.log("Making modal visible");
        modal.classList.add('active');
        modal.style.display = 'block';
        
        // Run diagnostics after a slight delay
        setTimeout(diagnoseModalIssue, 100);
    } else {
        console.error("Modal element not found!");
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

// Populate patient dropdown for bed assignment modal
function populatePatientDropdown() {
    console.log('Starting patient dropdown population');
    const patientSelect = document.getElementById('patientSelect');
    if (!patientSelect) {
        console.error('Patient select element not found');
        return;
    }
    
    // Clear existing options except the first one
    while (patientSelect.options.length > 1) {
        patientSelect.remove(1);
    }
    
    // Ensure patients data is loaded from the database
    ensurePatientsData().then(patients => {
        if (!patients || patients.length === 0) {
            // If no patients available after trying to load them
            const noOption = document.createElement('option');
            noOption.value = "";
            noOption.textContent = "No patients available";
            noOption.disabled = true;
            patientSelect.appendChild(noOption);
            showAssignmentError('No patients available. Please add patients first.');
            return;
        }
        
        console.log('Patient dropdown population - Patients data:', patients);
        
        // Get assigned patient IDs to filter them out
        getAssignedPatientIds().then(assignedPatientIds => {
            console.log('Patient dropdown population - Assigned patient IDs:', assignedPatientIds);
            
            // Filter out patients who already have active bed assignments
            const availablePatients = patients.filter(patient => {
                const patientId = parseInt(patient.patient_id);
                return !assignedPatientIds.includes(patientId);
            });
            
            console.log('Patient dropdown population - Available patients for assignment:', availablePatients);
            
            if (availablePatients.length === 0) {
                const noOption = document.createElement('option');
                noOption.value = "";
                noOption.textContent = "No patients available for assignment";
                noOption.disabled = true;
                patientSelect.appendChild(noOption);
                
                // Show error or notification
                showAssignmentError('All patients already have bed assignments. Please discharge a patient first or add a new patient.');
                return;
            }
            
            // Add patients to dropdown, sorted alphabetically
            availablePatients
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.patient_id;
                    option.textContent = `${patient.full_name} (ID: ${patient.patient_id})`;
                    patientSelect.appendChild(option);
                });
            
            // Select the first option if available
            if (patientSelect.options.length > 1) {
                patientSelect.selectedIndex = 1; // Select the first available patient
            }
        }).catch(error => {
            console.error('Error getting assigned patient IDs:', error);
            showAssignmentError('Failed to check current bed assignments');
        });
    }).catch(error => {
        console.error('Error ensuring patient data:', error);
        showAssignmentError('Failed to load patient data');
    });
}

// Ensure patients data is loaded and available
async function ensurePatientsData() {
    // If we already have the data, use it
    if (window.patientsData && window.patientsData.length > 0) {
        console.log(`Using existing patients data (${window.patientsData.length} patients)`);
        return window.patientsData;
    }
    
    // Otherwise, load it from API or localStorage
    console.log('No existing patient data, loading from API or localStorage');
    return await loadPatients();
}

// Load patients data from API or use sample data
async function loadPatients() {
    try {
        console.log('Loading patients data...');
        
        // Try to load from localStorage first for offline functionality
        let patients = [];
        try {
            const storedPatients = localStorage.getItem('patientsData');
            if (storedPatients) {
                patients = JSON.parse(storedPatients);
                console.log(`Loaded ${patients.length} patients from localStorage`);
            }
    } catch (error) {
            console.warn('Error loading patients from localStorage:', error);
        }
        
        // If no data from localStorage, try API with correct endpoint
        if (!patients || patients.length === 0) {
            try {
                // Use the correct API endpoint for your backend
                const response = await fetch('/api/patients');
                if (response.ok) {
                    patients = await response.json();
                    console.log(`Loaded ${patients.length} patients from API`);
                } else {
                    console.warn(`Failed to fetch patients from API: ${response.status} ${response.statusText}`);
                    
                    // Try the alternate endpoint
                    try {
                        const altResponse = await fetch('http://localhost:8080/api/patients');
                        if (altResponse.ok) {
                            patients = await altResponse.json();
                            console.log(`Loaded ${patients.length} patients from alternate API endpoint`);
                        } else {
                            console.warn('Failed to fetch patients from alternate API endpoint, using sample data');
                        }
                    } catch (altError) {
                        console.warn('Error fetching patients from alternate API:', altError);
                    }
                }
            } catch (error) {
                console.warn('Error fetching patients from API:', error);
            }
        }
        
        // If still no data, use sample data only as a fallback
        if (!patients || patients.length === 0) {
            console.warn('No patient data available from API or localStorage, using sample data');
            patients = [
                {
                    patient_id: 1,
                    full_name: 'John Smith',
                    contact_number: '555-123-4567',
                    email: 'john.smith@example.com',
                    gender: 'Male',
                    last_visit: '2025-03-15'
                },
                {
                    patient_id: 2,
                    full_name: 'Jane Doe',
                    contact_number: '555-987-6543',
                    email: 'jane.doe@example.com',
                    gender: 'Female',
                    last_visit: '2025-03-20'
                },
                {
                    patient_id: 3,
                    full_name: 'Robert Johnson',
                    contact_number: '555-456-7890',
                    email: 'robert.johnson@example.com',
                    gender: 'Male',
                    last_visit: '2025-03-10'
                },
                {
                    patient_id: 4,
                    full_name: 'Emily Williams',
                    contact_number: '555-789-0123',
                    email: 'emily.williams@example.com',
                    gender: 'Female',
                    last_visit: '2025-03-25'
                },
                {
                    patient_id: 5,
                    full_name: 'Harshil',
                    contact_number: '35464563454',
                    email: 'h@gmail.com',
                    gender: 'Male',
                    last_visit: ''
                },
                {
                    patient_id: 6,
                    full_name: 'Ravi Kumawat',
                    contact_number: '9636945191',
                    email: 'R@gmail.com',
                    gender: 'Male',
                    last_visit: '2025-04-04'
                }
            ];
            console.log('Using sample patient data');
        }
        
        // Normalize patient data to ensure consistent property names
        // This handles different property naming conventions from different sources
        const normalizedPatients = patients.map(patient => {
            // First try patient_id, then PatientID, etc.
            const patientId = patient.patient_id || patient.PatientID || patient.patientID || patient.id || patient.PatientId;
            
            // Try to get the full name from different possible property names
            let fullName = patient.full_name || patient.FullName || patient.fullName || patient.name || patient.Name;
            
            // If no direct full name property, try to combine first and last name
            if (!fullName && (patient.FirstName || patient.first_name || patient.firstName)) {
                const firstName = patient.FirstName || patient.first_name || patient.firstName;
                const lastName = patient.LastName || patient.last_name || patient.lastName || '';
                fullName = `${firstName} ${lastName}`.trim();
            }
            
            return {
                patient_id: patientId,
                full_name: fullName,
                contact_number: patient.contact_number || patient.ContactNumber || patient.contactNumber || patient.phone || patient.Phone,
                email: patient.email || patient.Email,
                gender: patient.gender || patient.Gender,
                last_visit: patient.last_visit || patient.LastVisit || patient.lastVisit || ''
            };
        });
        
        // Store the normalized data globally for reuse
        window.patientsData = normalizedPatients;
        console.log('Normalized patient data stored globally:', window.patientsData);
        
        // Save to localStorage for persistence and offline access
        localStorage.setItem('patientsData', JSON.stringify(window.patientsData));
        
        // Display the patients in the table if we're on the patients tab
        const patientsTableBody = document.getElementById('patientsTableBody');
        if (patientsTableBody) {
            displayPatients(window.patientsData);
        }
        
        return window.patientsData;
    } catch (error) {
        console.error('Error in loadPatients:', error);
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

function diagnoseModalIssue() {
    console.log("==== Modal Diagnostics ====");
    
    // Check if modal exists
    const modal = document.getElementById('bedAssignmentModal');
    if (!modal) {
        console.error("Modal element not found in DOM");
        return;
    }
    
    console.log("Modal element found:", modal);
    console.log("Modal classes:", modal.className);
    console.log("Modal style.display:", modal.style.display);
    
    // Get computed styles
    const computedStyle = window.getComputedStyle(modal);
    console.log("Computed display:", computedStyle.display);
    console.log("Computed visibility:", computedStyle.visibility);
    console.log("Computed opacity:", computedStyle.opacity);
    console.log("Computed z-index:", computedStyle.zIndex);
    
    // Check if modal is in viewport
    const rect = modal.getBoundingClientRect();
    console.log("Modal position:", rect);
    console.log("Is in viewport:", 
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    // Check for CSS conflicts
    console.log("CSS rule count:", document.styleSheets.length);
    
    console.log("==== End Diagnostics ====");
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