// ARCHIVO: src/features/historial/screens/HistorialScreen.tsx
import React, { useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useHistorial } from '../hooks/useHistorial';
import { useTheme } from '../../../core/ui/ThemeContext';
import { EntradaHistorial, TipoAccionHistorial } from '../../../core/types/inventario';
import { formatearTiempoRelativo, formatearHora } from '../../../core/utils/fecha';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { Text, Surface, Badge, HeaderPremium } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';

const FastList = FlashList as any;

const CONFIG_ACCION: Record<TipoAccionHistorial, {
    icono: string;
    variant: 'primary' | 'neutral' | 'success';
    label: string;
}> = {
    FV_ACTUALIZADO:    { icono: 'calendar',   variant: 'primary', label: 'Fecha Actualizada'  },
    COMENTARIO_AGREGADO: { icono: 'chatbubble', variant: 'neutral', label: 'Nota Agregada'   },
    EDICION_COMPLETA:  { icono: 'create',      variant: 'success', label: 'Edición Completa' },
};

const HistorialSkeleton = () => {
    const { colors } = useTheme();
    return (
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            {[1, 2, 3, 4, 5].map(k => (
                <View key={k} style={{ flexDirection: 'row', marginBottom: 20 }}>
                    <View style={{ alignItems: 'center', marginRight: 14 }}>
                        <View style={[styles.skeletonCircle, { backgroundColor: colors.inputDeshabilitado }]} />
                        <View style={[styles.skeletonLinea, { backgroundColor: colors.inputDeshabilitado }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.skeletonBloque, { backgroundColor: colors.inputDeshabilitado, width: '60%', marginBottom: 6 }]} />
                        <View style={[styles.skeletonBloque, { backgroundColor: colors.inputDeshabilitado, width: '90%', marginBottom: 6 }]} />
                    </View>
                </View>
            ))}
        </View>
    );
};

interface EntradaCardProps {
    entrada: EntradaHistorial;
    esUltima: boolean;
}

const EntradaCard = React.memo(({ entrada, esUltima }: EntradaCardProps) => {
    const { colors } = useTheme();
    const cfg = CONFIG_ACCION[entrada.accion] ?? CONFIG_ACCION.EDICION_COMPLETA;

    return (
        <View style={styles.entradaContenedor}>
            <View style={styles.timelineIzquierda}>
                <Surface 
                    variant="elevated" 
                    padding="xs" 
                    radius="full" 
                    style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name={cfg.icono as any} size={16} color={colors.primario} />
                </Surface>
                {!esUltima && (
                    <View style={[styles.timelineLinea, { backgroundColor: colors.borde }]} />
                )}
            </View>

            <Surface variant="elevated" padding="md" style={styles.tarjeta}>
                <View style={styles.tarjetaCabecera}>
                    <Badge label={cfg.label} variant={cfg.variant} />
                    <Text variant="tiny" color={colors.textoTerciario}>
                        {formatearTiempoRelativo(entrada.timestamp)}
                    </Text>
                </View>

                <Text variant="body" weight="bold" style={{ marginVertical: 8 }}>
                    {entrada.descripcion}
                </Text>

                {entrada.cambios?.fvAnterior && entrada.cambios?.fvNuevo && (
                    <View style={styles.filaCambio}>
                        <Text variant="tiny" weight="bold" color={colors.textoSecundario}>FV:</Text>
                        <Text variant="tiny" color={colors.error} style={{ textDecorationLine: 'line-through' }}>
                            {entrada.cambios.fvAnterior}
                        </Text>
                        <Ionicons name="arrow-forward" size={10} color={colors.textoTerciario} style={{ marginHorizontal: 4 }} />
                        <Text variant="tiny" weight="bold" color={colors.exito}>
                            {entrada.cambios.fvNuevo}
                        </Text>
                    </View>
                )}
                
                {entrada.cambios?.comentario && (
                    <Surface variant="flat" padding="sm" style={{ backgroundColor: colors.fondo, marginBottom: 8 }}>
                        <Text variant="small" color={colors.textoSecundario} italic>
                            💬 {entrada.cambios.comentario}
                        </Text>
                    </Surface>
                )}

                <View style={[styles.tarjetaFooter, { borderTopColor: colors.borde }]}>
                    <Text variant="tiny" color={colors.textoTerciario}>
                        {entrada.sku} · {entrada.marca}
                    </Text>
                    <Text variant="tiny" color={colors.textoTerciario}>
                        {entrada.dispositivo} · {formatearHora(entrada.timestamp)}
                    </Text>
                </View>
            </Surface>
        </View>
    );
});

const HistorialScreen: React.FC = () => {
    const { colors, isDark, toggleTheme } = useTheme();
    const navigation = useNavigation<any>();
    const { entradas, cargando, error } = useHistorial();

    const renderItem = useCallback(({ item, index }: { item: EntradaHistorial; index: number }) => (
        <EntradaCard entrada={item} esUltima={index === entradas.length - 1} />
    ), [entradas.length]);

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <HeaderPremium 
                titulo="Historial" 
            />

            {cargando && <HistorialSkeleton />}

            {!cargando && error && (
                <View style={styles.estadoVacio}>
                    <Ionicons name="wifi-outline" size={56} color={colors.textoTerciario} />
                    <Text variant="body" color={colors.textoSecundario}>{error}</Text>
                </View>
            )}

            {!cargando && !error && entradas.length === 0 && (
                <View style={styles.estadoVacio}>
                    <Ionicons name="clipboard-outline" size={64} color={colors.textoTerciario} />
                    <Text variant="h3" weight="bold">Sin movimientos aún</Text>
                    <Text variant="body" color={colors.textoSecundario} align="center">
                        El historial se llena automáticamente al editar productos.
                    </Text>
                </View>
            )}

            {!cargando && !error && entradas.length > 0 && (
                <FastList
                    data={entradas}
                    keyExtractor={(item: EntradaHistorial) => item.id || String(item.timestamp)}
                    estimatedItemSize={160}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
                    ListHeaderComponent={
                        <Surface variant="flat" padding="md" style={styles.bannerInfo}>
                            <Ionicons name="information-circle-outline" size={16} color={colors.primario} />
                            <Text variant="small" weight="bold" color={colors.primario}>
                                Auditoría Local-First · Sincronizada automáticamente
                            </Text>
                        </Surface>
                    }
                />
            )}
            <BottomBar
                modoActivo="historial"
                onTabPress={(tab: TabActivo) => {
                    if (tab === 'lista') navigation.navigate('InventarioList');
                    if (tab === 'logistica') navigation.navigate('PickingList');
                    if (tab === 'escaner') navigation.navigate('Scanner');
                    if (tab === 'analytics') navigation.navigate('Analytics');
                }}
            />
        </SafeAreaView>
    );
};

// Exportación directa ya que el hook maneja la reactividad
export { HistorialScreen };

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
    botonVolver: { padding: 4, marginRight: 12 },
    entradaContenedor: { flexDirection: 'row', marginBottom: TOKENS.spacing.md },
    timelineIzquierda: { alignItems: 'center', marginRight: 14, width: 36 },
    timelineLinea: { width: 1, flex: 1, marginTop: 6 },
    tarjeta: { flex: 1, marginBottom: 4 },
    tarjetaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    filaCambio: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    tarjetaFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, paddingTop: 8 },
    bannerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    estadoVacio: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
    skeletonCircle: { width: 36, height: 36, borderRadius: 18 },
    skeletonLinea: { width: 1, flex: 1, marginTop: 6 },
    skeletonBloque: { height: 14, borderRadius: 7 },
});
