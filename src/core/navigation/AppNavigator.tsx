// ARCHIVO: src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { InventarioListScreen } from '../../features/inventory';
import { ScannerScreen } from '../../features/scanner';
import { AnalyticsScreen } from '../../features/analytics';
import { HistorialScreen } from '../../features/historial';
import { PickingScreen, StorePanelScreen } from '../../features/logistics';
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
                <Stack.Screen name="Analytics" component={AnalyticsScreen} />
                <Stack.Screen
                    name="Historial"
                    component={HistorialScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen name="PickingList" component={PickingScreen} />
                <Stack.Screen name="StorePanel" component={StorePanelScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
