// ARCHIVO: src/screens/HistorialScreen.tsx
import React, { useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useHistorial } from '../hooks/useHistorial';
import { useTheme } from '../context/ThemeContext';
import { EntradaHistorial, TipoAccionHistorial } from '../types/inventario';

const FastList = FlashList as any;

// ─── Configuración visual por tipo de acción ───────────────────────────────

const CONFIG_ACCION: Record<TipoAccionHistorial, {
    icono: string;
    color: string;
    label: string;
}> = {
    FV_ACTUALIZADO:    { icono: 'calendar',       color: '#3182CE', label: 'Fecha Actualizada' },
    COMENTARIO_AGREGADO: { icono: 'chatbubble',   color: '#805AD5', label: 'Nota Agregada'     },
    RAFAGA_PROCESADA:  { icono: 'flash',          color: '#DD6B20', label: 'Ráfaga'            },
    EDICION_COMPLETA:  { icono: 'create',         color: '#38A169', label: 'Edición Completa'  },
};

// ─── Helper de timestamp relativo ──────────────────────────────────────────

const formatearTiempoRelativo = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHrs = Math.floor(diffMs / 3_600_000);
    const diffDias = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    if (diffDias === 1) return 'Ayer';
    return `Hace ${diffDias} días`;
};

const formatearHora = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit'
    });
};

// ─── Skeleton de carga ─────────────────────────────────────────────────────

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
                        <View style={[styles.skeletonBloque, { backgroundColor: colors.inputDeshabilitado, width: '40%' }]} />
                    </View>
                </View>
            ))}
        </View>
    );
};

// ─── Tarjeta de entrada del timeline ──────────────────────────────────────

interface EntradaCardProps {
    entrada: EntradaHistorial;
    esUltima: boolean;
}

const EntradaCard = React.memo(({ entrada, esUltima }: EntradaCardProps) => {
    const { colors, isDark } = useTheme();
    const cfg = CONFIG_ACCION[entrada.accion] ?? CONFIG_ACCION.EDICION_COMPLETA;

    return (
        <View style={styles.entradaContenedor}>
            {/* Línea vertical del timeline */}
            <View style={styles.timelineIzquierda}>
                <View style={[styles.timelineCirculo, { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}>
                    <Ionicons name={cfg.icono as any} size={16} color={cfg.color} />
                </View>
                {!esUltima && (
                    <View style={[styles.timelineLinea, { backgroundColor: colors.borde }]} />
                )}
            </View>

            {/* Contenido de la tarjeta */}
            <View style={[styles.tarjeta, { backgroundColor: colors.superficie }]}>
                {/* Cabecera */}
                <View style={styles.tarjetaCabecera}>
                    <View style={[styles.badgeAccion, { backgroundColor: cfg.color + '18' }]}>
                        <Text style={[styles.badgeTexto, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={[styles.tiempoTexto, { color: colors.textoSecundario }]}>
                        {formatearTiempoRelativo(entrada.timestamp)}
                    </Text>
                </View>

                {/* Descripción del producto */}
                <Text style={[styles.descripcionTexto, { color: colors.textoPrincipal }]} numberOfLines={2}>
                    {entrada.descripcion}
                </Text>

                {/* Detalles del cambio */}
                {entrada.cambios?.fvAnterior && entrada.cambios?.fvNuevo && (
                    <View style={styles.filaCambio}>
                        <Text style={[styles.cambioLabel, { color: colors.textoSecundario }]}>FV:</Text>
                        <Text style={[styles.cambioValorAntiguo, { color: colors.error }]}>
                            {entrada.cambios.fvAnterior}
                        </Text>
                        <Ionicons name="arrow-forward" size={12} color={colors.textoSecundario} style={{ marginHorizontal: 4 }} />
                        <Text style={[styles.cambioValorNuevo, { color: '#38A169' }]}>
                            {entrada.cambios.fvNuevo}
                        </Text>
                    </View>
                )}
                {entrada.cambios?.comentario && (
                    <Text style={[styles.comentarioTexto, { color: colors.textoSecundario, backgroundColor: isDark ? '#2D3748' : '#F7FAFC' }]} numberOfLines={2}>
                        💬 {entrada.cambios.comentario}
                    </Text>
                )}

                {/* Footer */}
                <View style={styles.tarjetaFooter}>
                    <Text style={[styles.footerTexto, { color: colors.textoSecundario }]}>
                        {entrada.sku} · {entrada.marca}
                    </Text>
                    <Text style={[styles.footerTexto, { color: colors.textoSecundario }]}>
                        {entrada.dispositivo} · {formatearHora(entrada.timestamp)}
                    </Text>
                </View>
            </View>
        </View>
    );
});

// ─── Pantalla principal ────────────────────────────────────────────────────

export const HistorialScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const { entradas, cargando, error } = useHistorial();

    const renderItem = useCallback(({ item, index }: { item: EntradaHistorial; index: number }) => (
        <EntradaCard entrada={item} esUltima={index === entradas.length - 1} />
    ), [entradas.length]);

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>

            {/* Cabecera */}
            <View style={[styles.cabecera, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botonVolver}>
                    <Ionicons name="chevron-back" size={26} color={colors.primario} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.tituloCabecera, { color: colors.textoPrincipal }]}>Historial</Text>
                    <Text style={[styles.subtituloCabecera, { color: colors.textoSecundario }]}>
                        Últimos {entradas.length} movimientos
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Estado: Cargando */}
            {cargando && <HistorialSkeleton />}

            {/* Estado: Error */}
            {!cargando && error && (
                <View style={styles.estadoVacio}>
                    <Text style={{ fontSize: 48 }}>📡</Text>
                    <Text style={[styles.estadoTexto, { color: colors.textoSecundario }]}>{error}</Text>
                </View>
            )}

            {/* Estado: Vacío */}
            {!cargando && !error && entradas.length === 0 && (
                <View style={styles.estadoVacio}>
                    <Text style={{ fontSize: 56 }}>📋</Text>
                    <Text style={[styles.estadoTitulo, { color: colors.textoPrincipal }]}>Sin movimientos aún</Text>
                    <Text style={[styles.estadoTexto, { color: colors.textoSecundario }]}>
                        El historial se llena automáticamente al editar productos.
                    </Text>
                </View>
            )}

            {/* Lista principal */}
            {!cargando && !error && entradas.length > 0 && (
                <FastList
                    data={entradas}
                    keyExtractor={(item: EntradaHistorial) => item.id || String(item.timestamp)}
                    estimatedItemSize={160}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
                    ListHeaderComponent={
                        <View style={[styles.bannerInfo, { backgroundColor: isDark ? '#1A202C' : '#EBF8FF', borderColor: colors.primario }]}>
                            <Ionicons name="information-circle-outline" size={16} color={colors.primario} />
                            <Text style={[styles.bannerTexto, { color: colors.primario }]}>
                                Actualización en tiempo real · {entradas.length} entradas
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

// ─── Estilos ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    cabecera: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    botonVolver: { padding: 8 },
    tituloCabecera: { fontSize: 20, fontWeight: '800' },
    subtituloCabecera: { fontSize: 13, fontWeight: '500', marginTop: 1 },

    // Timeline
    entradaContenedor: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineIzquierda: {
        alignItems: 'center',
        marginRight: 14,
        width: 36,
    },
    timelineCirculo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineLinea: {
        width: 2,
        flex: 1,
        marginTop: 6,
        borderRadius: 1,
    },

    // Tarjeta
    tarjeta: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        marginBottom: 4,
    },
    tarjetaCabecera: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    badgeAccion: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeTexto: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tiempoTexto: { fontSize: 12, fontWeight: '500' },
    descripcionTexto: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 8 },

    // Cambios
    filaCambio: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    cambioLabel: { fontSize: 12, fontWeight: '700', marginRight: 4 },
    cambioValorAntiguo: { fontSize: 12, textDecorationLine: 'line-through' },
    cambioValorNuevo: { fontSize: 12, fontWeight: '700' },
    comentarioTexto: {
        fontSize: 13,
        fontStyle: 'italic',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },

    // Footer
    tarjetaFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    footerTexto: { fontSize: 11 },

    // Banner
    bannerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 16,
    },
    bannerTexto: { fontSize: 13, fontWeight: '600' },

    // Estado vacío / error
    estadoVacio: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 12,
    },
    estadoTitulo: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
    estadoTexto: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

    // Skeleton
    skeletonCircle: { width: 36, height: 36, borderRadius: 18 },
    skeletonLinea: { width: 2, flex: 1, marginTop: 6 },
    skeletonBloque: { height: 14, borderRadius: 7 },
});
