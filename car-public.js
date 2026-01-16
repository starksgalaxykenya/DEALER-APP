// Public Car View Logic
document.addEventListener('DOMContentLoaded', function() {
    // Get car ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('car');
    const viewType = urlParams.get('view');
    
    if (!carId) {
        showError('Car not found. No car ID provided in the URL.');
        return;
    }
    
    loadCarDetails(carId, viewType === 'admin');
});

async function loadCarDetails(carId, isAdminView) {
    try {
        console.log('Loading car details for ID:', carId);
        
        // Get Firestore service
        const db = window.firebaseServices ? window.firebaseServices.getFirestore() : window.db;
        
        if (!db) {
            showError('Database service not available. Please refresh the page.');
            return;
        }
        
        const carDoc = await db.collection('cars').doc(carId).get();
        
        if (!carDoc.exists) {
            showError('Car not found. The vehicle may have been removed.');
            return;
        }
        
        const car = carDoc.data();
        const companyId = car.companyId;
        
        console.log('Car data loaded:', car.vehicleName);
        
        // Load company details if company ID exists
        let companyData = null;
        if (companyId) {
            try {
                const companyDoc = await db.collection('companies').doc(companyId).get();
                if (companyDoc.exists) {
                    companyData = companyDoc.data();
                    console.log('Company data loaded:', companyData.companyName);
                }
            } catch (companyError) {
                console.warn('Could not load company details:', companyError);
            }
        }
        
        // Render car details
        renderCarDetails(car, companyData, isAdminView, carId);
        
    } catch (error) {
        console.error('Error loading car details:', error);
        showError('Error loading car details: ' + error.message);
    }
}

function renderCarDetails(car, companyData, isAdminView, carId) {
    const container = document.getElementById('carContainer');
    
    if (!container) {
        console.error('Container element not found');
        return;
    }
    
    // Create car gallery HTML
    let galleryHTML = '';
    if (car.photos && car.photos.length > 0) {
        galleryHTML = `
            <div class="car-gallery" id="carGallery">
                <img src="${car.photos[0]}" alt="${car.vehicleName || 'Car'}" class="car-image" id="mainCarImage">
                ${car.photos.length > 1 ? `
                    <div style="display: flex; gap: 5px; margin-top: 10px; overflow-x: auto; padding: 10px 0;">
                        ${car.photos.map((photo, index) => `
                            <img src="${photo}" 
                                 alt="Thumbnail ${index + 1}" 
                                 style="width: 80px; height: 60px; object-fit: cover; cursor: pointer; border: 2px solid ${index === 0 ? 'var(--secondary)' : 'transparent'}"
                                 onclick="changeMainImage('${photo}', this)">
                        `).join('')}
                    </div>
                ` : ''}
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
                    <span><strong>${car.mileage ? `${parseInt(car.mileage).toLocaleString()} km` : 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Engine Size:</span>
                    <span><strong>${car.engineSize ? `${car.engineSize} cc` : 'N/A'}</strong></span>
                </div>
                <div class="spec-item">
                    <span>Color:</span>
                    <span><strong>${car.exteriorColor || 'N/A'}</strong></span>
                </div>
                ${car.driveType ? `
                    <div class="spec-item">
                        <span>Drive Type:</span>
                        <span><strong>${car.driveType.toUpperCase()}</strong></span>
                    </div>
                ` : ''}
            </div>
        `;
    } else if (car.type === 'imported') {
        const statusMap = {
            'purchased': { text: 'Purchased', color: '#e3f2fd' },
            'shipped': { text: 'Shipped', color: '#e8f5e9' },
            'arrived': { text: 'Arrived at Port', color: '#fff3e0' },
            'clearing': { text: 'Clearing in Progress', color: '#fff8e1' },
            'cleared': { text: 'Cleared', color: '#e8f5e9' },
            'delivered': { text: 'Delivered to Yard', color: '#e8f5e9' }
        };
        
        const status = statusMap[car.importStatus] || statusMap.purchased;
        
        specsHTML = `
            <div class="specs-grid">
                <div class="spec-item">
                    <span>Import Status:</span>
                    <span><strong style="background: ${status.color}; padding: 2px 8px; border-radius: 4px;">${status.text}</strong></span>
                </div>
                ${car.vin ? `
                    <div class="spec-item">
                        <span>VIN/Chassis:</span>
                        <span><strong>${car.vin}</strong></span>
                    </div>
                ` : ''}
                ${car.originCountry ? `
                    <div class="spec-item">
                        <span>Origin:</span>
                        <span><strong>${car.originCountry}</strong></span>
                    </div>
                ` : ''}
                ${car.eta ? `
                    <div class="spec-item">
                        <span>ETA:</span>
                        <span><strong>${new Date(car.eta).toLocaleDateString()}</strong></span>
                    </div>
                ` : ''}
                ${car.shipName ? `
                    <div class="spec-item">
                        <span>Ship Name:</span>
                        <span><strong>${car.shipName}</strong></span>
                    </div>
                ` : ''}
                ${car.daysAtPort ? `
                    <div class="spec-item">
                        <span>Days at Port:</span>
                        <span><strong>${car.daysAtPort} days</strong></span>
                    </div>
                ` : ''}
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
                ${companyData.companyDescription ? `<p>${companyData.companyDescription}</p>` : ''}
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    ${companyData.companyPhone ? `
                        <div>
                            <strong>Phone:</strong>
                            <p style="margin: 0.25rem 0;">${companyData.companyPhone}</p>
                        </div>
                    ` : ''}
                    ${companyData.whatsappNumber ? `
                        <div>
                            <strong>WhatsApp:</strong>
                            <p style="margin: 0.25rem 0;">${companyData.whatsappNumber}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Create action buttons
    let actionButtons = '';
    const whatsappMessage = `Hello, I'm interested in the ${car.vehicleName || 'this vehicle'}${car.price ? ` listed at KES ${parseFloat(car.price).toLocaleString()}` : ''}.`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappNumber = companyData ? companyData.whatsappNumber : '';
    const phoneNumber = companyData ? companyData.companyPhone : '';
    
    if ((car.type === 'yard' || car.importStatus === 'delivered') && companyData) {
        actionButtons = `
            <div class="action-buttons">
                ${phoneNumber ? `
                    <a href="tel:${phoneNumber.replace(/[^0-9+]/g, '')}" class="btn action-btn" style="background: var(--success);">
                        📞 Call Dealer
                    </a>
                ` : ''}
                ${whatsappNumber ? `
                    <a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}" 
                       target="_blank" 
                       class="btn action-btn" 
                       style="background: #25D366;">
                        💬 WhatsApp Inquiry
                    </a>
                ` : ''}
            </div>
        `;
    }
    
    // Admin actions
    let adminActions = '';
    if (isAdminView && carId) {
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
    
    // Price display
    let priceHTML = '';
    if (car.price) {
        const formattedPrice = parseFloat(car.price).toLocaleString('en-KE');
        priceHTML = `
            <div class="car-price">
                KES ${formattedPrice}
                ${car.negotiable === 'yes' ? '<span style="color: var(--warning); font-size: 0.9rem; margin-left: 1rem;">(Negotiable)</span>' : ''}
            </div>
        `;
    } else if (car.averagePrice) {
        const formattedPrice = parseFloat(car.averagePrice).toLocaleString('en-KE');
        priceHTML = `
            <div class="car-price">
                Market Price: KES ${formattedPrice}
            </div>
        `;
    }
    
    // Registration display
    let registrationHTML = '';
    if (car.registration) {
        registrationHTML = `<p style="color: var(--gray); margin-bottom: 1rem;">Registration: ${car.registration}</p>`;
    }
    
    // Type indicator
    let typeIndicator = '';
    if (car.type === 'imported') {
        typeIndicator = `<div style="background: #e3f2fd; color: #1976d2; padding: 0.5rem 1rem; border-radius: 4px; display: inline-block; margin-bottom: 1rem;">🚢 Imported Vehicle</div>`;
    } else {
        typeIndicator = `<div style="background: #e8f5e9; color: #388e3c; padding: 0.5rem 1rem; border-radius: 4px; display: inline-block; margin-bottom: 1rem;">🏢 Available in Yard</div>`;
    }
    
    // Compile final HTML
    container.innerHTML = `
        ${galleryHTML}
        <div class="car-info">
            ${typeIndicator}
            <h1 class="car-title">${car.vehicleName || 'Unnamed Vehicle'}</h1>
            
            ${registrationHTML}
            ${priceHTML}
            
            <h3 style="margin: 1.5rem 0 1rem 0;">Specifications</h3>
            ${specsHTML}
            ${featuresHTML}
            ${companyHTML}
            ${actionButtons}
            ${adminActions}
            
            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--light); color: var(--gray); font-size: 0.9rem;">
                <p>Vehicle ID: ${carId}</p>
                <p>Last updated: ${car.updatedAt ? new Date(car.updatedAt).toLocaleDateString() : 'N/A'}</p>
            </div>
        </div>
    `;
    
    // Remove loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

function showError(message) {
    const container = document.getElementById('carContainer');
    if (!container) {
        // Create container if it doesn't exist
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2 style="color: var(--danger);">Error</h2>
                <p>${message}</p>
                <a href="index.html" class="btn" style="margin-top: 1rem;">Return to Home</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🚗</div>
            <h2 style="color: var(--danger);">${message}</h2>
            <p style="color: var(--gray); margin-top: 1rem;">The car you're looking for cannot be found.</p>
            <a href="index.html" class="btn" style="margin-top: 2rem;">Return to Home</a>
        </div>
    `;
    
    // Remove loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

// Function to change main image in gallery
window.changeMainImage = function(imageSrc, clickedElement) {
    const mainImage = document.getElementById('mainCarImage');
    if (mainImage) {
        mainImage.src = imageSrc;
    }
    
    // Update active thumbnail
    const thumbnails = document.querySelectorAll('#carGallery img[style*="cursor: pointer"]');
    thumbnails.forEach(thumb => {
        thumb.style.border = '2px solid transparent';
    });
    
    if (clickedElement) {
        clickedElement.style.border = '2px solid var(--secondary)';
    }
};

// Generate QR for current car (admin only)
window.generateQRForCar = function(carId) {
    if (!carId) {
        alert('Car ID not available');
        return;
    }
    window.open(`index.html?generateQR=${carId}`, '_blank');
};

// Share car via WhatsApp
window.shareCar = function(carId) {
    if (!carId) {
        alert('Car ID not available');
        return;
    }
    
    const carName = document.querySelector('.car-title')?.textContent || 'this vehicle';
    const priceElement = document.querySelector('.car-price');
    const price = priceElement ? priceElement.textContent.replace('KES ', '') : '';
    
    const message = `Check out this ${carName}${price ? ` for KES ${price}` : ''}: ${window.location.href}`;
    const encodedMessage = encodeURIComponent(message);
    
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};

// Share car via SMS
window.shareViaSMS = function(carId) {
    if (!carId) {
        alert('Car ID not available');
        return;
    }
    
    const carName = document.querySelector('.car-title')?.textContent || 'this vehicle';
    const priceElement = document.querySelector('.car-price');
    const price = priceElement ? priceElement.textContent.replace('KES ', '') : '';
    
    const message = `Check out this ${carName}${price ? ` for KES ${price}` : ''}: ${window.location.href}`;
    const encodedMessage = encodeURIComponent(message);
    
    window.location.href = `sms:?body=${encodedMessage}`;
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Car Public Page Loaded');
    });
} else {
    console.log('Car Public Page Ready');
}
