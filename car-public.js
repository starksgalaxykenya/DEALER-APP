// Public Car View Logic
document.addEventListener('DOMContentLoaded', function() {
    // Get car ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('car');
    const viewType = urlParams.get('view');
    
    if (!carId) {
        showError('Car not found');
        return;
    }
    
    loadCarDetails(carId, viewType === 'admin');
});

async function loadCarDetails(carId, isAdminView) {
    try {
        const carDoc = await db.collection('cars').doc(carId).get();
        
        if (!carDoc.exists) {
            showError('Car not found');
            return;
        }
        
        const car = carDoc.data();
        const companyId = car.companyId;
        
        // Load company details
        const companyQuery = await db.collection('companies')
            .where('__name__', '==', companyId)
            .limit(1)
            .get();
        
        let companyData = null;
        if (!companyQuery.empty) {
            companyData = companyQuery.docs[0].data();
        }
        
        // Render car details
        renderCarDetails(car, companyData, isAdminView);
        
    } catch (error) {
        console.error('Error loading car details:', error);
        showError('Error loading car details');
    }
}

function renderCarDetails(car, companyData, isAdminView) {
    const container = document.getElementById('carContainer');
    
    // Create car gallery HTML
    let galleryHTML = '';
    if (car.photos && car.photos.length > 0) {
        galleryHTML = `
            <div class="car-gallery">
                <img src="${car.photos[0]}" alt="${car.vehicleName}" class="car-image">
            </div>
        `;
    } else {
        galleryHTML = `
            <div class="car-gallery" style="background: var(--light); display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; color: var(--gray);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🚗</div>
                    <p>No photos available</p>
                </div>
            </div>
        `;
    }
    
    // Create specifications HTML
    let specsHTML = '';
    
    if (car.type === 'yard') {
        specsHTML = `
            <div class="specs-grid">
                <div class="spec-item">
                    <span>Make:</span>
                    <span><strong>${car.make || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Model:</span>
                    <span><strong>${car.model || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Year:</span>
                    <span><strong>${car.year || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Fuel Type:</span>
                    <span><strong>${car.fuelType || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Transmission:</span>
                    <span><strong>${car.transmission || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Mileage:</span>
                    <span><strong>${car.mileage ? `${car.mileage.toLocaleString()} km` : 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Engine Size:</span>
                    <span><strong>${car.engineSize ? `${car.engineSize} cc` : 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Color:</span>
                    <span><strong>${car.exteriorColor || 'N/A'}</strong></span>
                </div>
            </div>
        `;
    } else if (car.type === 'imported') {
        const statusMap = {
            'purchased': 'Purchased',
            'shipped': 'Shipped',
            'arrived': 'Arrived at Port',
            'clearing': 'Clearing in Progress',
            'cleared': 'Cleared',
            'delivered': 'Delivered to Yard'
        };
        
        specsHTML = `
            <div class="specs-grid">
                <div class="spec-item">
                    <span>Import Status:</span>
                    <span><strong>${statusMap[car.importStatus] || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>VIN/Chassis:</span>
                    <span><strong>${car.vin || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Origin:</span>
                    <span><strong>${car.originCountry || 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>ETA:</span>
                    <span><strong>${car.eta ? new Date(car.eta).toLocaleDateString() : 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Ship Name:</span>
                    <span><strong>${car.shipName || 'N/A'}</strong></span>
                </div>
            </div>
        `;
    }
    
    // Create features HTML
    let featuresHTML = '';
    if (car.features && car.features.length > 0) {
        featuresHTML = `
            <h3 style="margin: 1.5rem 0 1rem 0;">Features</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
                ${car.features.map(feature => `
                    <span style="background: var(--light); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">
                        ✓ ${feature}
                    </span>
                `).join('')}
            </div>
        `;
    }
    
    // Create company info HTML
    let companyHTML = '';
    if (companyData) {
        companyHTML = `
            <div class="dealer-info">
                <h3 style="margin-bottom: 1rem;">Dealer Information</h3>
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    ${companyData.logoUrl ? `<img src="${companyData.logoUrl}" alt="${companyData.companyName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : ''}
                    <div>
                        <h4 style="margin: 0;">${companyData.companyName}</h4>
                        <p style="color: var(--gray); margin: 0.25rem 0;">${companyData.yardLocation}</p>
                    </div>
                </div>
                <p>${companyData.companyDescription || ''}</p>
            </div>
        `;
    }
    
    // Create action buttons
    let actionButtons = '';
    const whatsappMessage = `Hello, I'm interested in the ${car.vehicleName} listed at ${car.price ? `KES ${parseFloat(car.price).toLocaleString()}` : 'your dealership'}.`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappNumber = companyData ? companyData.whatsappNumber : '';
    const phoneNumber = companyData ? companyData.companyPhone : '';
    
    if (car.type === 'yard' && companyData) {
        actionButtons = `
            <div class="action-buttons">
                <a href="tel:${phoneNumber}" class="btn action-btn" style="background: var(--success);">
                    📞 Call Dealer
                </a>
                <a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}" 
                   target="_blank" 
                   class="btn action-btn" 
                   style="background: #25D366;">
                    💬 WhatsApp Inquiry
                </a>
            </div>
        `;
    }
    
    // Admin actions
    let adminActions = '';
    if (isAdminView) {
        adminActions = `
            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--light);">
                <h3>Admin Actions</h3>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <a href="index.html" class="btn">Back to Dashboard</a>
                    <button onclick="generateQRForCar('${carId}')" class="btn btn-success">Generate QR Code</button>
                </div>
            </div>
        `;
    }
    
    // Compile final HTML
    container.innerHTML = `
        ${galleryHTML}
        <div class="car-info">
            <h1 class="car-title">${car.vehicleName}</h1>
            
            ${car.registration ? `<p style="color: var(--gray); margin-bottom: 1rem;">Registration: ${car.registration}</p>` : ''}
            
            ${car.price ? `<div class="car-price">KES ${parseFloat(car.price).toLocaleString()}</div>` : ''}
            
            ${car.negotiable === 'yes' ? `<p style="color: var(--warning); font-weight: 500; margin-bottom: 1.5rem;">✔ Price is negotiable</p>` : ''}
            
            ${specsHTML}
            ${featuresHTML}
            ${companyHTML}
            ${actionButtons}
            ${adminActions}
        </div>
    `;
}

function showError(message) {
    const container = document.getElementById('carContainer');
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🚗</div>
            <h2 style="color: var(--danger);">${message}</h2>
            <p style="color: var(--gray); margin-top: 1rem;">The car you're looking for cannot be found.</p>
            <a href="index.html" class="btn" style="margin-top: 2rem;">Return to Home</a>
        </div>
    `;
}

// Generate QR for current car (admin only)
window.generateQRForCar = function(carId) {
    window.open(`index.html?generateQR=${carId}`, '_blank');
};
