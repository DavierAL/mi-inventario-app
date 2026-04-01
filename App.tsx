// ==========================================
// ARCHIVO: App.tsx (Orquestador Principal)
// ==========================================
import React from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// ==========================================
// EXPORT CON PROVIDER Y ENRUTADOR
// ==========================================
export default function App() {
    return (
        <ThemeProvider>
            <AppNavigator />
        </ThemeProvider>
    );
}