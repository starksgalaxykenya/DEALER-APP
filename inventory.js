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
    
    // Generate car QR
    window.generateCarQR = async function(carId) {
        try {
            const carDoc = await db.collection('cars').doc(carId).get();
            if (!carDoc.exists) {
                alert('Car not found');
                return;
            }
            
            const car = carDoc.data();
            const publicUrl = `${window.location.origin}/car-details.html?car=${carId}`;
            
            // Generate QR code
            const qrContainer = document.getElementById('qrContainer');
            qrContainer.innerHTML = '';
            
            QRCode.toCanvas(qrContainer, publicUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }, function(error) {
                if (error) {
                    console.error('QR generation error:', error);
                    alert('Error generating QR code');
                } else {
                    // Add car info
                    const infoDiv = document.createElement('div');
                    infoDiv.style.marginTop = '1rem';
                    infoDiv.style.textAlign = 'center';
                    infoDiv.innerHTML = `
                        <h4>${car.vehicleName}</h4>
                        <p>${car.registration || 'No registration'}</p>
                        <p><strong>${car.price ? `KES ${parseFloat(car.price).toLocaleString()}` : 'Price not set'}</strong></p>
                    `;
                    qrContainer.appendChild(infoDiv);
                    
                    // Show modal
                    document.getElementById('qrModal').classList.add('show');
                }
            });
            
        } catch (error) {
            console.error('Error generating QR:', error);
            alert('Error: ' + error.message);
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
    window.downloadQR = function() {
        const canvas = document.querySelector('#qrContainer canvas');
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'car-qr-code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    
    // Print QR
    window.printQR = function() {
        const printWindow = window.open('', '_blank');
        const qrContent = document.querySelector('#qrContainer').innerHTML;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print QR Code</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                        canvas { margin: 20px auto; display: block; }
                        h4 { margin: 10px 0; }
                        p { margin: 5px 0; }
                    </style>
                </head>
                <body>
                    ${qrContent}
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
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
