// ARCHIVO: src/core/database/firebase.ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);

// En React Native, Firestore activa su caché nativo automáticamente.
// No se usa persistentLocalCache (eso es solo para browsers con IndexedDB).
export const dbFirebase = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Mejora la compatibilidad en redes móviles restrictivas
});
