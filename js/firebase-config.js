import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAW0NmmlGFhiH-ZxPN3N_czG_hBKnWbBYo",
    authDomain: "xgssp-e55cf.firebaseapp.com",
    projectId: "xgssp-e55cf",
    storageBucket: "xgssp-e55cf.firebasestorage.app",
    messagingSenderId: "25237850490",
    appId: "1:25237850490:web:da354166013fd36093eec3",
    measurementId: "G-9F7DLDGXNK"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
