import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCXpXTd2Glo3sp5fxhXRpo8F0QIiKdGiOI",
  authDomain: "keychain-website.firebaseapp.com",
  projectId: "keychain-website",
  storageBucket: "keychain-website.firebasestorage.app",
  messagingSenderId: "464987563000",
  appId: "1:464987563000:web:3c67ec4839ac72d886ec0d",
  measurementId: "G-L8XYDK219G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
