// services/firebase.ts
// Zorg ervoor dat alle andere Firebase imports en initialisatie hier ook staan.

import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { getAuth, EmailAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Jouw Firebase Config (deze komt van de Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAQf8SV7qf8FQkh7ayvRlBPR1-fRJ6d3Ks",
  authDomain: "schoolmaps-6a5f3.firebaseapp.com",
  projectId: "schoolmaps-6a5f3",
  storageBucket: "schoolmaps-6a5f3.appspot.com", // Gebruik .appspot.com tenzij anders in console
  messagingSenderId: "336929063264",
  appId: "1:336929063264:web:b633f4f66fd1b204899e05",
  measurementId: "G-8KKCCFBFSL" // Optioneel
};

const app = initializeApp(firebaseConfig);

export const functions = getFunctions(app);

// Definieer de aanroepbare functies die je hebt gedeployd in Firebase Functions
// Alle functies zijn nu httpsCallable
export const getGoogleAuthUrlCallable = httpsCallable(functions, 'getGoogleAuthUrl');
export const saveGoogleDriveTokensCallable = httpsCallable(functions, 'saveGoogleDriveTokens');
export const uploadFileToGoogleDriveCallable = httpsCallable(functions, 'uploadFileToGoogleDrive');

// Bestaande exports
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const appId = firebaseConfig.projectId;
export { EmailAuthProvider };
