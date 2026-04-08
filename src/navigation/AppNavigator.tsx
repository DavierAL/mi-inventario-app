// ARCHIVO: src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { InventarioListScreen } from '../screens/InventarioListScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';

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
                    options={{ headerShown: true, title: 'Dashboard BI' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
