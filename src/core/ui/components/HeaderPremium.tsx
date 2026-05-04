// ARCHIVO: src/core/ui/components/HeaderPremium.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { Text } from './Typography';
import { SHADOWS } from '../shadows';
import { TOKENS } from '../tokens';

interface Props {
    titulo: string;
    showSync?: boolean;
    isSyncing?: boolean;
    onSync?: () => void;
    lastSync?: string | null;
    extraAction?: {
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
        color?: string;
        accessibilityLabel: string;
    };
}

export const HeaderPremium: React.FC<Props> = ({ 
    titulo, 
    showSync = false, 
    isSyncing = false, 
    onSync,
    lastSync,
    extraAction
}) => {
    const insets = useSafeAreaInsets();
    const { colors, isDark, toggleTheme } = useTheme();
    const { logout } = useAuthStore();

    const handleLogout = () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro que deseas salir de Mascotify?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Salir', 
                    style: 'destructive',
                    onPress: () => logout()
                }
            ]
        );
    };

    return (
        <View style={[
            styles.header, 
            { 
                backgroundColor: colors.superficie, 
                borderBottomColor: colors.borde,
                paddingTop: Math.max(insets.top, 12) 
            }
        ]}>
            <View style={styles.filaArriba}>
                <View style={styles.branding}>
                    <View style={[styles.logoPlaceholder, { backgroundColor: colors.primario + '15' }]}>
                        <Ionicons name="paw" size={18} color={colors.primario} />
                    </View>
                    <View>
                        <Text variant="body" weight="bold" color={colors.textoPrincipal}>Mascotify</Text>
                        <Text variant="tiny" color={colors.textoTerciario} weight="bold" style={{ marginTop: -2 }}>
                            {titulo.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.acciones}>
                    {extraAction && (
                        <TouchableOpacity 
                            style={[styles.btnCircle, { backgroundColor: colors.fondoPrimario, marginRight: 8 }]}
                            onPress={extraAction.onPress}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel={extraAction.accessibilityLabel}
                            accessibilityRole="button"
                        >
                            <Ionicons name={extraAction.icon} size={20} color={extraAction.color || colors.primario} />
                        </TouchableOpacity>
                    )}
                    {showSync && (
                        <TouchableOpacity 
                            style={[styles.btnCircle, { backgroundColor: colors.fondoPrimario }]}
                            onPress={onSync}
                            disabled={isSyncing}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Sincronizar datos con la nube"
                            accessibilityRole="button"
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color={colors.primario} />
                            ) : (
                                <Ionicons name="sync" size={20} color={colors.primario} />
                            )}
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                        style={[styles.btnCircle, { backgroundColor: colors.fondoPrimario, marginLeft: 8 }]}
                        onPress={toggleTheme}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
                        accessibilityRole="button"
                    >
                        <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.primario} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.btnCircle, { backgroundColor: colors.fondoPrimario, marginLeft: 8 }]}
                        onPress={handleLogout}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Cerrar sesión"
                        accessibilityRole="button"
                    >
                        <Ionicons name="power" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {showSync && lastSync && (
                <View style={styles.barraSync}>
                    <View style={[styles.dot, { backgroundColor: colors.exito }]} />
                    <Text variant="tiny" weight="bold" color={colors.textoTerciario}>
                        SINCRO: {lastSync}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingBottom: 12,
        paddingHorizontal: TOKENS.spacing.lg,
        borderBottomWidth: 1,
        ...SHADOWS.CARD,
    },
    filaArriba: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    branding: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: TOKENS.spacing.md,
    },
    logoPlaceholder: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acciones: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    btnCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    barraSync: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingLeft: 34 + TOKENS.spacing.md, // Alineado con el texto de la marca (logo width + gap)
        gap: 6,
        opacity: 0.8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    }
});
