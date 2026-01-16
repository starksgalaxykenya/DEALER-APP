// Company Profile Setup
document.addEventListener('DOMContentLoaded', function() {
    const companyForm = document.getElementById('companyForm');
    const errorMessage = document.getElementById('errorMessage');
    const progress = document.getElementById('progress');
    
    // Check if user is authenticated
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Not authenticated, redirect to login
            window.location.href = 'auth.html';
        }
    });
    
    // Form submission
    companyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            showError('User not authenticated. Please login again.');
            return;
        }
        
        // Get form values
        const companyData = {
            companyName: document.getElementById('companyName').value,
            yardLocation: document.getElementById('yardLocation').value,
            companyPhone: document.getElementById('companyPhone').value,
            whatsappNumber: document.getElementById('whatsappNumber').value,
            companyDescription: document.getElementById('companyDescription').value,
            adminId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Show progress
        progress.style.display = 'block';
        companyForm.style.opacity = '0.5';
        
        try {
            // Upload logo if selected
            const logoFile = document.getElementById('companyLogo').files[0];
            if (logoFile) {
                const storageRef = storage.ref();
                const logoRef = storageRef.child(`company-logos/${user.uid}/${logoFile.name}`);
                const snapshot = await logoRef.put(logoFile);
                const logoUrl = await snapshot.ref.getDownloadURL();
                companyData.logoUrl = logoUrl;
            }
            
            // Save company data to Firestore
            await db.collection('companies').add(companyData);
            
            // Update user role to admin with company
            await db.collection('users').doc(user.uid).update({
                hasCompany: true
            });
            
            // Redirect to dashboard
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Error saving company:', error);
            showError('Error saving company profile: ' + error.message);
            progress.style.display = 'none';
            companyForm.style.opacity = '1';
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
});
