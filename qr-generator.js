// QR Generator Module for DealerOS
class QRGenerator {
    constructor() {
        this.currentCarData = null;
        this.qrCanvas = null;
        this.isPrintMode = false;
    }

    // Initialize QR Generator
    init() {
        console.log('QR Generator initialized');
    }

    // Generate QR code for a car
    async generateCarQR(carId, options = {}) {
        try {
            // Load car data if not provided
            if (!this.currentCarData || this.currentCarData.id !== carId) {
                const carDoc = await db.collection('cars').doc(carId).get();
                if (!carDoc.exists) {
                    throw new Error('Car not found');
                }
                this.currentCarData = {
                    id: carId,
                    ...carDoc.data()
                };
            }

            // Load company data
            let companyData = null;
            if (this.currentCarData.companyId) {
                const companyDoc = await db.collection('companies').doc(this.currentCarData.companyId).get();
                if (companyDoc.exists) {
                    companyData = companyDoc.data();
                }
            }

            // Generate public URL
            const publicUrl = `${window.location.origin}/car-details.html?car=${carId}`;
            
            // Create QR code data with enhanced information
            const qrData = this.createQRData(publicUrl, companyData);
            
            // Generate QR code with options
            return await this.generateQRCode(qrData, options);
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        }
    }

    // Create enhanced QR data structure
    createQRData(publicUrl, companyData) {
        const car = this.currentCarData;
        const timestamp = new Date().toISOString();
        
        // Create structured data for QR
        const qrData = {
            url: publicUrl,
            vehicle: {
                id: car.id,
                name: car.vehicleName || 'Unnamed Vehicle',
                type: car.type || 'yard',
                registration: car.registration || '',
                price: car.price || 0,
                year: car.year || '',
                make: car.make || '',
                model: car.model || '',
                vin: car.vin || ''
            },
            company: companyData ? {
                name: companyData.companyName || '',
                phone: companyData.companyPhone || '',
                whatsapp: companyData.whatsappNumber || '',
                location: companyData.yardLocation || ''
            } : null,
            timestamp: timestamp,
            system: 'DealerOS',
            version: '1.0'
        };

        // Convert to string format
        return JSON.stringify(qrData);
    }

    // Generate QR code with styling options
    async generateQRCode(data, options = {}) {
        const {
            size = 200,
            margin = 2,
            colorDark = '#000000',
            colorLight = '#FFFFFF',
            logo = null,
            logoSize = 40,
            rounded = false,
            gradient = false
        } = options;

        return new Promise((resolve, reject) => {
            try {
                // Create container for QR code
                const container = document.createElement('div');
                container.style.position = 'relative';
                container.style.display = 'inline-block';

                // Create canvas for QR code
                const canvas = document.createElement('canvas');
                this.qrCanvas = canvas;
                
                QRCode.toCanvas(canvas, data, {
                    width: size,
                    margin: margin,
                    color: {
                        dark: colorDark,
                        light: colorLight
                    },
                    errorCorrectionLevel: 'H' // High error correction for logos
                }, (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    // Apply rounded corners if requested
                    if (rounded) {
                        this.applyRoundedCorners(canvas);
                    }

                    // Apply gradient if requested
                    if (gradient) {
                        this.applyGradient(canvas, colorDark);
                    }

                    // Add logo if provided
                    if (logo) {
                        this.addLogo(canvas, logo, logoSize);
                    }

                    // Add to container
                    container.appendChild(canvas);

                    // Add car information below QR code
                    const infoDiv = this.createInfoDiv();
                    container.appendChild(infoDiv);

                    resolve({
                        container: container,
                        canvas: canvas,
                        data: data,
                        size: size
                    });
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    // Create information div below QR code
    createInfoDiv() {
        const car = this.currentCarData;
        const infoDiv = document.createElement('div');
        infoDiv.style.marginTop = '1rem';
        infoDiv.style.textAlign = 'center';
        infoDiv.style.fontFamily = 'Arial, sans-serif';

        // Vehicle name
        const nameElement = document.createElement('h4');
        nameElement.textContent = car.vehicleName || 'Vehicle';
        nameElement.style.margin = '0 0 0.5rem 0';
        nameElement.style.color = '#333';
        nameElement.style.fontSize = '1.1rem';

        // Registration (if available)
        let registrationElement = null;
        if (car.registration) {
            registrationElement = document.createElement('p');
            registrationElement.textContent = car.registration;
            registrationElement.style.margin = '0 0 0.25rem 0';
            registrationElement.style.color = '#666';
            registrationElement.style.fontSize = '0.9rem';
        }

        // Price (if available)
        let priceElement = null;
        if (car.price) {
            priceElement = document.createElement('p');
            priceElement.innerHTML = `<strong>KES ${this.formatPrice(car.price)}</strong>`;
            priceElement.style.margin = '0.25rem 0';
            priceElement.style.color = '#27ae60';
            priceElement.style.fontSize = '1rem';
        }

        // Type badge
        const typeBadge = document.createElement('span');
        typeBadge.textContent = car.type === 'imported' ? '🚢 Imported' : '🏢 In Yard';
        typeBadge.style.display = 'inline-block';
        typeBadge.style.padding = '0.25rem 0.75rem';
        typeBadge.style.margin = '0.5rem 0';
        typeBadge.style.backgroundColor = car.type === 'imported' ? '#e3f2fd' : '#e8f5e9';
        typeBadge.style.color = car.type === 'imported' ? '#1976d2' : '#388e3c';
        typeBadge.style.borderRadius = '12px';
        typeBadge.style.fontSize = '0.8rem';
        typeBadge.style.fontWeight = '500';

        // Assemble info div
        infoDiv.appendChild(nameElement);
        if (registrationElement) infoDiv.appendChild(registrationElement);
        if (priceElement) infoDiv.appendChild(priceElement);
        infoDiv.appendChild(typeBadge);

        // Add timestamp
        const timestamp = document.createElement('p');
        timestamp.textContent = `Generated: ${new Date().toLocaleDateString()}`;
        timestamp.style.margin = '0.5rem 0 0 0';
        timestamp.style.color = '#999';
        timestamp.style.fontSize = '0.75rem';
        infoDiv.appendChild(timestamp);

        return infoDiv;
    }

    // Apply rounded corners to QR code
    applyRoundedCorners(canvas) {
        const ctx = canvas.getContext('2d');
        const radius = 20;

        // Create rounded rectangle path
        ctx.beginPath();
        this.drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, radius);
        ctx.clip();
        
        // Redraw the QR code
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
    }

    // Draw rounded rectangle
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Apply gradient to QR code
    applyGradient(canvas, baseColor) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Create gradient effect
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
                // This is a black pixel (QR code)
                const x = (i / 4) % canvas.width;
                const y = Math.floor((i / 4) / canvas.width);
                
                // Calculate gradient based on position
                const intensity = (x + y) / (canvas.width + canvas.height);
                
                // Apply gradient color
                if (baseColor === '#000000') {
                    // Default black gradient
                    data[i] = 0;     // R
                    data[i + 1] = Math.floor(100 * intensity); // G
                    data[i + 2] = Math.floor(150 * intensity); // B
                } else {
                    // Custom color gradient
                    const rgb = this.hexToRgb(baseColor);
                    data[i] = Math.floor(rgb.r * (0.8 + 0.2 * intensity));
                    data[i + 1] = Math.floor(rgb.g * (0.8 + 0.2 * intensity));
                    data[i + 2] = Math.floor(rgb.b * (0.8 + 0.2 * intensity));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Add logo to QR code center
    addLogo(canvas, logoUrl, logoSize) {
        return new Promise((resolve, reject) => {
            const ctx = canvas.getContext('2d');
            const logo = new Image();
            
            logo.onload = () => {
                // Calculate position (center of QR code)
                const x = (canvas.width - logoSize) / 2;
                const y = (canvas.height - logoSize) / 2;
                
                // Draw white background for logo
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(x - 2, y - 2, logoSize + 4, logoSize + 4);
                
                // Draw logo
                ctx.drawImage(logo, x, y, logoSize, logoSize);
                
                // Draw border around logo
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 2, y - 2, logoSize + 4, logoSize + 4);
                
                resolve();
            };
            
            logo.onerror = () => {
                console.warn('Failed to load logo, proceeding without it');
                resolve();
            };
            
            logo.src = logoUrl;
        });
    }

    // Format price with commas
    formatPrice(price) {
        return parseFloat(price).toLocaleString('en-KE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    // Convert hex color to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // Download QR code as PNG
    downloadQR(filename = 'car-qr-code.png') {
        if (!this.qrCanvas) {
            throw new Error('No QR code generated yet');
        }

        const link = document.createElement('a');
        link.download = filename;
        link.href = this.qrCanvas.toDataURL('image/png');
        link.click();
    }

    // Print QR code with styling
    printQR(options = {}) {
        if (!this.qrCanvas) {
            throw new Error('No QR code generated yet');
        }

        this.isPrintMode = true;
        
        const printWindow = window.open('', '_blank');
        const car = this.currentCarData;
        
        // Get QR code data URL
        const qrDataUrl = this.qrCanvas.toDataURL('image/png');
        
        // Create print-friendly HTML
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${car.vehicleName || 'Vehicle'}</title>
                <style>
                    @media print {
                        @page {
                            margin: 0.5in;
                            size: ${options.paperSize || 'A4'};
                        }
                        body {
                            margin: 0;
                            font-family: Arial, sans-serif;
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                    }
                    
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 20px;
                    }
                    
                    .qr-container {
                        text-align: center;
                        max-width: 400px;
                    }
                    
                    .qr-code {
                        margin: 20px auto;
                        border: 2px solid #333;
                        padding: 10px;
                        background: white;
                    }
                    
                    .vehicle-info {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        background: #f9f9f9;
                    }
                    
                    .company-info {
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 2px dashed #ccc;
                        font-size: 0.9em;
                        color: #666;
                    }
                    
                    .print-date {
                        margin-top: 20px;
                        font-size: 0.8em;
                        color: #999;
                    }
                    
                    h1 {
                        color: #2c3e50;
                        margin-bottom: 10px;
                        font-size: 1.5em;
                    }
                    
                    .price {
                        color: #27ae60;
                        font-size: 1.2em;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    
                    .badge {
                        display: inline-block;
                        padding: 5px 15px;
                        margin: 10px 0;
                        border-radius: 20px;
                        font-weight: bold;
                    }
                    
                    .badge-imported {
                        background: #e3f2fd;
                        color: #1976d2;
                    }
                    
                    .badge-yard {
                        background: #e8f5e9;
                        color: #388e3c;
                    }
                    
                    .instructions {
                        margin-top: 20px;
                        padding: 10px;
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 4px;
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <h1>${car.vehicleName || 'Vehicle QR Code'}</h1>
                    
                    ${car.registration ? `<p><strong>Registration:</strong> ${car.registration}</p>` : ''}
                    
                    ${car.price ? `<div class="price">KES ${this.formatPrice(car.price)}</div>` : ''}
                    
                    <div class="badge badge-${car.type === 'imported' ? 'imported' : 'yard'}">
                        ${car.type === 'imported' ? '🚢 Imported Vehicle' : '🏢 Available in Yard'}
                    </div>
                    
                    <div class="qr-code">
                        <img src="${qrDataUrl}" alt="QR Code" style="width: 250px; height: 250px;">
                    </div>
                    
                    <div class="vehicle-info">
                        <p><strong>Scan this QR code to view full vehicle details</strong></p>
                        <p>Customers can scan with their phone camera to see:</p>
                        <ul style="text-align: left; margin: 10px 0;">
                            <li>Complete vehicle specifications</li>
                            <li>High-quality photos</li>
                            <li>All features and options</li>
                            <li>Contact information</li>
                            <li>Price and availability</li>
                        </ul>
                    </div>
                    
                    <div class="instructions">
                        <p><strong>📱 How to use:</strong></p>
                        <p>1. Print this QR code</p>
                        <p>2. Attach to vehicle windshield</p>
                        <p>3. Customers scan with phone camera</p>
                        <p>4. Instant access to vehicle details</p>
                    </div>
                    
                    <div class="print-date">
                        Printed on: ${new Date().toLocaleString('en-KE')}
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
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
        
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        this.isPrintMode = false;
    }

    // Generate WhatsApp sharing URL
    generateWhatsAppShareURL(carId, phoneNumber) {
        const car = this.currentCarData;
        const publicUrl = `${window.location.origin}/car-details.html?car=${carId}`;
        
        const message = `Hello! I'm interested in the ${car.vehicleName || 'vehicle'}` +
                       `${car.price ? ` listed at KES ${this.formatPrice(car.price)}` : ''}.` +
                       `\n\nView details: ${publicUrl}`;
        
        const encodedMessage = encodeURIComponent(message);
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }

    // Generate SMS sharing URL
    generateSMSShareURL(carId, phoneNumber) {
        const car = this.currentCarData;
        const publicUrl = `${window.location.origin}/car-details.html?car=${carId}`;
        
        const message = `Check out this ${car.vehicleName || 'vehicle'}` +
                       `${car.price ? ` for KES ${this.formatPrice(car.price)}` : ''}: ${publicUrl}`;
        
        const encodedMessage = encodeURIComponent(message);
        
        return `sms:${phoneNumber}?body=${encodedMessage}`;
    }

    // Generate bulk QR codes for multiple cars
    async generateBulkQRCodes(carIds, options = {}) {
        const results = [];
        
        for (const carId of carIds) {
            try {
                const qrResult = await this.generateCarQR(carId, options);
                results.push({
                    carId: carId,
                    success: true,
                    data: qrResult
                });
            } catch (error) {
                results.push({
                    carId: carId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    // Generate QR code sticker sheet (multiple per page)
    generateStickerSheet(qrContainers, options = {}) {
        const {
            perRow = 2,
            perColumn = 4,
            spacing = 20,
            pageWidth = 8.5, // inches
            pageHeight = 11
        } = options;

        const printWindow = window.open('', '_blank');
        
        let stickerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code Sticker Sheet</title>
                <style>
                    @media print {
                        @page {
                            margin: 0.5in;
                            size: ${pageWidth}in ${pageHeight}in;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    
                    .sticker-grid {
                        display: grid;
                        grid-template-columns: repeat(${perRow}, 1fr);
                        grid-gap: ${spacing}px;
                        margin-bottom: ${spacing}px;
                    }
                    
                    .sticker {
                        border: 1px dashed #ccc;
                        padding: 10px;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    
                    .sticker-title {
                        font-size: 12px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .sticker-qr {
                        margin: 5px auto;
                    }
                    
                    .sticker-info {
                        font-size: 10px;
                        margin-top: 5px;
                    }
                    
                    .page-break {
                        page-break-after: always;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #333;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>QR Code Sticker Sheet</h2>
                    <p>Generated: ${new Date().toLocaleDateString()} | DealerOS</p>
                </div>
        `;

        for (let i = 0; i < qrContainers.length; i++) {
            if (i % (perRow * perColumn) === 0 && i > 0) {
                stickerHTML += `<div class="page-break"></div>`;
            }
            
            if (i % perRow === 0) {
                stickerHTML += `<div class="sticker-grid">`;
            }
            
            const container = qrContainers[i];
            stickerHTML += `
                <div class="sticker">
                    <div class="sticker-title">${container.carName || 'Vehicle'}</div>
                    <div class="sticker-qr">${container.innerHTML}</div>
                    <div class="sticker-info">Scan for details</div>
                </div>
            `;
            
            if ((i + 1) % perRow === 0 || i === qrContainers.length - 1) {
                stickerHTML += `</div>`;
            }
        }

        stickerHTML += `
                <script>
                    window.onload = function() {
                        window.print();
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

        printWindow.document.write(stickerHTML);
        printWindow.document.close();
    }

    // Clear current QR code data
    clear() {
        this.currentCarData = null;
        this.qrCanvas = null;
    }

    // Get current car data
    getCarData() {
        return this.currentCarData;
    }

    // Validate if QR code is scannable
    async validateQR(carId) {
        try {
            const qrResult = await this.generateCarQR(carId);
            const canvas = qrResult.canvas;
            
            // Basic validation - check if canvas has data
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let blackPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] < 128 && data[i + 1] < 128 && data[i + 2] < 128) {
                    blackPixels++;
                }
            }
            
            // QR code should have significant black pixels
            const isValid = blackPixels > (canvas.width * canvas.height * 0.1);
            
            return {
                isValid: isValid,
                blackPixels: blackPixels,
                totalPixels: canvas.width * canvas.height,
                percentage: (blackPixels / (canvas.width * canvas.height) * 100).toFixed(2)
            };
            
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }
}

// Create global instance
const qrGenerator = new QRGenerator();

// Export functions for global use
window.generateQR = async function(carId, options = {}) {
    return await qrGenerator.generateCarQR(carId, options);
};

window.downloadQR = function(filename = 'car-qr-code.png') {
    qrGenerator.downloadQR(filename);
};

window.printQR = function(options = {}) {
    qrGenerator.printQR(options);
};

window.shareViaWhatsApp = function(carId, phoneNumber) {
    const url = qrGenerator.generateWhatsAppShareURL(carId, phoneNumber);
    window.open(url, '_blank');
};

window.shareViaSMS = function(carId, phoneNumber) {
    const url = qrGenerator.generateSMSShareURL(carId, phoneNumber);
    window.location.href = url;
};

window.generateBulkQRCodes = async function(carIds, options = {}) {
    return await qrGenerator.generateBulkQRCodes(carIds, options);
};

window.generateStickerSheet = function(qrContainers, options = {}) {
    qrGenerator.generateStickerSheet(qrContainers, options);
};

window.validateQR = async function(carId) {
    return await qrGenerator.validateQR(carId);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    qrGenerator.init();
    console.log('QR Generator ready');
});

// Export the class for module use (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QRGenerator, qrGenerator };
}
