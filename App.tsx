// ARCHIVO: App.tsx
import React, { useEffect } from 'react';
import { ThemeProvider } from './src/core/ui/ThemeContext';
import { AppNavigator } from './src/core/navigation/AppNavigator';
import Toast from 'react-native-toast-message';

import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

// Evitar que la pantalla de carga desaparezca automáticamente
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [fontsLoaded] = useFonts({
        ...Ionicons.font,
    });

    useEffect(() => {
        if (fontsLoaded) {
            // Ocultar la pantalla de carga solo cuando los iconos estén listos
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null; 
    }

    return (
        <ThemeProvider>
            <AppNavigator />
            <Toast />
        </ThemeProvider>
    );
}