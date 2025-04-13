// Login test script - Include in login.html with <script src="login_check.js"></script> to test
document.addEventListener('DOMContentLoaded', () => {
    // Add a test button after the form
    const loginForm = document.querySelector('.login-form');
    const container = loginForm.parentElement;
    
    const testButton = document.createElement('button');
    testButton.textContent = 'Check Server Connection';
    testButton.className = 'test-button';
    testButton.style.marginTop = '10px';
    testButton.style.background = '#f0f0f0';
    testButton.style.border = '1px solid #ddd';
    testButton.style.padding = '8px 12px';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    
    container.appendChild(testButton);
    
    // Add test logic
    testButton.addEventListener('click', async () => {
        testButton.textContent = 'Testing connection...';
        testButton.disabled = true;
        
        try {
            // Test server connection
            console.log('Testing server connection...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'OPTIONS',
                signal: controller.signal
            }).catch(err => {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    throw new Error('Connection timeout');
                }
                throw err;
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                testButton.textContent = 'Server is running ✓';
                testButton.style.background = '#e8f5e9';
                testButton.style.color = '#2e7d32';
                
                // Also check admin role functionality
                console.log('Testing admin login...');
                const adminTest = await fetch('http://localhost:8080/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        employeeId: "1001",
                        password: "admin123",
                        role: "admin"
                    })
                });
                
                const adminResult = await adminTest.text();
                console.log('Admin test result:', adminResult);
                
                if (adminTest.ok) {
                    const resultDiv = document.createElement('div');
                    resultDiv.style.marginTop = '10px';
                    resultDiv.style.padding = '10px';
                    resultDiv.style.background = '#e8f5e9';
                    resultDiv.style.border = '1px solid #2e7d32';
                    resultDiv.style.borderRadius = '4px';
                    resultDiv.textContent = 'Admin login test successful!';
                    container.appendChild(resultDiv);
                } else {
                    const resultDiv = document.createElement('div');
                    resultDiv.style.marginTop = '10px';
                    resultDiv.style.padding = '10px';
                    resultDiv.style.background = '#ffebee';
                    resultDiv.style.border = '1px solid #c62828';
                    resultDiv.style.borderRadius = '4px';
                    resultDiv.innerHTML = `<strong>Admin login test failed:</strong><br>${adminResult}`;
                    container.appendChild(resultDiv);
                }
            } else {
                testButton.textContent = 'Server error: ' + response.status;
                testButton.style.background = '#ffebee';
                testButton.style.color = '#c62828';
            }
        } catch (error) {
            console.error('Connection test error:', error);
            testButton.textContent = 'Server not running ✗';
            testButton.style.background = '#ffebee';
            testButton.style.color = '#c62828';
        } finally {
            setTimeout(() => {
                testButton.disabled = false;
            }, 2000);
        }
    });
}); 