// ARCHIVO: src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { InventarioListScreen } from '../../features/inventory';
import { ScannerScreen } from '../../features/scanner';
import { AnalyticsScreen } from '../../features/analytics';
import { HistorialScreen } from '../../features/historial';
import { PickingScreen, StorePanelScreen, LogisticsHistoryScreen } from '../../features/logistics';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../ui/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    const { isAuthenticated, user, isLoading, restoreSession } = useAuthStore();
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
                {!isAuthenticated || !user ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        {(user.rol === 'admin' || user.rol === 'almacen' || user.rol === 'tienda' || user.rol === 'atencion') && (
                            <Stack.Screen name="InventarioList" component={InventarioListScreen} />
                        )}
                        
                        {(user.rol === 'admin' || user.rol === 'almacen' || user.rol === 'tienda' || user.rol === 'logistica') && (
                            <Stack.Screen name="Scanner" component={ScannerScreen} />
                        )}

                        {(user.rol === 'admin' || user.rol === 'atencion') && (
                            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
                        )}

                        {(user.rol === 'admin' || user.rol === 'almacen' || user.rol === 'tienda' || user.rol === 'logistica') && (
                            <Stack.Screen
                                name="Historial"
                                component={HistorialScreen}
                                options={{ headerShown: false }}
                            />
                        )}

                        {(user.rol === 'admin' || user.rol === 'logistica' || user.rol === 'atencion') && (
                            <>
                                <Stack.Screen name="PickingList" component={PickingScreen} />
                                <Stack.Screen name="StorePanel" component={StorePanelScreen} />
                                <Stack.Screen name="LogisticsHistory" component={LogisticsHistoryScreen} />
                            </>
                        )}
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
