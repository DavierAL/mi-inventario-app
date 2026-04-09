// ARCHIVO: src/core/ui/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors } from './colores';

type ThemeType = 'light' | 'dark';

interface ThemeContextData {
    theme: ThemeType;
    colors: typeof ThemeColors.light;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setTheme] = useState<ThemeType>('light');

    useEffect(() => {
        // Cargar preferencia guardada
        AsyncStorage.getItem('@theme_preference').then(savedTheme => {
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setTheme(savedTheme);
            } else if (systemColorScheme) {
                setTheme(systemColorScheme);
            }
        });
    }, []);

    // Actualizar cuando cambia el sistema, si no hay preferencia manual
    useEffect(() => {
        if (systemColorScheme) {
            AsyncStorage.getItem('@theme_preference').then(savedTheme => {
                if (!savedTheme) {
                    setTheme(systemColorScheme);
                }
            });
        }
    }, [systemColorScheme]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        AsyncStorage.setItem('@theme_preference', newTheme);
    };

    const isDark = theme === 'dark';
    const colors = ThemeColors[theme];

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};
