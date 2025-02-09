import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAKBshsoFvljT4mLxVfHaTu8NSElyw8eLw",
  authDomain: "expense-7a341.firebaseapp.com",
  projectId: "expense-7a341",
  storageBucket: "expense-7a341.appspot.com",
  messagingSenderId: "5983269545",
  appId: "1:5983269545:web:25250d0ef2013bcbb2afb8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);