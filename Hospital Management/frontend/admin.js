// Function to fetch bed statistics
async function fetchBedStats() {
    console.log('Fetching bed statistics from database API');
    try {
        const response = await fetch('http://localhost:8080/api/beds/stats');
        if (!response.ok) {
            throw new Error(`Failed to fetch bed statistics: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched bed statistics from API:', data);
        return data;
    } catch (error) {
        console.error('Error fetching bed statistics from API:', error);
        
        // If API fails, calculate stats from local inventory data
        if (window.bedInventoryData && window.bedInventoryData.length > 0) {
            console.log('Calculating bed statistics from local data');
            const inventory = window.bedInventoryData;
            const totalBeds = inventory.length;
            const occupiedBeds = inventory.filter(bed => bed.status === 'occupied').length;
            const vacantBeds = inventory.filter(bed => bed.status === 'available').length;
            const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
            
            return {
                totalBeds,
                occupiedBeds,
                vacantBeds,
                occupancyRate,
                bedTypes: []
            };
        }
        
        return {
            totalBeds: 0,
            occupiedBeds: 0,
            vacantBeds: 0,
            occupancyRate: 0,
            bedTypes: []
        };
    }
}

// Function to fetch bed inventory
async function fetchBedInventory() {
    console.log('Fetching bed inventory from database API');
    try {
        const response = await fetch('http://localhost:8080/api/beds/inventory');
        if (!response.ok) {
            throw new Error(`Failed to fetch bed inventory: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched bed data from API:', data);
        
        // Store the data in the global variable
        window.bedInventoryData = data;
        
        // Save to localStorage as backup
        saveBedInventoryToStorage();
        
        return data;
    } catch (error) {
        console.error('Error fetching bed inventory from API:', error);
        // Try to load from localStorage as fallback
        const storedData = loadBedInventoryFromStorage();
        if (storedData && storedData.length > 0) {
            console.log('Using bed inventory data from localStorage');
            window.bedInventoryData = storedData;
            return storedData;
        }
        
        // Initialize empty array if no data exists
        window.bedInventoryData = [];
        return [];
    }
}

// Function to fetch bed assignments
async function fetchBedAssignments() {
    console.log('Fetching bed assignments from database API');
    try {
        const response = await fetch('http://localhost:8080/api/beds/assignments');
        if (!response.ok) {
            throw new Error(`Failed to fetch bed assignments: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched bed assignments from API:', data);
        
        // Store the data in the global variable
        window.bedAssignmentsData = data;
        
        // Save to localStorage as backup
        saveBedAssignmentsToStorage();
        
        return data;
    } catch (error) {
        console.error('Error fetching bed assignments from API:', error);
        // Try to load from localStorage as fallback
        const storedData = loadBedAssignmentsFromStorage();
        if (storedData && storedData.length > 0) {
            console.log('Using bed assignments data from localStorage');
            window.bedAssignmentsData = storedData;
            return storedData;
        }
        
        // Initialize empty array if no data exists
        window.bedAssignmentsData = [];
        return [];
    }
}

// Function to fetch bed types
async function fetchBedTypes() {
    console.log('Fetching bed types from database API');
    try {
        const response = await fetch('http://localhost:8080/api/beds/types');
        if (!response.ok) {
            throw new Error(`Failed to fetch bed types: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched bed types from API:', data);
        return data;
    } catch (error) {
        console.error('Error fetching bed types from API:', error);
        return [];
    }
}

// Function to update beds section with data
async function updateBedsSection() {
    // Fetch bed statistics
    const bedStats = await fetchBedStats();
    
    // Update bed statistics cards
    document.getElementById('total-beds').textContent = bedStats.totalBeds || 0;
    document.getElementById('occupied-beds').textContent = bedStats.occupiedBeds || 0;
    document.getElementById('vacant-beds').textContent = bedStats.vacantBeds || 0;
    
    // Update bed occupancy rate if available
    const occupancyRateElement = document.getElementById('occupancy-rate');
    if (occupancyRateElement) {
        occupancyRateElement.textContent = `${(bedStats.occupancyRate || 0).toFixed(1)}%`;
    }
    
    // Update bed types chart if it exists
    updateBedTypesChart(bedStats.bedTypes || []);
    
    // Update bed inventory and assignments based on active tab
    const activeTab = document.querySelector('#beds-tabs .tab-link.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        if (tabId === 'beds-inventory-tab') {
            loadBedInventory();
        } else if (tabId === 'beds-assignments-tab') {
            loadBedAssignments();
        }
    } else {
        // Default to loading bed inventory
        loadBedInventory();
    }
}

// Function to initialize bed section
function initBedsSection() {
    // Initialize tabs
    const tabLinks = document.querySelectorAll('#beds-tabs .tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            tabLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            const tabContents = document.querySelectorAll('.beds-tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const tabId = this.getAttribute('data-tab');
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) {
                selectedTab.style.display = 'block';
                
                // Load data based on selected tab
                if (tabId === 'beds-inventory-tab') {
                    loadBedInventory();
                } else if (tabId === 'beds-assignments-tab') {
                    loadBedAssignments();
                }
            }
        });
    });
    
    // Setup event listeners for the Add Bed button
    const addBedButton = document.getElementById('add-bed-button');
    if (addBedButton) {
        addBedButton.addEventListener('click', openNewBedModal);
    }
    
    // Setup event listeners for the Assign Bed button
    const assignBedButton = document.getElementById('assign-bed-button');
    if (assignBedButton) {
        assignBedButton.addEventListener('click', openBedAssignmentModal);
    }
    
    // Initialize bed data
    updateBedsSection();
}

// Function to update the bed types chart
function updateBedTypesChart(bedTypes) {
    const ctx = document.getElementById('bed-types-chart');
    if (!ctx) return;
    
    // If chart already exists, destroy it
    if (window.bedTypesChart) {
        window.bedTypesChart.destroy();
    }
    
    // Prepare data for the chart
    const labels = bedTypes.map(type => type.type);
    const occupiedData = bedTypes.map(type => type.occupied);
    const vacantData = bedTypes.map(type => type.vacant);
    
    // Create new chart
    window.bedTypesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Occupied',
                    data: occupiedData,
                    backgroundColor: '#FF6384',
                    borderColor: '#FF6384',
                    borderWidth: 1
                },
                {
                    label: 'Vacant',
                    data: vacantData,
                    backgroundColor: '#36A2EB',
                    borderColor: '#36A2EB',
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
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

// Function to load and display bed inventory
async function loadBedInventory() {
    const inventoryContainer = document.getElementById('beds-inventory-content');
    if (!inventoryContainer) return;
    
    // Show loading state
    inventoryContainer.innerHTML = '<div class="loading">Loading bed inventory...</div>';
    
    try {
        const beds = await fetchBedInventory();
        
        if (beds.length === 0) {
            inventoryContainer.innerHTML = '<div class="no-data">No beds available in inventory</div>';
            return;
        }
        
        // Create inventory table
        let tableHTML = `
            <div class="table-filters">
                <input type="text" id="bed-inventory-search" placeholder="Search beds..." class="form-control">
                <select id="bed-type-filter" class="form-control">
                    <option value="">All Bed Types</option>
                </select>
                <select id="bed-status-filter" class="form-control">
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                </select>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Bed ID</th>
                        <th>Hospital</th>
                        <th>Bed Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Populate table with beds
        beds.forEach(bed => {
            tableHTML += `
                <tr data-bed-id="${bed.bedID}" data-bed-type="${bed.bedType}" data-status="${bed.status}">
                    <td>${bed.bedID}</td>
                    <td>${bed.hospitalName || 'Main Hospital'}</td>
                    <td>${bed.bedType}</td>
                    <td><span class="status-badge ${bed.status}">${bed.status}</span></td>
                    <td>
                        <button class="btn view-bed" data-bed-id="${bed.bedID}">View</button>
                        ${bed.status === 'available' ? 
                          `<button class="btn assign-bed" data-bed-id="${bed.bedID}" data-bed-type="${bed.bedType}">Assign</button>` : 
                          ''}
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        inventoryContainer.innerHTML = tableHTML;
        
        // Populate bed type filter
        const bedTypes = new Set(beds.map(bed => bed.bedType));
        const bedTypeFilter = document.getElementById('bed-type-filter');
        bedTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            bedTypeFilter.appendChild(option);
        });
        
        // Setup event listeners for filtering
        const searchInput = document.getElementById('bed-inventory-search');
        const typeFilter = document.getElementById('bed-type-filter');
        const statusFilter = document.getElementById('bed-status-filter');
        
        [searchInput, typeFilter, statusFilter].forEach(el => {
            if (el) {
                el.addEventListener('input', filterBedInventory);
            }
        });
        
        // Setup event listeners for view and assign buttons
        document.querySelectorAll('.view-bed').forEach(button => {
            button.addEventListener('click', function() {
                const bedId = this.getAttribute('data-bed-id');
                viewBed(bedId);
            });
        });
        
        document.querySelectorAll('.assign-bed').forEach(button => {
            button.addEventListener('click', function() {
                const bedId = this.getAttribute('data-bed-id');
                const bedType = this.getAttribute('data-bed-type');
                openBedAssignmentModal(bedId, bedType);
            });
        });
        
    } catch (error) {
        console.error('Error loading bed inventory:', error);
        inventoryContainer.innerHTML = '<div class="error">Failed to load bed inventory. Please try again later.</div>';
    }
}

// Function to filter bed inventory based on search and filters
function filterBedInventory() {
    const searchValue = document.getElementById('bed-inventory-search')?.value.toLowerCase() || '';
    const typeValue = document.getElementById('bed-type-filter')?.value || '';
    const statusValue = document.getElementById('bed-status-filter')?.value || '';
    
    const rows = document.querySelectorAll('#beds-inventory-content tbody tr');
    
    rows.forEach(row => {
        const bedId = row.querySelector('td:first-child').textContent.toLowerCase();
        const hospital = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        const bedType = row.getAttribute('data-bed-type').toLowerCase();
        const status = row.getAttribute('data-status').toLowerCase();
        
        const matchesSearch = bedId.includes(searchValue) || 
                             hospital.includes(searchValue) || 
                             bedType.includes(searchValue);
        
        const matchesType = typeValue === '' || bedType === typeValue.toLowerCase();
        const matchesStatus = statusValue === '' || status === statusValue.toLowerCase();
        
        row.style.display = (matchesSearch && matchesType && matchesStatus) ? '' : 'none';
    });
}

// Function to load and display bed assignments
async function loadBedAssignments() {
    const assignmentsContainer = document.getElementById('beds-assignments-content');
    if (!assignmentsContainer) return;
    
    // Show loading state
    assignmentsContainer.innerHTML = '<div class="loading">Loading bed assignments...</div>';
    
    try {
        const assignments = await fetchBedAssignments();
        
        if (assignments.length === 0) {
            assignmentsContainer.innerHTML = '<div class="no-data">No bed assignments found</div>';
            return;
        }
        
        // Create assignments table
        let tableHTML = `
            <div class="table-filters">
                <input type="text" id="bed-assignments-search" placeholder="Search assignments..." class="form-control">
                <select id="bed-assignment-status-filter" class="form-control">
                    <option value="">All Statuses</option>
                    <option value="current">Current</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="discharged">Discharged</option>
                </select>
                <input type="date" id="bed-assignment-date-filter" class="form-control" placeholder="Filter by date">
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Assignment ID</th>
                        <th>Bed ID</th>
                        <th>Bed Type</th>
                        <th>Patient</th>
                        <th>Admission Date</th>
                        <th>Discharge Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Populate table with assignments
        assignments.forEach(assignment => {
            tableHTML += `
                <tr data-assignment-id="${assignment.assignmentID}" data-status="${assignment.status}">
                    <td>${assignment.assignmentID}</td>
                    <td>${assignment.bedID}</td>
                    <td>${assignment.bedType || 'N/A'}</td>
                    <td>${assignment.patientName || 'Patient #' + assignment.patientID}</td>
                    <td>${assignment.admissionDate}</td>
                    <td>${assignment.dischargeDate || 'Not set'}</td>
                    <td><span class="status-badge ${assignment.status}">${assignment.status}</span></td>
                    <td>
                        <button class="btn view-assignment" data-assignment-id="${assignment.assignmentID}">View</button>
                        ${assignment.status === 'current' ? 
                          `<button class="btn discharge-patient" data-assignment-id="${assignment.assignmentID}">Discharge</button>` : 
                          ''}
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        assignmentsContainer.innerHTML = tableHTML;
        
        // Setup event listeners for filtering
        const searchInput = document.getElementById('bed-assignments-search');
        const statusFilter = document.getElementById('bed-assignment-status-filter');
        const dateFilter = document.getElementById('bed-assignment-date-filter');
        
        [searchInput, statusFilter, dateFilter].forEach(el => {
            if (el) {
                el.addEventListener('input', filterBedAssignments);
            }
        });
        
        // Setup event listeners for view and discharge buttons
        document.querySelectorAll('.view-assignment').forEach(button => {
            button.addEventListener('click', function() {
                const assignmentId = this.getAttribute('data-assignment-id');
                viewBedAssignment(assignmentId);
            });
        });
        
        document.querySelectorAll('.discharge-patient').forEach(button => {
            button.addEventListener('click', function() {
                const assignmentId = this.getAttribute('data-assignment-id');
                dischargePatient(assignmentId);
            });
        });
        
    } catch (error) {
        console.error('Error loading bed assignments:', error);
        assignmentsContainer.innerHTML = '<div class="error">Failed to load bed assignments. Please try again later.</div>';
    }
}

// Function to filter bed assignments based on search and filters
function filterBedAssignments() {
    const searchValue = document.getElementById('bed-assignments-search')?.value.toLowerCase() || '';
    const statusValue = document.getElementById('bed-assignment-status-filter')?.value || '';
    const dateValue = document.getElementById('bed-assignment-date-filter')?.value || '';
    
    const rows = document.querySelectorAll('#beds-assignments-content tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const assignmentId = cells[0].textContent.toLowerCase();
        const bedId = cells[1].textContent.toLowerCase();
        const bedType = cells[2].textContent.toLowerCase();
        const patient = cells[3].textContent.toLowerCase();
        const admissionDate = cells[4].textContent;
        const status = row.getAttribute('data-status').toLowerCase();
        
        const matchesSearch = assignmentId.includes(searchValue) || 
                             bedId.includes(searchValue) || 
                             bedType.includes(searchValue) ||
                             patient.includes(searchValue);
        
        const matchesStatus = statusValue === '' || status === statusValue.toLowerCase();
        const matchesDate = dateValue === '' || admissionDate === dateValue;
        
        row.style.display = (matchesSearch && matchesStatus && matchesDate) ? '' : 'none';
    });
}

// Function to view bed details
function viewBed(bedId) {
    alert(`View bed details for Bed #${bedId}`);
    // This would typically open a modal with bed details
    // or navigate to a bed details page
}

// Function to view bed assignment details
function viewBedAssignment(assignmentId) {
    alert(`View assignment details for Assignment #${assignmentId}`);
    // This would typically open a modal with assignment details
    // or navigate to an assignment details page
}

// Function to discharge a patient
function dischargePatient(assignmentId) {
    if (confirm(`Are you sure you want to discharge the patient from assignment #${assignmentId}?`)) {
        // In a real implementation, this would make an API call to update the assignment
        alert(`Patient discharged from assignment #${assignmentId}`);
        // After successful discharge, refresh the assignments list
        loadBedAssignments();
        // Also update bed stats
        updateBedsSection();
    }
}

// Function to open the new bed modal
function openNewBedModal() {
    // Get the modal
    const modal = document.getElementById('new-bed-modal');
    if (!modal) return;
    
    // Display the modal
    modal.style.display = 'block';
    
    // Fetch bed types to populate the dropdown
    fetchBedTypes().then(bedTypes => {
        const selectElement = document.getElementById('new-bed-type');
        if (selectElement) {
            // Clear existing options
            selectElement.innerHTML = '';
            
            // Add bed types as options
            bedTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.type;
                option.textContent = type.type;
                selectElement.appendChild(option);
            });
        }
    });
    
    // Get the form and add submit event listener
    const form = document.getElementById('new-bed-form');
    if (form) {
        form.addEventListener('submit', submitNewBed);
    }
    
    // Get the close button and add click event listener
    const closeButton = modal.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

// Function to submit new bed form
async function submitNewBed(event) {
    event.preventDefault();
    
    const form = event.target;
    const hospitalId = form.elements['new-bed-hospital'].value;
    const bedType = form.elements['new-bed-type'].value;
    
    // Validate form inputs
    if (!hospitalId || !bedType) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create bed data object
    const bedData = {
        hospitalID: parseInt(hospitalId),
        bedType: bedType,
        status: 'available' // Default status for new beds
    };
    
    console.log('Sending bed data to API:', bedData);
    
    // Show loading indicator
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';
    
    try {
        // Send POST request to create new bed - use the correct API endpoint
        // Note: Changed from /api/beds/add to /api/beds to match the backend
        const response = await fetch('http://localhost:8080/api/beds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bedData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create new bed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Server response after adding bed:', result);
        
        // Close the modal
        const modal = document.getElementById('new-bed-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset the form
        form.reset();
        
        // Refresh the bed inventory and stats by fetching from database
        await fetchBedInventory(); // Explicitly fetch from database
        await fetchBedStats();     // Explicitly fetch stats from database
        await updateBedsSection();  // Update UI
        
        alert(`New bed added successfully with ID #${result.bedID || 'N/A'}!`);
        
    } catch (error) {
        console.error('Error creating new bed:', error);
        alert(`Failed to create new bed: ${error.message}`);
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Function to open the bed assignment modal
function openBedAssignmentModal(bedId, bedType) {
    // Get the modal
    const modal = document.getElementById('bed-assignment-modal');
    if (!modal) return;
    
    // Display the modal
    modal.style.display = 'block';
    
    // Set the bed ID and type if provided
    const bedIdInput = document.getElementById('assignment-bed-id');
    const bedTypeInput = document.getElementById('assignment-bed-type');
    
    if (bedIdInput && bedId) {
        bedIdInput.value = bedId;
    }
    
    if (bedTypeInput && bedType) {
        bedTypeInput.value = bedType;
        bedTypeInput.disabled = true;  // Disable changing the bed type
    }
    
    // Fetch patients to populate the dropdown
    fetch('/api/patients')
        .then(response => response.json())
        .then(patients => {
            const selectElement = document.getElementById('assignment-patient-id');
            if (selectElement) {
                // Clear existing options
                selectElement.innerHTML = '<option value="">Select Patient</option>';
                
                // Add patients as options
                patients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.patientID;
                    option.textContent = patient.fullName;
                    selectElement.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching patients:', error);
        });
    
    // Get the form and add submit event listener
    const form = document.getElementById('bed-assignment-form');
    if (form) {
        form.addEventListener('submit', submitBedAssignment);
    }
    
    // Get the close button and add click event listener
    const closeButton = modal.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

// Function to submit bed assignment form
async function submitBedAssignment(event) {
    event.preventDefault();
    
    const form = event.target;
    const bedId = form.elements['assignment-bed-id'].value;
    const patientId = form.elements['assignment-patient-id'].value;
    const admissionDate = form.elements['assignment-admission-date'].value;
    const dischargeDate = form.elements['assignment-discharge-date'].value;
    
    // Validate form inputs
    if (!bedId || !patientId || !admissionDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate dates
    if (dischargeDate && new Date(dischargeDate) < new Date(admissionDate)) {
        alert('Discharge date cannot be earlier than admission date');
        return;
    }
    
    // Create assignment data object
    const assignmentData = {
        bedID: parseInt(bedId),
        patientID: parseInt(patientId),
        admissionDate: admissionDate,
        dischargeDate: dischargeDate || null
    };
    
    console.log('Sending bed assignment data to API:', assignmentData);
    
    // Show loading indicator
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Assigning...';
    
    try {
        // Send POST request to create new assignment
        const response = await fetch('http://localhost:8080/api/beds/assignments/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assignmentData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create bed assignment: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Server response after adding bed assignment:', result);
        
        // Close the modal
        const modal = document.getElementById('bed-assignment-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset the form
        form.reset();
        
        // Refresh the bed assignments and stats explicitly from database
        await fetchBedAssignments(); // Explicitly fetch from database
        await fetchBedStats();       // Explicitly fetch stats from database
        await updateBedsSection();   // Update UI
        
        alert(`Bed assignment created successfully with ID #${result.assignmentID || 'N/A'}!`);
        
    } catch (error) {
        console.error('Error creating bed assignment:', error);
        alert(`Failed to create bed assignment: ${error.message}`);
    } finally {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Function to clear all bed assignments (for testing purposes)
window.clearAllBedAssignments = function() {
    if (confirm('Are you sure you want to clear all bed assignments? This action cannot be undone.')) {
        // This would typically be an API call in a real application
        alert('All bed assignments cleared');
        
        // Refresh the UI
        updateBedsSection();
    }
};

// Function to clear all beds (for testing purposes)
window.clearAllBeds = function() {
    if (confirm('Are you sure you want to clear all beds? This action cannot be undone.')) {
        // This would typically be an API call in a real application
        alert('All beds cleared');
        
        // Refresh the UI
        updateBedsSection();
    }
};

// Register event listeners when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Initialize beds section
    initBedsSection();
}); 