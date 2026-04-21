import React, { useCallback } from 'react';
import { View } from 'react-native';
import { ErrorBoundary } from './src/core/ui/ErrorBoundary';
import { ThemeProvider } from './src/core/ui/ThemeContext';
import { AppNavigator } from './src/core/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

// Prevenimos que el splash se oculte automáticamente
import { initializeQueueProcessor } from './src/core/services/queue';

SplashScreen.preventAutoHideAsync();
initializeQueueProcessor();

export default function App() {
    const [fontsLoaded] = useFonts({ ...Ionicons.font });

    // Tarea 4.3: Sincronizar el cierre del SplashScreen con el pintado real
    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            // Este callback se ejecuta cuando la vista se ha "pintado"
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) return null; 

    return (
        <ErrorBoundary>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <ThemeProvider>
                    <AppNavigator />
                    <Toast />
                </ThemeProvider>
            </View>
        </ErrorBoundary>
    );
}