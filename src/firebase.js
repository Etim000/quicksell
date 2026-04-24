import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCpAj6m49cBTKKfllcaXVbfbkHLUlPTfEg",
  authDomain: "quicksell-fd0a4.firebaseapp.com",
  projectId: "quicksell-fd0a4",
  storageBucket: "quicksell-fd0a4.firebasestorage.app",
  messagingSenderId: "944504578463",
  appId: "1:944504578463:web:a7a312e2da8f19146d9daa"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
