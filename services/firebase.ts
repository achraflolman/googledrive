import { initializeApp, getApps } from "@firebase/app";
import { getAuth, EmailAuthProvider, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, deleteUser, sendEmailVerification } from "@firebase/auth";
import { getFirestore, Timestamp, arrayUnion, increment, writeBatch, collection, doc, query, where, orderBy, onSnapshot, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, limit } from "@firebase/firestore";
import { getStorage, ref, deleteObject, getDownloadURL, uploadBytes } from "@firebase/storage";
import { getFunctions, httpsCallable } from "@firebase/functions";


const firebaseConfig = {
  apiKey: "AIzaSyAQf8SV7qf8FQkh7ayvRlBPR1-fRJ6d3Ks",
  authDomain: "schoolmaps-6a5f3.firebaseapp.com",
  projectId: "schoolmaps-6a5f3",
  storageBucket: "schoolmaps-6a5f3.appspot.com",
  messagingSenderId: "336929063264",
  appId: "1:336929063264:web:b633f4f66fd1b204899e05",
  measurementId: "G-8KKCCFBFSL"
};

export const appId = firebaseConfig.appId;

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];


// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const functions = getFunctions(app);

// Export Firebase features
export {
  // auth
  EmailAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  deleteUser,
  sendEmailVerification,
  // firestore
  Timestamp,
  arrayUnion,
  increment,
  writeBatch,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  // storage
  ref,
  deleteObject,
  getDownloadURL,
  uploadBytes
};

// Functions
export const getGoogleAuthUrl = httpsCallable(functions, 'getGoogleAuthUrl');
export const storeGoogleTokens = httpsCallable(functions, 'storeGoogleTokens');
export const disconnectGoogleDrive = httpsCallable(functions, 'disconnectGoogleDrive');
export const uploadFileToDrive = httpsCallable(functions, 'uploadFileToDrive');
export const deleteFileFromDrive = httpsCallable(functions, 'deleteFileFromDrive');