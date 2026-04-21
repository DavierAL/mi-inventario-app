// ARCHIVO: src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { InventarioListScreen } from '../../features/inventory';
import { ScannerScreen } from '../../features/scanner';
import { AnalyticsScreen } from '../../features/analytics';
import { HistorialScreen } from '../../features/historial';
import { PickingScreen, StorePanelScreen } from '../../features/logistics';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../ui/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
    const { colors } = useTheme();

    useEffect(() => {
        restoreSession();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.fondo }}>
                <ActivityIndicator size="large" color={colors.primario} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
            >
                {!isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="InventarioList" component={InventarioListScreen} />
                        <Stack.Screen name="Scanner" component={ScannerScreen} />
                        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
                        <Stack.Screen
                            name="Historial"
                            component={HistorialScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen name="PickingList" component={PickingScreen} />
                        <Stack.Screen name="StorePanel" component={StorePanelScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
