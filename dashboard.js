// Dashboard Logic
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    const addCarBtn = document.getElementById('addCarBtn');
    const profileBtn = document.getElementById('profileBtn');
    const recentCarsTable = document.getElementById('recentCars');
    
    let currentCompanyId = null;
    
    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'auth.html';
        } else {
            loadCompanyProfile(user.uid);
            loadDashboardData();
        }
    });
    
    // Event Listeners
    logoutBtn.addEventListener('click', logout);
    addCarBtn.addEventListener('click', showAddCarModal);
    profileBtn.addEventListener('click', showProfileModal);
    
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
                // Update logo in header if needed
                const logoData = companyDoc.data();
                if (logoData.logoUrl) {
                    const logo = document.querySelector('.logo');
                    logo.innerHTML = `<img src="${logoData.logoUrl}" alt="${logoData.companyName}" style="height: 30px;">`;
                }
            }
        } catch (error) {
            console.error('Error loading company:', error);
        }
    }
    
    // Load dashboard data
    async function loadDashboardData() {
        if (!currentCompanyId) return;
        
        try {
            const carsQuery = await db.collection('cars')
                .where('companyId', '==', currentCompanyId)
                .get();
            
            let totalCars = 0;
            let carsInTransit = 0;
            let carsInYard = 0;
            let totalValue = 0;
            const recentCars = [];
            
            carsQuery.forEach((doc) => {
                const car = doc.data();
                totalCars++;
                
                if (car.type === 'imported') {
                    carsInTransit++;
                } else if (car.type === 'yard') {
                    carsInYard++;
                }
                
                if (car.price) {
                    totalValue += parseFloat(car.price);
                }
                
                recentCars.push({
                    id: doc.id,
                    ...car
                });
            });
            
            // Update dashboard cards
            document.getElementById('totalCars').textContent = totalCars;
            document.getElementById('carsInTransit').textContent = carsInTransit;
            document.getElementById('carsInYard').textContent = carsInYard;
            document.getElementById('totalValue').textContent = `KES ${totalValue.toLocaleString()}`;
            
            // Update recent cars table
            updateRecentCarsTable(recentCars.slice(0, 5));
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    function updateRecentCarsTable(cars) {
        recentCarsTable.innerHTML = '';
        
        cars.forEach((car) => {
            const row = document.createElement('tr');
            
            const statusBadge = car.type === 'imported' 
                ? `<span class="status-badge status-${car.importStatus || 'purchased'}">${car.importStatus || 'Purchased'}</span>`
                : `<span class="status-badge status-delivered">In Yard</span>`;
            
            row.innerHTML = `
                <td>${car.vehicleName || 'N/A'}</td>
                <td>${car.type === 'imported' ? 'Imported' : 'Yard'}</td>
                <td>${statusBadge}</td>
                <td>${car.price ? `KES ${parseFloat(car.price).toLocaleString()}` : 'N/A'}</td>
                <td>${new Date(car.createdAt).toLocaleDateString()}</td>
                <td>
                    <button onclick="viewCar('${car.id}')" class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">View</button>
                    <button onclick="generateQR('${car.id}')" class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">QR</button>
                </td>
            `;
            
            recentCarsTable.appendChild(row);
        });
    }
    
    // Logout function
    function logout() {
        auth.signOut().then(() => {
            window.location.href = 'auth.html';
        });
    }
    
    // Show add car modal
    function showAddCarModal() {
        document.getElementById('addCarModal').classList.add('show');
        initializeCarForm();
    }
    
    // Show profile modal
    function showProfileModal() {
        // Implement profile modal
        alert('Profile feature coming soon!');
    }
    
    // Close modal
    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.remove('show');
    };
    
    // Initialize car form
    function initializeCarForm() {
        const carTypeSelect = document.getElementById('carType');
        carTypeSelect.addEventListener('change', function() {
            const type = this.value;
            
            // Hide all type-specific fields
            document.getElementById('importedFields').style.display = 'none';
            document.getElementById('yardFields').style.display = 'none';
            
            if (type === 'imported') {
                showImportedFields();
            } else if (type === 'yard') {
                showYardFields();
            }
        });
    }
    
    function showImportedFields() {
        const importedFields = document.getElementById('importedFields');
        importedFields.innerHTML = `
            <div class="form-group">
                <label for="vin">VIN / Chassis Number *</label>
                <input type="text" id="vin" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label for="dealerName">Dealer Name</label>
                <input type="text" id="dealerName" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="originCountry">Origin Country</label>
                <input type="text" id="originCountry" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="shipName">Ship Name</label>
                <input type="text" id="shipName" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="eta">ETA</label>
                <input type="date" id="eta" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="importStatus">Import Status</label>
                <select id="importStatus" class="form-control">
                    <option value="purchased">Purchased</option>
                    <option value="shipped">Shipped</option>
                    <option value="arrived">Arrived at Port</option>
                    <option value="clearing">Clearing in Progress</option>
                    <option value="cleared">Cleared</option>
                    <option value="delivered">Delivered to Yard</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="storageCost">Storage Cost per Day (KES)</label>
                <input type="number" id="storageCost" class="form-control" step="0.01">
            </div>
            
            <div class="form-group">
                <label for="clearingFees">Clearing Fees (KES)</label>
                <input type="number" id="clearingFees" class="form-control" step="0.01">
            </div>
            
            <div class="form-group">
                <label for="demurrageCharges">Demurrage Charges (KES)</label>
                <input type="number" id="demurrageCharges" class="form-control" step="0.01">
            </div>
        `;
        importedFields.style.display = 'block';
    }
    
    function showYardFields() {
        const yardFields = document.getElementById('yardFields');
        yardFields.innerHTML = `
            <div class="form-group">
                <label for="make">Make</label>
                <input type="text" id="make" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="model">Model</label>
                <input type="text" id="model" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="year">Year</label>
                <input type="number" id="year" class="form-control" min="1900" max="2024">
            </div>
            
            <div class="form-group">
                <label for="engineSize">Engine Size (cc)</label>
                <input type="number" id="engineSize" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="fuelType">Fuel Type</label>
                <select id="fuelType" class="form-control">
                    <option value="">Select</option>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="electric">Electric</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="transmission">Transmission</label>
                <select id="transmission" class="form-control">
                    <option value="">Select</option>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                    <option value="semi-automatic">Semi-Automatic</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="mileage">Mileage (km)</label>
                <input type="number" id="mileage" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="driveType">Drive Type</label>
                <select id="driveType" class="form-control">
                    <option value="">Select</option>
                    <option value="2wd">2WD</option>
                    <option value="4wd">4WD</option>
                    <option value="awd">AWD</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="exteriorColor">Exterior Color</label>
                <input type="text" id="exteriorColor" class="form-control">
            </div>
            
            <div class="form-group">
                <label for="registration">Registration Number</label>
                <input type="text" id="registration" class="form-control" placeholder="e.g., KAA 123A">
            </div>
            
            <div class="form-group">
                <label for="averagePrice">Average Market Price (KES)</label>
                <input type="number" id="averagePrice" class="form-control" step="0.01">
            </div>
            
            <div class="form-group">
                <label for="sellingPrice">Selling Price (KES) *</label>
                <input type="number" id="sellingPrice" class="form-control" step="0.01" required>
            </div>
            
            <div class="form-group">
                <label for="negotiable">Negotiable</label>
                <select id="negotiable" class="form-control">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                </select>
            </div>
        `;
        yardFields.style.display = 'block';
    }
    
    // Save car function
    window.saveCar = async function() {
        const form = document.getElementById('addCarForm');
        if (!form.checkValidity()) {
            alert('Please fill in all required fields');
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
            createdBy: user.uid
        };
        
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
            // Note: Photo upload would be implemented separately
            
            alert('Car saved successfully!');
            closeModal('addCarModal');
            loadDashboardData(); // Refresh dashboard
            
        } catch (error) {
            console.error('Error saving car:', error);
            alert('Error saving car: ' + error.message);
        }
    };
    
    // View car function
    window.viewCar = function(carId) {
        window.location.href = `car-details.html?car=${carId}&view=admin`;
    };
    
    // Generate QR function
    window.generateQR = async function(carId) {
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
    
    // Download QR function
    window.downloadQR = function() {
        const canvas = document.querySelector('#qrContainer canvas');
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'car-qr-code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    
    // Print QR function
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
});
