// Auth Logic
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerLink = document.getElementById('registerLink');
    const errorMessage = document.getElementById('errorMessage');
    
    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Check if company profile exists
            checkCompanyProfile(user.uid);
        }
    });
    
    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // User logged in
                checkCompanyProfile(userCredential.user.uid);
            })
            .catch((error) => {
                showError(error.message);
            });
    });
    
    // Register link click
    registerLink.addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterModal();
    });
    
    function showRegisterModal() {
        const modalHTML = `
            <div class="modal show" id="registerModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Register as Admin</h3>
                        <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="registerForm">
                            <div class="form-group">
                                <label for="regEmail">Email</label>
                                <input type="email" id="regEmail" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="regPassword">Password</label>
                                <input type="password" id="regPassword" class="form-control" minlength="6" required>
                            </div>
                            <div class="form-group">
                                <label for="confirmPassword">Confirm Password</label>
                                <input type="password" id="confirmPassword" class="form-control" minlength="6" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button onclick="closeModal()" class="btn">Cancel</button>
                        <button onclick="registerAdmin()" class="btn btn-success">Register</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    window.closeModal = function() {
        const modal = document.getElementById('registerModal');
        if (modal) modal.remove();
    };
    
  window.registerAdmin = async function() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!email || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    try {
        // 1. Create user with Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            email: email,
            role: 'admin',
            hasCompany: false,
            companySetUp: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        // 3. Close modal and redirect to company setup
        closeModal();
        window.location.href = 'company-setup.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // User-friendly error messages
        let errorMessage = 'Registration failed: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email is already registered';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address';
                break;
            case 'auth/operation-not-allowed':
                errorMessage += 'Email/password accounts are not enabled';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorMessage);
    }
};
    
    function checkCompanyProfile(userId) {
        db.collection('companies').where('adminId', '==', userId).limit(1).get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    // No company profile exists, redirect to setup
                    window.location.href = 'company-setup.html';
                } else {
                    // Company exists, go to dashboard
                    window.location.href = 'index.html';
                }
            })
            .catch((error) => {
                console.error('Error checking company profile:', error);
                showError('Error loading profile. Please try again.');
            });
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
});
