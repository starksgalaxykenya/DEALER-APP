// Inventory Management Logic
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    let currentCompanyId = null;
    let allInventory = [];
    let filteredInventory = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'auth.html';
        } else {
            loadCompanyProfile(user.uid);
            loadInventory();
        }
    });
    
    // Event Listeners
    logoutBtn.addEventListener('click', logout);
    
    // Load company profile
    async function loadCompanyProfile(userId) {
        try {
            const companyQuery = await db.collection('companies')
                .where('adminId', '==', userId)
                .limit(1)
                .get();
            
            if (!companyQuery.empty) {
                const companyDoc = companyQuery.docs[0];
                currentCompanyId = companyDoc.id;
            }
        } catch (error) {
            console.error('Error loading company:', error);
        }
    }
    
    // Load inventory data
    async function loadInventory() {
        if (!currentCompanyId) {
            setTimeout(loadInventory, 1000); // Wait for company ID
            return;
        }
        
        try {
            const carsQuery = await db.collection('cars')
                .where('companyId', '==', currentCompanyId)
                .orderBy('createdAt', 'desc')
                .get();
            
            allInventory = [];
            carsQuery.forEach((doc) => {
                allInventory.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            updateInventorySummary();
            filterInventory();
            
        } catch (error) {
            console.error('Error loading inventory:', error);
            document.getElementById('inventoryTable').innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem; color: var(--danger);">
                        Error loading inventory. Please try again.
                    </td>
                </tr>
            `;
        }
    }
    
    // Update inventory summary
    function updateInventorySummary() {
        let totalVehicles = 0;
        let availableVehicles = 0;
        let transitVehicles = 0;
        let totalValue = 0;
        
        allInventory.forEach((car) => {
            totalVehicles++;
            
            if (car.type === 'yard') {
                availableVehicles++;
                if (car.price) {
                    totalValue += parseFloat(car.price);
                }
            } else if (car.type === 'imported') {
                transitVehicles++;
            }
        });
        
        document.getElementById('totalVehicles').textContent = totalVehicles;
        document.getElementById('availableVehicles').textContent = availableVehicles;
        document.getElementById('transitVehicles').textContent = transitVehicles;
        document.getElementById('inventoryValue').textContent = `KES ${totalValue.toLocaleString()}`;
    }
    
    // Filter inventory
    window.filterInventory = function() {
        const typeFilter = document.getElementById('inventoryType').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        filteredInventory = allInventory.filter((car) => {
            let typeMatch = true;
            let statusMatch = true;
            
            // Type filter
            if (typeFilter !== 'all') {
                typeMatch = car.type === typeFilter;
            }
            
            // Status filter
            if (statusFilter !== 'all') {
                if (car.type === 'imported') {
                    if (statusFilter === 'delivered') {
                        statusMatch = car.importStatus === 'delivered';
                    } else if (statusFilter === 'active') {
                        statusMatch = car.importStatus !== 'delivered';
                    }
                } else if (car.type === 'yard') {
                    if (statusFilter === 'sold') {
                        statusMatch = car.status === 'sold';
                    } else if (statusFilter === 'active') {
                        statusMatch = car.status !== 'sold';
                    }
                }
            }
            
            return typeMatch && statusMatch;
        });
        
        currentPage = 1;
        renderInventoryTable();
    };
    
    // Search inventory
    window.searchInventory = function() {
        const searchTerm = document.getElementById('searchBox').value.toLowerCase();
        
        if (!searchTerm) {
            filterInventory();
            return;
        }
        
        filteredInventory = allInventory.filter((car) => {
            const searchableFields = [
                car.vehicleName,
                car.vin,
                car.registration,
                car.make,
                car.model,
                car.dealerName,
                car.shipName
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchableFields.includes(searchTerm);
        });
        
        currentPage = 1;
        renderInventoryTable();
    };
    
    // Render inventory table
    function renderInventoryTable() {
        const tableBody = document.getElementById('inventoryTable');
        
        if (filteredInventory.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem; color: var(--gray);">
                        No vehicles found. Click "Add New Vehicle" to get started.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredInventory.slice(startIndex, endIndex);
        
        // Build table rows
        let tableHTML = '';
        
        pageItems.forEach((car) => {
            // Determine status badge
            let statusBadge = '';
            if (car.type === 'imported') {
                const statusMap = {
                    'purchased': { text: 'Purchased', class: 'status-purchased' },
                    'shipped': { text: 'Shipped', class: 'status-shipped' },
                    'arrived': { text: 'At Port', class: 'status-arrived' },
                    'clearing': { text: 'Clearing', class: 'status-clearing' },
                    'cleared': { text: 'Cleared', class: 'status-cleared' },
                    'delivered': { text: 'Delivered', class: 'status-delivered' }
                };
                const status = statusMap[car.importStatus] || statusMap.purchased;
                statusBadge = `<span class="status-badge ${status.class}">${status.text}</span>`;
            } else {
                statusBadge = car.status === 'sold' 
                    ? `<span class="status-badge" style="background: #e0e0e0; color: #666;">Sold</span>`
                    : `<span class="status-badge status-delivered">Available</span>`;
            }
            
            // Determine location/ETA
            let location = 'Yard';
            if (car.type === 'imported') {
                if (car.importStatus === 'delivered') {
                    location = 'Yard';
                } else if (car.eta) {
                    location = `ETA: ${new Date(car.eta).toLocaleDateString()}`;
                } else {
                    location = 'In Transit';
                }
            }
            
            tableHTML += `
                <tr>
                    <td>
                        <strong>${car.vehicleName || 'Unnamed Vehicle'}</strong>
                        ${car.registration ? `<br><small style="color: var(--gray);">${car.registration}</small>` : ''}
                    </td>
                    <td>${car.type === 'imported' ? 'Imported' : 'Yard'}</td>
                    <td>${statusBadge}</td>
                    <td>${car.price ? `KES ${parseFloat(car.price).toLocaleString()}` : 'N/A'}</td>
                    <td>${location}</td>
                    <td>${new Date(car.createdAt).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons-small">
                            <button onclick="viewCarDetails('${car.id}')" class="btn">View</button>
                            <button onclick="editCar('${car.id}')" class="btn btn-warning">Edit</button>
                            <button onclick="generateCarQR('${car.id}')" class="btn btn-success">QR</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHTML;
        
        // Render pagination controls
        renderPaginationControls(totalPages);
    }
    
    // Render pagination controls
    function renderPaginationControls(totalPages) {
        const paginationDiv = document.getElementById('paginationControls');
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">
                <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
                    class="btn" style="padding: 0.25rem 0.5rem; ${currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    ← Previous
                </button>
        `;
        
        // Show page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                paginationHTML += `<button class="btn" style="background: var(--secondary); color: white; padding: 0.25rem 0.5rem;">${i}</button>`;
            } else if (i <= 3 || i === totalPages || Math.abs(i - currentPage) <= 1) {
                paginationHTML += `<button onclick="changePage(${i})" class="btn" style="padding: 0.25rem 0.5rem;">${i}</button>`;
            } else if (i === 4 && currentPage > 4) {
                paginationHTML += `<span style="padding: 0.25rem;">...</span>`;
            }
        }
        
        paginationHTML += `
                <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} 
                    class="btn" style="padding: 0.25rem 0.5rem; ${currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    Next →
                </button>
            </div>
            <div style="margin-top: 0.5rem; color: var(--gray); font-size: 0.9rem;">
                Showing ${Math.min(filteredInventory.length, (currentPage - 1) * itemsPerPage + 1)}-${Math.min(currentPage * itemsPerPage, filteredInventory.length)} of ${filteredInventory.length} vehicles
            </div>
        `;
        
        paginationDiv.innerHTML = paginationHTML;
    }
    
    // Change page
    window.changePage = function(page) {
        const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderInventoryTable();
        }
    };
    
    // Show add car modal
    window.showAddCarModal = function() {
        document.getElementById('addCarModal').classList.add('show');
        resetCarForm();
    };
    
    // Toggle car type fields
    window.toggleCarTypeFields = function() {
        const carType = document.getElementById('carType').value;
        
        // Hide all type-specific fields
        document.getElementById('importedFields').style.display = 'none';
        document.getElementById('yardFields').style.display = 'none';
        
        // Clear required attributes
        const importedRequired = ['vin', 'eta', 'importStatus'];
        const yardRequired = ['sellingPrice'];
        
        importedRequired.forEach(field => {
            const element = document.getElementById(field);
            if (element) element.required = false;
        });
        
        yardRequired.forEach(field => {
            const element = document.getElementById(field);
            if (element) element.required = false;
        });
        
        // Show relevant fields and set required
        if (carType === 'imported') {
            document.getElementById('importedFields').style.display = 'block';
            importedRequired.forEach(field => {
                const element = document.getElementById(field);
                if (element) element.required = true;
            });
        } else if (carType === 'yard') {
            document.getElementById('yardFields').style.display = 'block';
            yardRequired.forEach(field => {
                const element = document.getElementById(field);
                if (element) element.required = true;
            });
        }
    };
    
    // Reset car form
    function resetCarForm() {
        document.getElementById('addCarForm').reset();
        document.getElementById('importedFields').style.display = 'none';
        document.getElementById('yardFields').style.display = 'none';
        document.getElementById('photoPreview').innerHTML = '';
        
        // Uncheck all feature checkboxes
        document.querySelectorAll('.feature-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    // Save vehicle
    window.saveVehicle = async function() {
        const form = document.getElementById('addCarForm');
        if (!form.checkValidity()) {
            alert('Please fill in all required fields');
            form.reportValidity();
            return;
        }
        
        const user = auth.currentUser;
        if (!user || !currentCompanyId) {
            alert('Please login again');
            return;
        }
        
        const carType = document.getElementById('carType').value;
        const carData = {
            companyId: currentCompanyId,
            type: carType,
            vehicleName: document.getElementById('vehicleName').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.uid,
            status: 'active'
        };
        
        // Collect features
        const features = [];
        document.querySelectorAll('.feature-checkbox:checked').forEach(checkbox => {
            features.push(checkbox.value);
        });
        
        const customFeatures = document.getElementById('customFeatures').value;
        if (customFeatures) {
            customFeatures.split(',').forEach(feature => {
                const trimmedFeature = feature.trim();
                if (trimmedFeature) features.push(trimmedFeature);
            });
        }
        
        if (features.length > 0) {
            carData.features = features;
        }
        
        // Add type-specific fields
        if (carType === 'imported') {
            carData.vin = document.getElementById('vin').value;
            carData.dealerName = document.getElementById('dealerName').value;
            carData.originCountry = document.getElementById('originCountry').value;
            carData.shipName = document.getElementById('shipName').value;
            carData.eta = document.getElementById('eta').value;
            carData.importStatus = document.getElementById('importStatus').value;
            carData.storageCost = parseFloat(document.getElementById('storageCost').value) || 0;
            carData.clearingFees = parseFloat(document.getElementById('clearingFees').value) || 0;
            carData.demurrageCharges = parseFloat(document.getElementById('demurrageCharges').value) || 0;
            
            // Calculate days at port if arrived
            if (carData.importStatus === 'arrived' || carData.importStatus === 'clearing') {
                const arrivalDate = new Date(carData.eta);
                const today = new Date();
                const daysAtPort = Math.max(0, Math.floor((today - arrivalDate) / (1000 * 60 * 60 * 24)));
                carData.daysAtPort = daysAtPort;
                
                // Calculate total import cost
                let totalImportCost = carData.clearingFees + carData.demurrageCharges;
                if (carData.storageCost && daysAtPort > 0) {
                    totalImportCost += carData.storageCost * daysAtPort;
                }
                carData.totalImportCost = totalImportCost;
            }
        } else if (carType === 'yard') {
            carData.make = document.getElementById('make').value;
            carData.model = document.getElementById('model').value;
            carData.year = document.getElementById('year').value;
            carData.engineSize = document.getElementById('engineSize').value;
            carData.fuelType = document.getElementById('fuelType').value;
            carData.transmission = document.getElementById('transmission').value;
            carData.mileage = document.getElementById('mileage').value;
            carData.driveType = document.getElementById('driveType').value;
            carData.exteriorColor = document.getElementById('exteriorColor').value;
            carData.registration = document.getElementById('registration').value;
            carData.averagePrice = parseFloat(document.getElementById('averagePrice').value) || 0;
            carData.price = parseFloat(document.getElementById('sellingPrice').value) || 0;
            carData.negotiable = document.getElementById('negotiable').value;
        }
        
        try {
            // Save to Firestore
            const docRef = await db.collection('cars').add(carData);
            
            // Upload photos if any
            const photoFiles = document.getElementById('carPhotos').files;
            if (photoFiles.length > 0) {
                const photoUrls = await uploadCarPhotos(photoFiles, docRef.id);
                await docRef.update({ photos: photoUrls });
            }
            
            alert('Vehicle saved successfully!');
            closeModal('addCarModal');
            loadInventory(); // Refresh inventory
            
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Error saving vehicle: ' + error.message);
        }
    };
    
    // Upload car photos
    async function uploadCarPhotos(files, carId) {
        const photoUrls = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageRef = storage.ref();
            const photoRef = storageRef.child(`car-photos/${currentCompanyId}/${carId}/${Date.now()}-${file.name}`);
            
            try {
                const snapshot = await photoRef.put(file);
                const photoUrl = await snapshot.ref.getDownloadURL();
                photoUrls.push(photoUrl);
            } catch (error) {
                console.error('Error uploading photo:', error);
            }
        }
        
        return photoUrls;
    }
    
    // Edit car
    window.editCar = async function(carId) {
        try {
            const carDoc = await db.collection('cars').doc(carId).get();
            if (!carDoc.exists) {
                alert('Car not found');
                return;
            }
            
            const car = carDoc.data();
            let editFormHTML = `
                <form id="editCarForm">
                    <input type="hidden" id="editCarId" value="${carId}">
                    
                    <div class="form-group">
                        <label for="editVehicleName">Vehicle Name *</label>
                        <input type="text" id="editVehicleName" class="form-control" value="${car.vehicleName || ''}" required>
                    </div>
            `;
            
            if (car.type === 'imported') {
                editFormHTML += `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                        <div class="form-group">
                            <label for="editVin">VIN / Chassis Number</label>
                            <input type="text" id="editVin" class="form-control" value="${car.vin || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="editImportStatus">Import Status</label>
                            <select id="editImportStatus" class="form-control">
                                <option value="purchased" ${car.importStatus === 'purchased' ? 'selected' : ''}>Purchased</option>
                                <option value="shipped" ${car.importStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="arrived" ${car.importStatus === 'arrived' ? 'selected' : ''}>Arrived at Port</option>
                                <option value="clearing" ${car.importStatus === 'clearing' ? 'selected' : ''}>Clearing in Progress</option>
                                <option value="cleared" ${car.importStatus === 'cleared' ? 'selected' : ''}>Cleared</option>
                                <option value="delivered" ${car.importStatus === 'delivered' ? 'selected' : ''}>Delivered to Yard</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editEta">ETA</label>
                            <input type="date" id="editEta" class="form-control" value="${car.eta || ''}">
                        </div>
                    </div>
                `;
            } else if (car.type === 'yard') {
                editFormHTML += `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                        <div class="form-group">
                            <label for="editRegistration">Registration Number</label>
                            <input type="text" id="editRegistration" class="form-control" value="${car.registration || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="editPrice">Selling Price (KES)</label>
                            <input type="number" id="editPrice" class="form-control" value="${car.price || ''}" step="0.01" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label for="editStatus">Status</label>
                            <select id="editStatus" class="form-control">
                                <option value="active" ${car.status === 'active' ? 'selected' : ''}>Available</option>
                                <option value="sold" ${car.status === 'sold' ? 'selected' : ''}>Sold</option>
                                <option value="reserved" ${car.status === 'reserved' ? 'selected' : ''}>Reserved</option>
                            </select>
                        </div>
                    </div>
                `;
            }
            
            editFormHTML += `
                    <div class="form-group">
                        <label for="editNotes">Notes</label>
                        <textarea id="editNotes" class="form-control" rows="3">${car.notes || ''}</textarea>
                    </div>
                </form>
            `;
            
            document.getElementById('editCarContent').innerHTML = editFormHTML;
            document.getElementById('editCarModal').classList.add('show');
            
        } catch (error) {
            console.error('Error loading car for edit:', error);
            alert('Error loading car details');
        }
    };
    
    // Update vehicle
    window.updateVehicle = async function() {
        const carId = document.getElementById('editCarId').value;
        const carData = {
            updatedAt: new Date().toISOString(),
            vehicleName: document.getElementById('editVehicleName').value
        };
        
        // Add specific fields based on type
        const importStatus = document.getElementById('editImportStatus');
        if (importStatus) {
            carData.importStatus = importStatus.value;
        }
        
        const price = document.getElementById('editPrice');
        if (price) {
            carData.price = parseFloat(price.value) || 0;
        }
        
        const status = document.getElementById('editStatus');
        if (status) {
            carData.status = status.value;
        }
        
        const registration = document.getElementById('editRegistration');
        if (registration) {
            carData.registration = registration.value;
        }
        
        const eta = document.getElementById('editEta');
        if (eta) {
            carData.eta = eta.value;
        }
        
        const vin = document.getElementById('editVin');
        if (vin) {
            carData.vin = vin.value;
        }
        
        const notes = document.getElementById('editNotes');
        if (notes) {
            carData.notes = notes.value;
        }
        
        try {
            await db.collection('cars').doc(carId).update(carData);
            alert('Vehicle updated successfully!');
            closeModal('editCarModal');
            loadInventory(); // Refresh inventory
            
        } catch (error) {
            console.error('Error updating vehicle:', error);
            alert('Error updating vehicle: ' + error.message);
        }
    };
    
    // View car details
    window.viewCarDetails = function(carId) {
        window.open(`car-details.html?car=${carId}&view=admin`, '_blank');
    };
    
   // Generate QR function - Fixed version
window.generateQR = async function(carId) {
    try {
        // Get car data
        const carDoc = await db.collection('cars').doc(carId).get();
        if (!carDoc.exists) {
            alert('Car not found');
            return;
        }
        
        const car = {
            id: carId,
            ...carDoc.data()
        };
        
        // Get company data
        let companyData = null;
        if (car.companyId) {
            const companyDoc = await db.collection('companies').doc(car.companyId).get();
            if (companyDoc.exists) {
                companyData = companyDoc.data();
            }
        }
        
        // Use the QR generator module
        const qrResult = await window.generateQR(carId, {
            size: 250,
            margin: 3,
            colorDark: '#2c3e50',
            colorLight: '#FFFFFF',
            rounded: true
        });
        
        // Display QR in modal
        const qrContainer = document.getElementById('qrContainer');
        qrContainer.innerHTML = '';
        qrContainer.appendChild(qrResult.container);
        
        // Add sticker printing button
        const stickerBtn = document.createElement('button');
        stickerBtn.className = 'btn btn-warning';
        stickerBtn.innerHTML = '🖨️ Print Car Sticker';
        stickerBtn.onclick = () => printCarSticker(carId, car, companyData);
        stickerBtn.style.marginTop = '1rem';
        
        const buttonContainer = document.querySelector('.qr-actions');
        if (buttonContainer) {
            buttonContainer.appendChild(stickerBtn);
        }
        
        // Show modal
        document.getElementById('qrModal').classList.add('show');
        
    } catch (error) {
        console.error('Error generating QR:', error);
        alert('Error: ' + error.message);
    }
};

// NEW: Print Car Sticker Function
window.printCarSticker = async function(carId, carData, companyData) {
    try {
        // Get fresh data if not provided
        if (!carData || carData.id !== carId) {
            const carDoc = await db.collection('cars').doc(carId).get();
            if (!carDoc.exists) {
                alert('Car not found');
                return;
            }
            carData = {
                id: carId,
                ...carDoc.data()
            };
        }
        
        if (!companyData && carData.companyId) {
            const companyDoc = await db.collection('companies').doc(carData.companyId).get();
            if (companyDoc.exists) {
                companyData = companyDoc.data();
            }
        }
        
        // Generate QR code for the sticker
        const qrResult = await window.generateQR(carId, {
            size: 150,
            margin: 2,
            colorDark: '#000000',
            colorLight: '#FFFFFF',
            rounded: false
        });
        
        // Get QR code data URL
        const qrDataUrl = qrResult.canvas.toDataURL('image/png');
        
        // Create sticker HTML
        const stickerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Car Sticker - ${carData.vehicleName || 'Vehicle'}</title>
                <style>
                    @media print {
                        @page {
                            margin: 0;
                            size: 4in 6in; /* Standard sticker size */
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            width: 4in;
                            height: 6in;
                            font-family: Arial, sans-serif;
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                    }
                    
                    .sticker {
                        width: 4in;
                        height: 6in;
                        padding: 15px;
                        border: 2px solid #333;
                        border-radius: 10px;
                        background: white;
                        box-sizing: border-box;
                        position: relative;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #2c3e50;
                    }
                    
                    .header h2 {
                        margin: 0;
                        color: #2c3e50;
                        font-size: 18px;
                    }
                    
                    .vehicle-name {
                        font-size: 16px;
                        font-weight: bold;
                        margin: 10px 0;
                        text-align: center;
                    }
                    
                    .qr-section {
                        text-align: center;
                        margin: 15px 0;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    }
                    
                    .qr-code {
                        margin: 10px auto;
                    }
                    
                    .scan-text {
                        font-size: 12px;
                        color: #666;
                        margin-top: 5px;
                    }
                    
                    .details-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        margin: 15px 0;
                        font-size: 12px;
                    }
                    
                    .detail-item {
                        padding: 4px;
                        border-bottom: 1px dotted #eee;
                    }
                    
                    .detail-label {
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    
                    .price {
                        text-align: center;
                        font-size: 18px;
                        font-weight: bold;
                        color: #27ae60;
                        margin: 15px 0;
                        padding: 10px;
                        background: #f8f9fa;
                        border-radius: 5px;
                    }
                    
                    .company-info {
                        margin-top: 15px;
                        padding-top: 10px;
                        border-top: 2px solid #2c3e50;
                        font-size: 11px;
                    }
                    
                    .company-name {
                        font-weight: bold;
                        font-size: 12px;
                        margin-bottom: 5px;
                    }
                    
                    .contact-info {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                    }
                    
                    .contact-item {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    }
                    
                    .features {
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    
                    .features-title {
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #2c3e50;
                    }
                    
                    .features-list {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 4px;
                    }
                    
                    .feature-tag {
                        background: #e8f4fd;
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-size: 10px;
                    }
                    
                    .sticker-footer {
                        text-align: center;
                        margin-top: 10px;
                        font-size: 10px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="sticker">
                    <div class="header">
                        <h2>${companyData?.companyName || 'DealerOS'}</h2>
                    </div>
                    
                    <div class="vehicle-name">
                        ${carData.vehicleName || 'Vehicle'}
                    </div>
                    
                    ${carData.registration ? `
                        <div style="text-align: center; font-size: 14px; margin-bottom: 10px;">
                            <strong>Reg:</strong> ${carData.registration}
                        </div>
                    ` : ''}
                    
                    <div class="qr-section">
                        <div class="qr-code">
                            <img src="${qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px;">
                        </div>
                        <div class="scan-text">
                            📱 Scan QR code for full details
                        </div>
                    </div>
                    
                    ${carData.price ? `
                        <div class="price">
                            KES ${parseFloat(carData.price).toLocaleString('en-KE')}
                            ${carData.negotiable === 'yes' ? '<span style="font-size: 12px; color: #f39c12;">(Negotiable)</span>' : ''}
                        </div>
                    ` : ''}
                    
                    <div class="details-grid">
                        ${carData.make ? `
                            <div class="detail-item">
                                <span class="detail-label">Make:</span> ${carData.make}
                            </div>
                        ` : ''}
                        
                        ${carData.model ? `
                            <div class="detail-item">
                                <span class="detail-label">Model:</span> ${carData.model}
                            </div>
                        ` : ''}
                        
                        ${carData.year ? `
                            <div class="detail-item">
                                <span class="detail-label">Year:</span> ${carData.year}
                            </div>
                        ` : ''}
                        
                        ${carData.fuelType ? `
                            <div class="detail-item">
                                <span class="detail-label">Fuel:</span> ${carData.fuelType}
                            </div>
                        ` : ''}
                        
                        ${carData.transmission ? `
                            <div class="detail-item">
                                <span class="detail-label">Trans:</span> ${carData.transmission}
                            </div>
                        ` : ''}
                        
                        ${carData.mileage ? `
                            <div class="detail-item">
                                <span class="detail-label">Mileage:</span> ${parseInt(carData.mileage).toLocaleString()} km
                            </div>
                        ` : ''}
                        
                        ${carData.engineSize ? `
                            <div class="detail-item">
                                <span class="detail-label">Engine:</span> ${carData.engineSize} cc
                            </div>
                        ` : ''}
                        
                        ${carData.exteriorColor ? `
                            <div class="detail-item">
                                <span class="detail-label">Color:</span> ${carData.exteriorColor}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${carData.features && carData.features.length > 0 ? `
                        <div class="features">
                            <div class="features-title">Features:</div>
                            <div class="features-list">
                                ${carData.features.slice(0, 5).map(feature => 
                                    `<span class="feature-tag">${feature}</span>`
                                ).join('')}
                                ${carData.features.length > 5 ? 
                                    `<span class="feature-tag">+${carData.features.length - 5} more</span>` 
                                    : ''
                                }
                            </div>
                        </div>
                    ` : ''}
                    
                    ${companyData ? `
                        <div class="company-info">
                            <div class="company-name">${companyData.companyName}</div>
                            <div class="contact-info">
                                ${companyData.yardLocation ? `
                                    <div class="contact-item">
                                        📍 ${companyData.yardLocation}
                                    </div>
                                ` : ''}
                                
                                ${companyData.companyPhone ? `
                                    <div class="contact-item">
                                        📞 ${companyData.companyPhone}
                                    </div>
                                ` : ''}
                                
                                ${companyData.whatsappNumber ? `
                                    <div class="contact-item">
                                        💬 ${companyData.whatsappNumber}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="sticker-footer">
                        Generated by DealerOS • ${new Date().toLocaleDateString('en-KE')}
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        // Auto-print
                        window.print();
                        
                        // Close after printing
                        window.onafterprint = function() {
                            setTimeout(() => {
                                window.close();
                            }, 1000);
                        };
                    };
                </script>
            </body>
            </html>
        `;
        
        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(stickerHTML);
        printWindow.document.close();
        
    } catch (error) {
        console.error('Error printing sticker:', error);
        alert('Error printing sticker: ' + error.message);
    }
};
    
    // Export inventory
    window.exportInventory = function() {
        if (filteredInventory.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Convert to CSV
        let csv = 'Vehicle Name,Type,Status,Price,Registration,Make,Model,Year,Added Date\n';
        
        filteredInventory.forEach((car) => {
            const row = [
                car.vehicleName || '',
                car.type === 'imported' ? 'Imported' : 'Yard',
                car.type === 'imported' ? (car.importStatus || '') : (car.status || ''),
                car.price || '',
                car.registration || '',
                car.make || '',
                car.model || '',
                car.year || '',
                new Date(car.createdAt).toLocaleDateString()
            ].map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',');
            
            csv += row + '\n';
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    // Show company modal
    window.showCompanyModal = async function() {
        if (!currentCompanyId) {
            alert('Company information not loaded');
            return;
        }
        
        try {
            const companyDoc = await db.collection('companies').doc(currentCompanyId).get();
            if (!companyDoc.exists) {
                alert('Company not found');
                return;
            }
            
            const companyData = companyDoc.data();
            
            let companyHTML = `
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    ${companyData.logoUrl ? `<img src="${companyData.logoUrl}" alt="${companyData.companyName}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem;">` : ''}
                    <h3>${companyData.companyName}</h3>
                </div>
                
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <strong>Yard Location:</strong>
                        <p>${companyData.yardLocation || 'Not specified'}</p>
                    </div>
                    
                    <div>
                        <strong>Phone Number:</strong>
                        <p>${companyData.companyPhone || 'Not specified'}</p>
                    </div>
                    
                    <div>
                        <strong>WhatsApp Number:</strong>
                        <p>${companyData.whatsappNumber || 'Not specified'}</p>
                    </div>
                    
                    ${companyData.companyDescription ? `
                        <div>
                            <strong>Description:</strong>
                            <p>${companyData.companyDescription}</p>
                        </div>
                    ` : ''}
                    
                    <div>
                        <strong>Created:</strong>
                        <p>${new Date(companyData.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
            
            document.getElementById('companyInfoContent').innerHTML = companyHTML;
            document.getElementById('companyModal').classList.add('show');
            
        } catch (error) {
            console.error('Error loading company info:', error);
            alert('Error loading company information');
        }
    };
    
    // Edit company profile
    window.editCompanyProfile = function() {
        window.location.href = 'company-setup.html';
    };
    
    // Close modal
    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.remove('show');
    };
    
    // Download QR
   // Also update the downloadQR function to ensure it works:
window.downloadQR = function(filename = 'car-qr-code.png') {
    if (window.qrGenerator && window.qrGenerator.qrCanvas) {
        window.qrGenerator.downloadQR(filename);
    } else {
        alert('Please generate a QR code first');
    }
};
    
    // Print QR
   // Update the printQR function:
window.printQR = function(options = {}) {
    if (window.qrGenerator) {
        window.qrGenerator.printQR({
            paperSize: 'A4',
            ...options
        });
    } else {
        alert('QR Generator not available');
    }
};
    
    // Logout function
    function logout() {
        auth.signOut().then(() => {
            window.location.href = 'auth.html';
        });
    }
    
    // Handle photo preview
    document.getElementById('carPhotos')?.addEventListener('change', function(e) {
        const previewDiv = document.getElementById('photoPreview');
        previewDiv.innerHTML = '';
        
        const files = e.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                previewDiv.appendChild(img);
            };
            
            reader.readAsDataURL(file);
        }
    });
});
