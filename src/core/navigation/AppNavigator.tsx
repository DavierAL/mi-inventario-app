// ARCHIVO: src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { InventarioListScreen } from '../../features/inventory/screens/InventarioListScreen';
import { ScannerScreen } from '../../features/scanner/screens/ScannerScreen';
import { AnalyticsScreen } from '../../features/analytics/screens/AnalyticsScreen';
import { HistorialScreen } from '../../features/historial/screens/HistorialScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName="InventarioList"
            >
                <Stack.Screen name="InventarioList" component={InventarioListScreen} />
                <Stack.Screen name="Scanner" component={ScannerScreen} />
                <Stack.Screen
                    name="Analytics"
                    component={AnalyticsScreen}
                />
                <Stack.Screen
                    name="Historial"
                    component={HistorialScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

