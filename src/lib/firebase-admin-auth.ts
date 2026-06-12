import { initializeApp, getApps, getApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const adminApp =
  getApps().find((app) => app.name === "admin-auth-app") ||
  initializeApp(firebaseConfig, "admin-auth-app");

export const adminAuth = getAuth(adminApp);

setPersistence(adminAuth, browserSessionPersistence).catch((error) => {
  console.error("Erro ao configurar persistência do admin:", error);
});