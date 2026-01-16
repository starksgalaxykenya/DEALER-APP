// Firebase configuration - Each dealer will replace with their own config
// Firebase SDK must be loaded in HTML before this file

// Check if Firebase is available
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Please include Firebase scripts in your HTML.');
} else {
    console.log('Firebase SDK loaded successfully');
}

// Firebase configuration - Each dealer will replace with their own config
const firebaseConfig = {
  apiKey: "AIzaSyDJ5pRskxuT4bo43J2dr73t3VPlFo5RFbA",
  authDomain: "performance-tracker-f8c9b.firebaseapp.com",
  projectId: "performance-tracker-f8c9b",
  storageBucket: "performance-tracker-f8c9b.firebasestorage.app",
  messagingSenderId: "385942941204",
  appId: "1:385942941204:web:a845950b98f0a58e6a8101"
};

// Initialize Firebase
let app, auth, db, storage, FieldValue;

try {
    // Check if Firebase app is already initialized
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase app initialized');
    } else {
        app = firebase.app(); // Use existing app
        console.log('Using existing Firebase app');
    }
    
    // Get Firebase services
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    FieldValue = firebase.firestore.FieldValue;
    
    console.log('Firebase services initialized successfully');
    
  // Enable multi-tab persistence
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log('Firestore persistence enabled with multi-tab support');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistence failed: ', err);
        } else if (err.code === 'unimplemented') {
            console.warn('Current browser doesn\'t support persistence');
        }
        console.log('Offline features disabled');
    });
    
} catch (error) {
    console.error('Firebase initialization error:', error);
    console.error('Full error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
    });
    
    // Provide user-friendly error message
    alert('Error initializing the application. Please check your internet connection and try again.');
}
