// ARCHIVO: src/core/database/firebase.ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAba0_atQVGVMFvLleLfIkWyVqMf-Zvins",
  authDomain: "mascotify-apps.firebaseapp.com",
  projectId: "mascotify-apps",
  storageBucket: "mascotify-apps.firebasestorage.app",
  messagingSenderId: "731974169294",
  appId: "1:731974169294:web:be18e3e2f7a4a37330d69f",
  measurementId: "G-701VW815TH"
};

export const app = initializeApp(firebaseConfig);

// En React Native, Firestore activa su caché nativo automáticamente.
// No se usa persistentLocalCache (eso es solo para browsers con IndexedDB).
export const dbFirebase = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Mejora la compatibilidad en redes móviles restrictivas
});
