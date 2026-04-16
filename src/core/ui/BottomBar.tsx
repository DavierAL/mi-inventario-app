// ARCHIVO: src/core/ui/BottomBar.tsx
// Notion Design System — whisper border top, warm surface bg, Notion Blue active icons.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeContext';

export type TabActivo = 'lista' | 'escaner' | 'historial' | 'logistica' | 'ajustes';

interface Props {
    modoActivo: TabActivo;
    onTabPress: (tab: TabActivo) => void;
}

export const BottomBar: React.FC<Props> = ({ modoActivo, onTabPress }) => {
    const { colors, isDark, toggleTheme } = useTheme();

    const handlePress = (tab: TabActivo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTabPress(tab);
    };

    const iconColor = (tab: TabActivo) =>
        modoActivo === tab ? colors.primario : colors.bottomBarIcono;

    return (
        <SafeAreaView
            edges={['bottom']}
            style={[styles.safeArea, {
                backgroundColor: colors.bottomBarFondo,
                borderTopColor: colors.borde,
            }]}
        >
            <View style={[styles.contenedor, { backgroundColor: colors.bottomBarFondo }]}>

                {/* TAB: ALMACÉN */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handlePress('lista')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={modoActivo === 'lista' ? 'home' : 'home-outline'}
                        size={22}
                        color={iconColor('lista')}
                    />
                    <Text style={[styles.texto, { color: iconColor('lista') }]}>
                        Almacén
                    </Text>
                </TouchableOpacity>

                {/* TAB: LOGÍSTICA */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handlePress('logistica')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={modoActivo === 'logistica' ? 'cube' : 'cube-outline'}
                        size={22}
                        color={iconColor('logistica')}
                    />
                    <Text style={[styles.texto, { color: iconColor('logistica') }]}>
                        Logística
                    </Text>
                </TouchableOpacity>

                {/* TAB: ESCÁNER (Botón Central) */}
                <View style={styles.tabCentralContenedor}>
                    <TouchableOpacity
                        style={[styles.botonEscaner, {
                            backgroundColor: colors.primario,
                            shadowColor: colors.primario,
                        }]}
                        onPress={() => handlePress('escaner')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="barcode-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* TAB: HISTORIAL */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handlePress('historial')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={modoActivo === 'historial' ? 'time' : 'time-outline'}
                        size={22}
                        color={iconColor('historial')}
                    />
                    <Text style={[styles.texto, { color: iconColor('historial') }]}>
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
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isDark ? 'sunny-outline' : 'moon-outline'}
                        size={22}
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
        // Whisper shadow — Notion multi-layer stack
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 6,
    },
    contenedor: {
        flexDirection: 'row',
        height: 52,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingBottom: Platform.OS === 'android' ? 8 : 0,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
    },
    texto: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.125,
    },
    tabCentralContenedor: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botonEscaner: {
        width: 56,
        height: 56,
        borderRadius: 16,          // 12px standard card radius feel
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Platform.OS === 'ios' ? 12 : 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
});
