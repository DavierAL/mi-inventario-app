// ARCHIVO: src/components/BottomBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Props {
    modoActivo: 'lista' | 'escaner' | 'ajustes';
    onTabPress: (tab: 'lista' | 'escaner' | 'ajustes') => void;
}

export const BottomBar: React.FC<Props> = ({ modoActivo, onTabPress }) => {
    const { colors, isDark, toggleTheme } = useTheme();

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bottomBarFondo, borderTopColor: colors.borde }]}>
            <View style={[styles.contenedor, { backgroundColor: colors.bottomBarFondo }]}>
                
                {/* TAB: LISTA */}
                <TouchableOpacity 
                    style={styles.tab} 
                    onPress={() => onTabPress('lista')}
                >
                    <Text style={[styles.icono, { color: modoActivo === 'lista' ? colors.bottomBarIconoActivo : colors.bottomBarIcono }]}>🏠</Text>
                    <Text style={[styles.texto, { color: modoActivo === 'lista' ? colors.bottomBarIconoActivo : colors.bottomBarIcono }]}>Inicio</Text>
                </TouchableOpacity>

                {/* TAB: ESCÁNER (Botón Central Flotante) */}
                <View style={styles.tabCentralContenedor}>
                    <TouchableOpacity 
                        style={[styles.botonEscaner, { backgroundColor: colors.marcadorEscaner, shadowColor: colors.marcadorEscaner }]}
                        onPress={() => onTabPress('escaner')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.iconoEscaner}>📷</Text>
                    </TouchableOpacity>
                </View>

                {/* TAB: AJUSTES (Toggle Tema por ahora) */}
                <TouchableOpacity 
                    style={styles.tab} 
                    onPress={toggleTheme}
                >
                    <Text style={[styles.icono, { color: colors.bottomBarIcono }]}>{isDark ? '☀️' : '🌙'}</Text>
                    <Text style={[styles.texto, { color: colors.bottomBarIcono }]}>Tema</Text>
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        borderTopWidth: 1,
        elevation: 10,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    contenedor: {
        flexDirection: 'row',
        height: 60,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: Platform.OS === 'android' ? 10 : 0, 
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    icono: {
        fontSize: 22,
        marginBottom: 4,
    },
    texto: {
        fontSize: 12,
        fontWeight: '600',
    },
    tabCentralContenedor: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    botonEscaner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: -15, 
        elevation: 6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    iconoEscaner: {
        fontSize: 28,
        color: '#FFF',
    }
});
