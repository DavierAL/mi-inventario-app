// ARCHIVO: src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { InventarioListScreen } from '../../features/inventory';
import { ScannerScreen } from '../../features/scanner';
import { AnalyticsScreen } from '../../features/analytics';
import { HistorialScreen } from '../../features/historial';
import { PickingScreen, StorePanelScreen, LogisticsHistoryScreen } from '../../features/logistics';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { ControlMarcasScreen } from '../../features/brands/screens/ControlMarcasScreen';
import { MarcaConfigScreen } from '../../features/brands/screens/MarcaConfigScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../database/supabase';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../ui/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    const { isAuthenticated, user, isLoading, restoreSession } = useAuthStore();
    const { colors } = useTheme();

    useEffect(() => {
        // 1. Restaurar sesión inicial
        restoreSession();

        // 2. Escuchar cambios de estado (Token Refresh, SignOut, etc)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] Evento: ${event}`);
            if (event === 'SIGNED_IN' && session) {
                restoreSession();
            } else if (event === 'SIGNED_OUT') {
                const state = useAuthStore.getState();
                if (state.isAuthenticated) {
                    state.logout();
                }
            }
        });

        return () => subscription.unsubscribe();
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
                screenOptions={({ route }) => ({
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                } as NativeStackNavigationOptions)}
            >
                {!isAuthenticated || !user ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        {(user.rol === 'admin' || user.rol === 'almacen' || user.rol === 'tienda' || user.rol === 'atencion') && (
                            <Stack.Screen name="InventarioList" component={InventarioListScreen} />
                        )}

                        {(user.rol === 'admin' || user.rol === 'logistica' || user.rol === 'atencion' || user.rol === 'tienda') && (
                            <Stack.Screen name="PickingList" component={PickingScreen} />
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

                        {(user.rol === 'admin' || user.rol === 'logistica' || user.rol === 'atencion' || user.rol === 'tienda') && (
                            <>
                                <Stack.Screen name="StorePanel" component={StorePanelScreen} />
                                <Stack.Screen name="LogisticsHistory" component={LogisticsHistoryScreen} />
                            </>
                        )}

                        {(user.rol === 'admin' || user.rol === 'almacen' || user.rol === 'tienda') && (
                            <Stack.Screen name="ControlMarcas" component={ControlMarcasScreen} />
                        )}

                        {user.rol === 'admin' && (
                            <Stack.Screen name="MarcaConfig" component={MarcaConfigScreen} />
                        )}
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
