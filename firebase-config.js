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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const FieldValue = firebase.firestore.FieldValue;
