# DealerOS - Car Inventory & Import Tracking System

A complete dealer-focused car inventory and import tracking MVP for Kenyan car yard businesses.

## Features

- **Company Profile Management** - Set up dealership information
- **Inventory Management** - Track imported and yard cars
- **QR Code Generation** - Instant car sharing via QR codes
- **WhatsApp Integration** - Direct customer contact
- **Dashboard Analytics** - Real-time inventory insights
- **Mobile-First Design** - Works on all devices

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., "DealerOS-Kenya")
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider
4. Enable Firestore:
   - Go to Firestore Database → Create database
   - Start in production mode
   - Choose location (e.g., europe-west1)
5. Enable Storage:
   - Go to Storage → Get started
   - Choose location (same as Firestore)
   - Set security rules
6. Get Firebase Config:
   - Go to Project settings → General
   - Scroll to "Your apps"
   - Click on web app (</>)
   - Copy the configuration object

### 2. Application Setup

1. Download or clone the DealerOS files
2. Open `firebase-config.js`
3. Replace the placeholder config with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
    projectId: "YOUR_ACTUAL_PROJECT_ID",
    storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
    messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
    appId: "YOUR_ACTUAL_APP_ID"
};
