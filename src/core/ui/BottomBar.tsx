// ARCHIVO: src/core/ui/BottomBar.tsx
// Notion Design System — whisper border top, warm surface bg, Notion Blue active icons.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeContext';
import { usePermissions } from '../hooks/usePermissions';

export type TabActivo = 'lista' | 'escaner' | 'historial' | 'logistica' | 'analytics';

interface Props {
    modoActivo: TabActivo;
    onTabPress: (tab: TabActivo) => void;
}

export const BottomBar: React.FC<Props> = ({ modoActivo, onTabPress }) => {
    const { colors, isDark, toggleTheme } = useTheme();
    const insets = useSafeAreaInsets();

    const handlePress = (tab: TabActivo) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTabPress(tab);
    };

    const { canAccessTab } = usePermissions();
    const iconColor = (tab: TabActivo) =>
        modoActivo === tab ? colors.primario : colors.bottomBarIcono;

    return (
        <View style={[
            styles.safeArea, 
            { 
                backgroundColor: colors.superficie, 
                borderTopColor: colors.borde,
                paddingBottom: insets.bottom || 4 // Eliminamos el espacio extra 'raro' y usamos insets o un valor mínimo natural
            }
        ]}>
            <View style={styles.contenedor}>
                {/* TAB: ALMACÉN */}
                {canAccessTab('lista') && (
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
                )}

                {/* TAB: LOGÍSTICA */}
                {canAccessTab('logistica') && (
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
                )}

                {/* TAB: ESCÁNER */}
                {canAccessTab('escaner') && (
                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => handlePress('escaner')}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={modoActivo === 'escaner' ? 'barcode' : 'barcode-outline'}
                            size={40} // Más grande como se solicitó
                            color={colors.exito} // Más verde (usando color éxito)
                        />
                        <Text style={[styles.texto, { color: colors.exito, fontWeight: '900', marginTop: -2 }]}>
                            Escáner
                        </Text>
                    </TouchableOpacity>
                )}

                {/* TAB: HISTORIAL */}
                {canAccessTab('historial') && (
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
                )}

                {/* TAB: ANALYTICS */}
                {canAccessTab('analytics') && (
                    <TouchableOpacity
                        style={styles.tab}
                        onPress={() => handlePress('analytics')}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={modoActivo === 'analytics' ? 'stats-chart' : 'stats-chart-outline'}
                            size={22}
                            color={iconColor('analytics')}
                        />
                        <Text style={[styles.texto, { color: iconColor('analytics') }]}>
                            Análisis
                        </Text>
                    </TouchableOpacity>
                )}

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        borderTopWidth: 1,
    },
    contenedor: {
        flexDirection: 'row',
        height: 64,
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
