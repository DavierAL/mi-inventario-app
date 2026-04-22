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

                {/* TAB: ESCÁNER */}
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => handlePress('escaner')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={modoActivo === 'escaner' ? 'barcode' : 'barcode-outline'}
                        size={22}
                        color={iconColor('escaner')}
                    />
                    <Text style={[styles.texto, { color: iconColor('escaner') }]}>
                        Escáner
                    </Text>
                </TouchableOpacity>

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
    },
    contenedor: {
        flexDirection: 'row',
        height: 60,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 4,
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
});
