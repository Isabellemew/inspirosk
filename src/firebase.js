import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⬇️ Вставь сюда данные из Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyAz6_8vZ4K81VeF3o3bH9715cofMK-eJ1g",
  authDomain: "inspiro-509d3.firebaseapp.com",
  projectId: "inspiro-509d3",
  storageBucket: "inspiro-509d3.firebasestorage.app",
  messagingSenderId: "467178077571",
  appId: "1:467178077571:web:af05890413e5778f64cab6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);