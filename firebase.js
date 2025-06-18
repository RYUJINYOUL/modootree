import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCScPIXaFDAE1yIg_cxEQq0rjXKipCnOIw",
  authDomain: "test-efe1e.firebaseapp.com",
  projectId: "test-efe1e",
  storageBucket: "test-efe1e.firebasestorage.app",
  messagingSenderId: "845155971321",
  appId: "1:845155971321:web:6f207979920222db8c7228"
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
export const db = getFirestore(app);
// export const auth = getAuth(app);

export default app
// export const googleAuthProvider = new firebase.auth.GoogleAuthProvider()