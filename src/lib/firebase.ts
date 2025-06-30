
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// These values are pulled from the .env file
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if the API key is missing or is still the placeholder value.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("REPLACE_WITH_YOUR")) {
    const errorMessage = "Firebase API Key is missing or not configured. Please add NEXT_PUBLIC_FIREBASE_API_KEY to your .env file with your actual credential. The app cannot start without it.";
    // This error will be thrown during initialization, making it very clear.
    throw new Error(errorMessage);
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
