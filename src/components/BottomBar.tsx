// ARCHIVO: src/components/BottomBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface Props {
    modoActivo: 'lista' | 'escaner' | 'historial' | 'ajustes';
    onTabPress: (tab: 'lista' | 'escaner' | 'historial' | 'ajustes') => void;
}

export const BottomBar: React.FC<Props> = ({ modoActivo, onTabPress }) => {
    const { colors, isDark, toggleTheme } = useTheme();

    const handlePress = (tab: 'lista' | 'escaner' | 'historial' | 'ajustes', intensity: Haptics.ImpactFeedbackStyle) => {
        Haptics.impactAsync(intensity);
        onTabPress(tab);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bottomBarFondo, borderTopColor: colors.borde }]}>
            <View style={[styles.contenedor, { backgroundColor: colors.bottomBarFondo }]}>

                {/* TAB: LISTA */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handlePress('lista', Haptics.ImpactFeedbackStyle.Light)}
                >
                    <Ionicons
                        name={modoActivo === 'lista' ? 'home' : 'home-outline'}
                        size={24}
                        color={modoActivo === 'lista' ? colors.bottomBarIconoActivo : colors.bottomBarIcono}
                    />
                    <Text style={[styles.texto, { color: modoActivo === 'lista' ? colors.bottomBarIconoActivo : colors.bottomBarIcono }]}>
                        Almacén
                    </Text>
                </TouchableOpacity>

                {/* TAB: ESCÁNER (Botón Central Flotante) */}
                <View style={styles.tabCentralContenedor}>
                    <TouchableOpacity
                        style={[styles.botonEscaner, { backgroundColor: colors.marcadorEscaner, shadowColor: colors.marcadorEscaner }]}
                        onPress={() => handlePress('escaner', Haptics.ImpactFeedbackStyle.Medium)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="barcode-outline" size={32} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* TAB: HISTORIAL */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handlePress('historial', Haptics.ImpactFeedbackStyle.Light)}
                >
                    <Ionicons
                        name={modoActivo === 'historial' ? 'time' : 'time-outline'}
                        size={24}
                        color={modoActivo === 'historial' ? colors.bottomBarIconoActivo : colors.bottomBarIcono}
                    />
                    <Text style={[styles.texto, { color: modoActivo === 'historial' ? colors.bottomBarIconoActivo : colors.bottomBarIcono }]}>
                        Historial
                    </Text>
                </TouchableOpacity>

                {/* TAB: TEMA */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleTheme();
                    }}
                >
                    <Ionicons
                        name={isDark ? 'sunny-outline' : 'moon-outline'}
                        size={24}
                        color={colors.bottomBarIcono}
                    />
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
        height: 40,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingBottom: Platform.OS === 'android' ? 10 : 0,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    texto: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    tabCentralContenedor: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    botonEscaner: {
        width: 80,
        height: 80,
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
});
