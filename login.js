document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing login form');
    
    // Form switching
    const switchFormLinks = document.querySelectorAll('.switch-form a');
    switchFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const formType = link.dataset.form;
            document.querySelector('.form-section.active').classList.remove('active');
            document.querySelector(`.${formType}-section`).classList.add('active');
        });
    });

    // Password visibility toggle
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            const type = input.getAttribute('type');
            input.setAttribute('type', type === 'password' ? 'text' : 'password');
            button.classList.toggle('fa-eye');
            button.classList.toggle('fa-eye-slash');
        });
    });

    // Check if user is already logged in
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData && userData.success) {
        console.log('User already logged in, redirecting to:', userData.redirectUrl);
        window.location.href = userData.redirectUrl;
        return;
    }

    // Create error message element right away
    let errorElement = document.createElement('div');
    errorElement.className = 'login-error';
    const loginForm = document.querySelector('.login-form');
    const submitBtn = loginForm.querySelector('.submit-btn');
    loginForm.insertBefore(errorElement, submitBtn);

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        
        // Clear any existing error messages
        errorElement.style.display = 'none';
        
        // Show loading state
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        // Get form values using name attributes
        const employeeId = loginForm.querySelector('input[name="employeeId"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;
        const role = loginForm.querySelector('input[name="role"]:checked').value;
        
        console.log('Form values:', { employeeId, role });
        
        try {
            // Send login request to backend
            console.log('Sending login request to backend...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employeeId,
                    password,
                    role
                }),
                signal: controller.signal
            }).catch(err => {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    throw new Error('Connection timeout. Is the server running?');
                }
                throw err;
            });
            
            clearTimeout(timeoutId);
            
            // Reset button appearance but keep it disabled until we process the response
            submitBtn.textContent = originalBtnText;
            
            console.log('Response status:', response.status);
            
            // Parse response
            const data = await response.json();
            console.log('Response data:', data);
            
            // Enable button
            submitBtn.disabled = false;
            
            if (response.ok && data.success) {
                console.log('Login successful, redirecting to:', data.redirectUrl);
                
                // Flash success message
                showSuccessMessage('Login successful! Redirecting...');
                
                // Store user data in localStorage
                localStorage.setItem('userData', JSON.stringify(data));
                
                // Delay redirect slightly to show success message
                setTimeout(() => {
                    // Redirect to dashboard based on role
                    window.location.href = data.redirectUrl;
                }, 500);
            } else {
                // Show error message from server or default
                console.error('Login failed:', data);
                const errorMsg = data.message || 'Invalid credentials. Please try again.';
                showErrorMessage(errorMsg);
            }
        } catch (error) {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            
            // Show appropriate error message
            console.error('Login error:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('server running')) {
                showErrorMessage('Cannot connect to server. Please ensure the backend server is running.');
            } else {
                showErrorMessage('Error: ' + error.message);
            }
        }
    });
    
    // Helper function to show error message
    function showErrorMessage(message) {
        errorElement.textContent = message;
        errorElement.style.backgroundColor = '#ffebee';
        errorElement.style.borderLeftColor = '#c62828';
        errorElement.style.color = '#c62828';
        errorElement.style.display = 'block';
        
        // Scroll to error message
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Helper function to show success message
    function showSuccessMessage(message) {
        errorElement.textContent = message;
        errorElement.style.backgroundColor = '#e8f5e9';
        errorElement.style.borderLeftColor = '#2e7d32';
        errorElement.style.color = '#2e7d32';
        errorElement.style.display = 'block';
    }
}); 