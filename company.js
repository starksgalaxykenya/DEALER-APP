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
            adminEmail: user.email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Validate required fields
        if (!companyData.companyName || !companyData.yardLocation || 
            !companyData.companyPhone || !companyData.whatsappNumber) {
            showError('Please fill in all required fields.');
            return;
        }
        
        // Show progress
        progress.style.display = 'block';
        companyForm.style.opacity = '0.5';
        
        try {
            // 1. First, check if company already exists for this user
            const existingCompanyQuery = await db.collection('companies')
                .where('adminId', '==', user.uid)
                .limit(1)
                .get();
            
            if (!existingCompanyQuery.empty) {
                // Company already exists, update it instead
                const existingCompanyId = existingCompanyQuery.docs[0].id;
                await db.collection('companies').doc(existingCompanyId).update(companyData);
            } else {
                // 2. Upload logo if selected
                const logoFile = document.getElementById('companyLogo').files[0];
                if (logoFile) {
                    const storageRef = storage.ref();
                    const logoRef = storageRef.child(`company-logos/${user.uid}/${Date.now()}-${logoFile.name}`);
                    const snapshot = await logoRef.put(logoFile);
                    const logoUrl = await snapshot.ref.getDownloadURL();
                    companyData.logoUrl = logoUrl;
                }
                
                // 3. Save company data to Firestore
                await db.collection('companies').add(companyData);
                
                // 4. Ensure user document exists or update it
                const userDocRef = db.collection('users').doc(user.uid);
                const userDoc = await userDocRef.get();
                
                if (userDoc.exists) {
                    // Update existing user document
                    await userDocRef.update({
                        hasCompany: true,
                        companySetUp: true,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    // Create user document if it doesn't exist
                    await userDocRef.set({
                        email: user.email,
                        role: 'admin',
                        hasCompany: true,
                        companySetUp: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            }
            
            // Success - redirect to dashboard
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
    
    // Load existing company data if it exists
    async function loadExistingCompanyData() {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
            const companyQuery = await db.collection('companies')
                .where('adminId', '==', user.uid)
                .limit(1)
                .get();
            
            if (!companyQuery.empty) {
                const companyData = companyQuery.docs[0].data();
                
                // Pre-fill form with existing data
                document.getElementById('companyName').value = companyData.companyName || '';
                document.getElementById('yardLocation').value = companyData.yardLocation || '';
                document.getElementById('companyPhone').value = companyData.companyPhone || '';
                document.getElementById('whatsappNumber').value = companyData.whatsappNumber || '';
                document.getElementById('companyDescription').value = companyData.companyDescription || '';
                
                // Update form title if editing existing company
                const title = document.querySelector('.auth-title');
                if (title) {
                    title.textContent = 'Edit Company Profile';
                }
                
                const subtitle = document.querySelector('.auth-card p');
                if (subtitle) {
                    subtitle.textContent = 'Update your dealership information';
                }
            }
        } catch (error) {
            console.error('Error loading company data:', error);
        }
    }
    
    // Load existing company data when page loads
    loadExistingCompanyData();
});
