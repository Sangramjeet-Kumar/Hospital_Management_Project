// Add global error handler
window.addEventListener('error', function(event) {
    console.error('JavaScript Error:', event.message, 'at', event.filename, 'line', event.lineno);
});

document.addEventListener('DOMContentLoaded', () => {
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
                
                // Also save to localStorage as backup
                saveBedInventoryToStorage();
                
                // Display the data
                loadBedInventory();
                return data;
            } else {
                console.warn(`Failed to fetch bed inventory from API: ${response.status} ${response.statusText}`);
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching bed inventory from API:', error);
            
            // Try to load from localStorage as fallback
            window.bedInventoryData = loadBedInventoryFromStorage() || [];
            console.log('Using localStorage fallback for bed inventory:', window.bedInventoryData.length);
            return window.bedInventoryData;
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
});

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
        console.log('Fetching bed types from database API');
        
        let bedTypes = [];
        
        try {
            // Try to fetch bed types from the API
            const response = await fetch('http://localhost:8080/api/beds/types');
            if (response.ok) {
                const data = await response.json();
                console.log('Successfully fetched bed types from API:', data);
                
                // Convert the API response to our format
                bedTypes = data.map(type => ({
                    bedType: type.type,
                    description: type.description || getBedTypeDescription(type.type),
                    icon: getBedTypeIcon(type.type)
                }));
            } else {
                throw new Error(`Failed to fetch bed types: ${response.status}`);
            }
        } catch (apiError) {
            console.error('Error fetching bed types from API:', apiError);
            
            // Fall back to getting unique bed types from inventory data
            console.log('Falling back to bed types from inventory data');
            const uniqueTypes = [...new Set(window.bedInventoryData.map(bed => bed.bedType))];
            
            uniqueTypes.forEach(bedType => {
                bedTypes.push({
                    bedType,
                    description: getBedTypeDescription(bedType),
                    icon: getBedTypeIcon(bedType)
                });
            });
        }
        
        // If no bed types found in API or inventory, use default types
        if (bedTypes.length === 0) {
            console.log('No bed types found, using default types');
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

// Load bed inventory
async function loadBedInventory() {
    try {
        // We're using locally stored data, no need for an API call
        console.log('Loading bed inventory from global variable');
        
        // Display inventory from global variable
        displayBedInventory(window.bedInventoryData);
        
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
    
    // Populate the bed type dropdown
    populateBedTypeSelect();
    
    // Show the modal
    const modal = document.getElementById('newBedModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
    } else {
        console.error('New bed modal element not found');
    }
    
    // Set up event listeners if not already set
    const form = document.getElementById('newBedForm');
    if (form) {
        // Remove any existing listeners to prevent duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Add submit event listener to the new form
        newForm.addEventListener('submit', handleNewBedSubmit);
    }
    
    // Clear any previous error messages
    const errorMsg = document.getElementById('bedErrorMessage');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

// Function to open a modal for bed assignment
window.openBedAssignmentModal = function() {
    console.log('Opening bed assignment modal');
    
    // Populate dropdowns
    populatePatientDropdown();
    populateAvailableBedsDropdown();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('admissionDate').value = today;
    document.getElementById('dischargeDate').value = '';
    
    // Show the modal
    const modal = document.getElementById('bedAssignmentModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
    } else {
        console.error('Bed assignment modal element not found');
    }
    
    // Set up event listeners if not already set
    const form = document.getElementById('bedAssignmentForm');
    if (form) {
        // Remove any existing listeners to prevent duplicates
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Add submit event listener to the new form
        newForm.addEventListener('submit', handleBedAssignmentSubmit);
    }
    
    // Set up event listener for add new patient button
    const addPatientBtn = document.getElementById('addNewPatientBtn');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', openNewPatientForm);
    }
    
    // Clear any previous error messages
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

// Show error message in the form
function showAssignmentError(message) {
    console.error('Assignment error:', message);
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    } else {
        console.error('Error message element not found');
        alert('Error: ' + message);
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Load appointments data
async function loadAppointments(range) {
    try {
        const tableContainer = document.querySelector('#appointments .table-container');
        tableContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading appointments...</div>';
        
        const response = await fetch(`http://localhost:8080/api/appointments/list?range=${range}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch appointments: ${response.status}`);
        }
        
        const appointments = await response.json();
        displayAppointments(appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
        const tableContainer = document.querySelector('#appointments .table-container');
        tableContainer.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
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

// Update bed statistics based on current inventory
function updateBedStats() {
    if (!window.bedInventoryData) return;
    
    const totalBeds = window.bedInventoryData.length;
    const occupiedBeds = window.bedInventoryData.filter(bed => bed.status === 'occupied').length;
    const vacantBeds = window.bedInventoryData.filter(bed => bed.status === 'available').length;
    
    // Update UI
    document.getElementById('totalBeds').textContent = totalBeds;
    document.getElementById('occupiedBeds').textContent = occupiedBeds;
    document.getElementById('vacantBeds').textContent = vacantBeds;
    document.getElementById('availableBeds').textContent = vacantBeds; // Update dashboard stat
    
    // Update chart
    initializeBedOccupancyChart();
    
    console.log(`Updated bed stats: Total: ${totalBeds}, Occupied: ${occupiedBeds}, Vacant: ${vacantBeds}`);
}

// Clear all bed assignments
window.clearAllAssignments = function() {
    // Ask for confirmation before clearing
    if (!confirm('Are you sure you want to clear all bed assignments? This cannot be undone.')) {
        return;
    }
    
    // Clear the global variable
    window.bedAssignmentData = [];
    
    // Clear localStorage
    localStorage.removeItem('bedAssignments');
    console.log('All bed assignments cleared');
    
    // Reset any occupied beds to available status
    if (window.bedInventoryData) {
        window.bedInventoryData.forEach(bed => {
            if (bed.status === 'occupied') {
                bed.status = 'available';
            }
        });
    }
    
    // Reload the data
    loadBedInventory();
    loadBedAssignments();
    
    // Show confirmation
    alert('All bed assignments have been cleared.');
};

// Function to clear all beds (for testing purposes)
window.clearAllBeds = function() {
    if (confirm('Are you sure you want to clear all beds? This action cannot be undone.')) {
        // Clear localStorage
        localStorage.removeItem('bedInventory');
        console.log('All bed inventory cleared');
        
        // Initialize with empty array instead of sample data
        window.bedInventoryData = [];
        
        // Save the empty data to localStorage
        saveBedInventoryToStorage();
        
        // Try to fetch fresh data from the API
        fetchBedInventory().then(() => {
            // Reload the UI
            loadBedInventory();
            loadBedAssignments();
            loadBedTypes();
            
            // Update stats
            updateBedStats();
            
            // Show confirmation
            alert('All beds have been cleared from local storage. The UI now shows only data from the database.');
        });
    }
};

// Close new bed modal
function closeNewBedModal() {
    console.log('Closing new bed modal');
    
    const modal = document.getElementById('newBedModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    } else {
        console.error('New bed modal element not found when trying to close');
    }
    
    // Reset form
    const form = document.getElementById('newBedForm');
    if (form) {
        form.reset();
    }
    
    // Clear error messages
    const errorMsg = document.getElementById('bedErrorMessage');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
}

// Handle new bed form submission
function handleNewBedSubmit(event) {
    event.preventDefault();
    console.log('New bed form submitted');
    
    // Get form values
    const bedType = document.getElementById('bedTypeSelect').value;
    const hospitalId = document.getElementById('hospitalSelect').value;
    const status = document.getElementById('bedStatusSelect').value;
    
    // Validate inputs
    if (!bedType || !hospitalId || !status) {
        showBedError('Please fill all required fields');
        return;
    }
    
    try {
        // First try to create bed in database
        console.log('Creating new bed in database:', { hospitalId, bedType, status });
        
        // Create the request body
        const bedData = {
            hospitalID: parseInt(hospitalId),
            bedType: bedType,
            status: status
        };
        
        // Send API request to create bed in database
        fetch('http://localhost:8080/api/beds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bedData)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.warn(`Failed to create bed in database: ${response.status} ${response.statusText}`);
                // Fall back to local storage only
                return Promise.reject(new Error(`API returned ${response.status}`));
            }
        })
        .then(data => {
            console.log('Successfully created bed in database:', data);
            
            // Use the returned bed ID from the server
            const newBedId = data.bedID || data.id;
            
            // Create new bed object with server-provided ID
            const newBed = {
                bedID: newBedId,
                hospitalID: parseInt(hospitalId),
                hospitalName: 'Main Hospital',
                bedType: bedType,
                status: status
            };
            
            // Add to global array
            if (!window.bedInventoryData) {
                window.bedInventoryData = [];
            }
            window.bedInventoryData.push(newBed);
            
            // Save to localStorage as backup
            saveBedInventoryToStorage();
            
            // Update UI
            loadBedInventory();
            
            // Update bed stats
            updateBedStats();
            
            // Close the modal
            closeNewBedModal();
            
            // Show success message
            alert(`Successfully added new ${bedType} bed with ID #${newBedId} to database`);
        })
        .catch(error => {
            console.error('Error creating bed in database:', error);
            
            // Fall back to local storage only
            createBedLocallyOnly(bedType, hospitalId, status);
        });
    } catch (error) {
        console.error('Error creating new bed:', error);
        showBedError(error.message || 'Failed to create new bed');
        
        // Fall back to local storage only
        createBedLocallyOnly(bedType, hospitalId, status);
    }
}

// Create a bed locally when database creation fails
function createBedLocallyOnly(bedType, hospitalId, status) {
    console.log('Creating bed locally only...');
    
    // Create a new bed ID
    const newBedId = window.bedInventoryData.length > 0 ? 
        Math.max(...window.bedInventoryData.map(bed => parseInt(bed.bedID))) + 1 : 1;
    
    // Create new bed object
    const newBed = {
        bedID: newBedId,
        hospitalID: parseInt(hospitalId),
        hospitalName: 'Main Hospital',
        bedType: bedType,
        status: status
    };
    
    console.log('Created new bed locally:', newBed);
    
    // Add to global array
    if (!window.bedInventoryData) {
        window.bedInventoryData = [];
    }
    window.bedInventoryData.push(newBed);
    
    // Save to localStorage
    saveBedInventoryToStorage();
    
    // Update UI
    loadBedInventory();
    
    // Update bed stats
    updateBedStats();
    
    // Close the modal
    closeNewBedModal();
    
    // Show success message (indicating local storage only)
    alert(`Added new ${bedType} bed with ID #${newBedId} (local storage only)`);
}

// Show error message in the new bed form
function showBedError(message) {
    const errorMsg = document.getElementById('bedErrorMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}

// Populate bed type select dropdown
async function populateBedTypeSelect() {
    const bedTypeSelect = document.getElementById('bedTypeSelect');
    if (!bedTypeSelect) {
        console.error('Bed type select element not found');
        return;
    }
    
    // Clear existing options except the first one
    while (bedTypeSelect.options.length > 1) {
        bedTypeSelect.remove(1);
    }
    
    try {
        // Try to fetch bed types from the API
        console.log('Fetching bed types for dropdown from API');
        const response = await fetch('http://localhost:8080/api/beds/types');
        
        if (response.ok) {
            const data = await response.json();
            console.log('Successfully fetched bed types for dropdown:', data);
            
            // Add options from API data
            data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.type;
                option.textContent = type.type;
                bedTypeSelect.appendChild(option);
            });
        } else {
            throw new Error(`Failed to fetch bed types: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching bed types for dropdown:', error);
        
        // Fallback to default bed types
        console.log('Using default bed types for dropdown');
        const bedTypes = [
            'General',
            'Semi-Private',
            'Private',
            'ICU',
            'Pediatric'
        ];
        
        bedTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            bedTypeSelect.appendChild(option);
        });
    }
}

// Get array of patient IDs who currently have bed assignments
async function getAssignedPatientIds() {
    console.log('Getting list of patients with active bed assignments');
    
    try {
        // Get bed assignments data
        let assignments = window.bedAssignmentData || [];
        
        // If no data in memory, try to load from localStorage
        if (assignments.length === 0) {
            assignments = loadBedAssignmentsFromStorage() || [];
        }
        
        console.log(`Found ${assignments.length} total bed assignments`);
        
        // Filter only current (not discharged) assignments
        const currentDate = new Date();
        const currentAssignments = assignments.filter(a => {
            // If there's no discharge date or the discharge date is in the future
            return !a.dischargeDate || new Date(a.dischargeDate) >= currentDate;
        });
        
        console.log(`Found ${currentAssignments.length} current bed assignments`);
        
        // Extract patient IDs
        const patientIds = currentAssignments.map(a => {
            // Handle various property name formats
            const id = a.patientID || a.PatientID || a.patientId || a.patient_id;
            return parseInt(id);
        });
        
        // Remove duplicates (in case a patient somehow has multiple assignments)
        const uniquePatientIds = [...new Set(patientIds)];
        
        console.log(`Found ${uniquePatientIds.length} unique patients with active bed assignments`);
        return uniquePatientIds;
    } catch (error) {
        console.error('Error getting assigned patient IDs:', error);
        return [];
    }
}

// Populate available beds dropdown
function populateAvailableBedsDropdown() {
    console.log('Populating beds dropdown');
    const bedSelect = document.getElementById('bedSelect');
    if (!bedSelect) {
        console.error('Bed select element not found');
        return;
    }
    
    // Clear existing options except the first one
    while (bedSelect.options.length > 1) {
        bedSelect.remove(1);
    }
    
    if (!window.bedInventoryData || window.bedInventoryData.length === 0) {
        console.log('No bed inventory data available');
        const option = document.createElement('option');
        option.textContent = 'No beds available';
        option.disabled = true;
        bedSelect.appendChild(option);
        return;
    }
    
    console.log(`Bed inventory data available: ${window.bedInventoryData.length} beds`);
    
    // Filter to only available beds
    const availableBeds = window.bedInventoryData.filter(bed => bed.status === 'available');
    console.log(`Available beds: ${availableBeds.length}`);
    
    if (availableBeds.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No beds available';
        option.disabled = true;
        bedSelect.appendChild(option);
        return;
    }
    
    availableBeds.forEach(bed => {
        const option = document.createElement('option');
        option.value = bed.bedID;
        option.textContent = `Bed #${bed.bedID} (${bed.bedType})`;
        bedSelect.appendChild(option);
    });
}

// Handle bed assignment form submission
async function handleBedAssignmentSubmit(event) {
    event.preventDefault();
    console.log('Bed assignment form submitted');
    
    // Get form values
    const patientID = document.getElementById('patientSelect').value;
    const bedID = document.getElementById('bedSelect').value;
    const admissionDate = document.getElementById('admissionDate').value;
    const dischargeDate = document.getElementById('dischargeDate').value;
    const notes = document.getElementById('assignmentNotes').value;
    
    console.log('Form values:', { patientID, bedID, admissionDate, dischargeDate, notes });
    
    // Reset validation styles
    resetFormValidation();
    
    // Validate inputs
    let isValid = true;
    
    if (!patientID) {
        showInputError('patientSelect', 'Please select a patient');
        isValid = false;
    } else {
        showInputSuccess('patientSelect');
    }
    
    if (!bedID) {
        showInputError('bedSelect', 'Please select a bed');
        isValid = false;
    } else {
        showInputSuccess('bedSelect');
    }
    
    if (!admissionDate) {
        showInputError('admissionDate', 'Please select an admission date');
        isValid = false;
    } else {
        showInputSuccess('admissionDate');
    }
    
    // Validate discharge date is after admission date if provided
    if (dischargeDate && new Date(dischargeDate) <= new Date(admissionDate)) {
        showInputError('dischargeDate', 'Discharge date must be after the admission date');
        isValid = false;
    } else if (dischargeDate) {
        showInputSuccess('dischargeDate');
    }
    
    if (!isValid) {
        return;
    }
    
    try {
        // Retrieve patient data from the selected patientID
        const patient = window.patientsData.find(p => p.patient_id == patientID);
        if (!patient) {
            showAssignmentError(`Patient with ID ${patientID} not found`);
            return;
        }
        
        // Get patient name
        const patientName = patient.full_name;
        
        console.log('Selected patient:', { patientID, patientName });
        
        // Get bed information
        const selectedBed = window.bedInventoryData.find(bed => parseInt(bed.bedID) === parseInt(bedID));
        if (!selectedBed) {
            showAssignmentError('Selected bed not found in inventory');
            return;
        }
        
        // Check if bed is available
        if (selectedBed.status !== 'available') {
            showAssignmentError(`Selected bed (ID: ${bedID}) is not available (current status: ${selectedBed.status})`);
            return;
        }
        
        // Generate an assignment ID (either next in sequence or starting at 1)
        const assignmentID = window.bedAssignmentData && window.bedAssignmentData.length > 0 ? 
                           Math.max(...window.bedAssignmentData.map(a => parseInt(a.assignmentID))) + 1 : 1;
        
        // Create new assignment
        const newAssignment = {
            assignmentID: assignmentID,
            bedID: parseInt(bedID),
            patientID: parseInt(patientID),
            patientName: patientName,
            bedType: selectedBed.bedType,
            admissionDate: admissionDate,
            dischargeDate: dischargeDate || '',
            status: 'current',
            notes: notes
        };
        
        console.log('Creating new bed assignment:', newAssignment);
        
        // Attempt to create assignment on the server
        let serverSaved = false;
        try {
            const response = await fetch('http://localhost:8080/api/beds/assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newAssignment)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Successfully created bed assignment on server:', data);
                serverSaved = true;
                
                // Update with server-provided ID if available
                if (data && data.assignmentID) {
                    newAssignment.assignmentID = data.assignmentID;
                }
            } else {
                console.warn('Failed to create bed assignment on server, saving locally only');
            }
        } catch (apiError) {
            console.error('Error creating bed assignment on server:', apiError);
        }
        
        // Add to global data
        if (!window.bedAssignmentData) {
            window.bedAssignmentData = [];
        }
        window.bedAssignmentData.push(newAssignment);
        
        // Update bed status to occupied
        selectedBed.status = 'occupied';
        
        // Save data to localStorage
        saveBedInventoryToStorage();
        saveBedAssignmentsToStorage();
        
        // Reload data and update UI
        loadBedInventory();
        loadBedAssignments();
        updateBedStats();
        
        // Close the modal
        closeBedAssignmentModal();
        
        // Show success message
        if (serverSaved) {
            alert(`Bed #${bedID} successfully assigned to ${patientName} and saved to server`);
        } else {
            alert(`Bed #${bedID} successfully assigned to ${patientName} (saved locally only)`);
        }
        
    } catch (error) {
        console.error('Error creating bed assignment:', error);
        showAssignmentError('Failed to create bed assignment: ' + error.message);
    }
}

// Reset form validation styles
function resetFormValidation() {
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }
    
    const formElements = document.querySelectorAll('#bedAssignmentForm select, #bedAssignmentForm input');
    formElements.forEach(el => {
        el.classList.remove('has-error');
        el.classList.remove('is-valid');
    });
}

// Show input validation error
function showInputError(inputId, message) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.add('has-error');
        input.classList.remove('is-valid');
    }
    
    // Show general error message if this is the first error
    const errorMsg = document.getElementById('assignmentErrorMessage');
    if (errorMsg && errorMsg.style.display === 'none') {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}

// Show input validation success
function showInputSuccess(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.remove('has-error');
        input.classList.add('is-valid');
    }
}

// Open new patient form within the bed assignment modal
function openNewPatientForm() {
    console.log('Opening new patient form');
    
    // Hide the patient selection area
    const patientSelectArea = document.getElementById('patientSelectArea');
    if (patientSelectArea) {
        patientSelectArea.style.display = 'none';
    }
    
    // Show the new patient form
    const newPatientForm = document.getElementById('newPatientForm');
    if (newPatientForm) {
        newPatientForm.style.display = 'block';
    } else {
        console.error('New patient form element not found');
        return;
    }
    
    // Set up the cancel button event listener
    const cancelBtn = document.getElementById('cancelNewPatient');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelNewPatientForm);
    }
}

// Cancel new patient form and go back to patient selection
function cancelNewPatientForm() {
    console.log('Canceling new patient form');
    
    // Show the patient selection area
    const patientSelectArea = document.getElementById('patientSelectArea');
    if (patientSelectArea) {
        patientSelectArea.style.display = 'block';
    }
    
    // Hide the new patient form
    const newPatientForm = document.getElementById('newPatientForm');
    if (newPatientForm) {
        newPatientForm.style.display = 'none';
        newPatientForm.reset(); // Clear the form
    }
}

// Create a new patient from the bed assignment form
window.createNewPatient = function() {
    console.log('Creating new patient from bed assignment form');
    
    // Get form values
    const fullName = document.getElementById('newPatientName').value.trim();
    const contactNumber = document.getElementById('newPatientPhone').value.trim();
    const email = document.getElementById('newPatientEmail').value.trim();
    const gender = document.getElementById('newPatientGender').value;
    
    // Validate inputs
    if (!fullName) {
        alert('Please enter a patient name');
        return;
    }
    
    if (!contactNumber) {
        alert('Please enter a contact number');
        return;
    }
    
    if (!gender) {
        alert('Please select a gender');
        return;
    }
    
    // Try to create patient on the server first
    const patientData = {
        full_name: fullName,
        contact_number: contactNumber,
        email: email || '',
        gender: gender,
        last_visit: new Date().toISOString().split('T')[0]
    };
    
    // First try to submit to API
    fetch('http://localhost:8080/api/patients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
    })
    .then(response => {
        if (response.ok) {
            return response.json().then(data => {
                console.log('Successfully created patient in database:', data);
                // Use the server-generated ID
                addPatientToLocalData(data.patient_id || data.PatientID || data.id, patientData);
            });
        } else {
            console.warn('Failed to create patient in database, creating locally only');
            // Fall back to local creation
            createPatientLocally(patientData);
        }
    })
    .catch(error => {
        console.error('Error creating patient in database:', error);
        // Fall back to local creation
        createPatientLocally(patientData);
    });
    
    // Prevent form submission
    return false;
};

// Add patient to local data
function addPatientToLocalData(patientId, patientData) {
    // Ensure patient ID is available
    if (!patientId) {
        createPatientLocally(patientData);
        return;
    }
    
    // Create new patient object with server-provided ID
    const newPatient = {
        patient_id: patientId,
        full_name: patientData.full_name,
        contact_number: patientData.contact_number,
        email: patientData.email || '',
        gender: patientData.gender,
        last_visit: patientData.last_visit
    };
    
    console.log('Adding patient to local data:', newPatient);
    
    // Add to global array
    if (!window.patientsData) {
        window.patientsData = [];
    }
    window.patientsData.push(newPatient);
    
    // Save to localStorage
    localStorage.setItem('patientsData', JSON.stringify(window.patientsData));
    
    // Update UI
    updatePatientUI(newPatient);
}

// Create patient locally (fallback if server creation fails)
function createPatientLocally(patientData) {
    // Load existing patients
    ensurePatientsData().then(patients => {
        // Generate a new patient ID
        const newPatientId = patients.length > 0 ? 
                         Math.max(...patients.map(p => parseInt(p.patient_id))) + 1 : 1;
        
        // Add to local data with locally-generated ID
        addPatientToLocalData(newPatientId, patientData);
    });
}

// Update UI after adding a new patient
function updatePatientUI(newPatient) {
    // Update patient selection dropdown
    const patientSelect = document.getElementById('patientSelect');
    if (patientSelect) {
        const option = document.createElement('option');
        option.value = newPatient.patient_id;
        option.textContent = `${newPatient.full_name} (ID: ${newPatient.patient_id})`;
        patientSelect.appendChild(option);
        patientSelect.value = newPatient.patient_id; // Select the new patient
    }
    
    // Update patients table if visible
    const patientsTableBody = document.getElementById('patientsTableBody');
    if (patientsTableBody) {
        displayPatients(window.patientsData);
    }
    
    // Go back to the patient selection view with the new patient selected
    cancelNewPatientForm();
    
    // Show success message
    alert(`Successfully added new patient: ${newPatient.full_name}`);
}