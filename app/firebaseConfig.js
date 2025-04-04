import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyDgNURKHxKJZl3rhH-jG0vsH840yZ_Rtmw",
    authDomain: "fitness-warrior-e581a.firebaseapp.com",
    projectId: "fitness-warrior-e581a",
    storageBucket: "fitness-warrior-e581a.firebasestorage.app",
    messagingSenderId: "879752357995",
    appId: "1:879752357995:web:ce158976f74ac14ec7e92e",
    measurementId: "G-N5MG87TDDW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);