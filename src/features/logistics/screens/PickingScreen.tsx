// ARCHIVO: src/features/logistics/screens/PickingScreen.tsx
/**
 * PickingScreen — Panel de pedidos pendientes para el operador de almacén.
 *
 * - Lista reactiva (withObservables) de pedidos en estado Pendiente o Picking.
 * - Botón "Despachar a Tienda" actualiza estado a En_Tienda en SQLite local.
 * - El syncService sube el cambio a Firestore en el próximo ciclo de sync.
 * - Diseño: Notion Design System (warm neutrals, pill badges, whisper borders).
 */
import React, { memo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import withObservables from '@nozbe/with-observables';
import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';

type PickingNavProp = NativeStackNavigationProp<RootStackParamList, 'PickingList'>;

// ─── Colores por estado (Notion semantic palette) ────────────────────────────

const ESTADO_BADGE: Record<EstadoPedido, { bg: string; text: string; label: string }> = {
    Pendiente:  { bg: '#fff4ed', text: '#dd5b00', label: 'Pendiente' },
    Picking:    { bg: '#f5f0ff', text: '#391c57', label: 'Picking' },
    En_Tienda:  { bg: '#f2f9ff', text: '#097fe8', label: 'En Tienda' },
    Entregado:  { bg: '#f0fdf4', text: '#1aae39', label: 'Entregado' },
};

// ─── Tarjeta de pedido ───────────────────────────────────────────────────────

interface PedidoCardProps {
    pedido: Pedido;
    onDespachar: (pedido: Pedido) => void;
    onVerPanel: (pedido: Pedido) => void;
}

const PedidoCard = memo(({ pedido, onDespachar, onVerPanel }: PedidoCardProps) => {
    const badge = ESTADO_BADGE[pedido.estado] ?? ESTADO_BADGE.Pendiente;
    const puedeDespachar = pedido.estado === 'Pendiente' || pedido.estado === 'Picking';

    return (
        <View style={styles.card}>
            {/* Cabecera de la tarjeta */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardCodigo}>{pedido.codPedido}</Text>
                    <Text style={styles.cardCliente} numberOfLines={1}>{pedido.cliente}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
            </View>

            {/* Info secundaria */}
            {pedido.operador ? (
                <Text style={styles.cardMeta}>
                    <Ionicons name="person-outline" size={12} color="#a39e98" /> {pedido.operador}
                </Text>
            ) : null}
            {pedido.notas ? (
                <Text style={styles.cardNotas} numberOfLines={2}>{pedido.notas}</Text>
            ) : null}

            {/* Acciones */}
            <View style={styles.cardActions}>
                {puedeDespachar && (
                    <TouchableOpacity
                        style={styles.btnPrimario}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onDespachar(pedido);
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.btnPrimarioText}>Despachar a Tienda</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.btnSecundario}
                    onPress={() => onVerPanel(pedido)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="qr-code-outline" size={16} color="#0075de" style={{ marginRight: 4 }} />
                    <Text style={styles.btnSecundarioText}>Panel Tienda</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// ─── Lista reactiva ──────────────────────────────────────────────────────────

interface ListaBaseProps {
    pedidos: Pedido[];
    onDespachar: (p: Pedido) => void;
    onVerPanel: (p: Pedido) => void;
}

const ListaBase = memo(({ pedidos, onDespachar, onVerPanel }: ListaBaseProps) => (
    <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <PedidoCard pedido={item} onDespachar={onDespachar} onVerPanel={onVerPanel} />
        )}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
            <View style={styles.listaVacia}>
                <Ionicons name="checkmark-circle-outline" size={56} color="#a39e98" />
                <Text style={styles.listaVaciaTexto}>Sin pedidos pendientes</Text>
                <Text style={styles.listaVaciaSubtexto}>
                    Los pedidos nuevos aparecerán aquí al sincronizar.
                </Text>
            </View>
        }
    />
));

// Suscripción reactiva: solo pedidos activos (no Entregado)
const ListaReactiva = withObservables([], () => ({
    pedidos: database
        .get<Pedido>('pedidos')
        .query()
        .observeWithColumns(['estado']),
}))(ListaBase);

// ─── Pantalla principal ──────────────────────────────────────────────────────

export const PickingScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<PickingNavProp>();

    const handleDespachar = async (pedido: Pedido) => {
        await database.write(async () => {
            await pedido.update((p) => {
                p.estado = 'En_Tienda';
            });
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleVerPanel = (pedido: Pedido) => {
        navigation.navigate('StorePanel', { pedidoId: pedido.id });
    };

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: '#f6f5f4' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="#f6f5f4" />

            {/* Cabecera */}
            <View style={styles.cabecera}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="rgba(0,0,0,0.95)" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.titulo}>Logística</Text>
                    <Text style={styles.subtitulo}>Panel de Picking</Text>
                </View>
                <TouchableOpacity
                    style={styles.btnFab}
                    onPress={() => navigation.navigate('StorePanel', {})}
                    activeOpacity={0.85}
                >
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Filtros de estado rápidos */}
            <View style={styles.estadosRow}>
                {Object.entries(ESTADO_BADGE).map(([estado, cfg]) => (
                    <View key={estado} style={[styles.badge, { backgroundColor: cfg.bg, marginRight: 6 }]}>
                        <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                ))}
            </View>

            {/* Lista reactiva de pedidos */}
            <ListaReactiva onDespachar={handleDespachar} onVerPanel={handleVerPanel} />

            <BottomBar
                modoActivo="logistica"
                onTabPress={(tab: TabActivo) => {
                    if (tab === 'lista') navigation.navigate('InventarioList');
                    if (tab === 'historial') navigation.navigate('Historial');
                    if (tab === 'escaner') navigation.navigate('Scanner');
                }}
            />
        </SafeAreaView>
    );
};

// ─── Estilos (Notion Design System) ─────────────────────────────────────────

const SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 2,
};

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    cabecera: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backBtn: { marginRight: 12, padding: 4 },
    titulo: {
        fontSize: 22,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.95)',
        letterSpacing: -0.25,
        lineHeight: 28,
    },
    subtitulo: {
        fontSize: 14,
        fontWeight: '400',
        color: '#615d59',
        marginTop: 1,
    },
    btnFab: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0075de',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOW,
    },
    estadosRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    lista: {
        padding: 16,
        gap: 12,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        padding: 16,
        ...SHADOW,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardCodigo: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.95)',
        letterSpacing: -0.1,
    },
    cardCliente: {
        fontSize: 14,
        fontWeight: '400',
        color: '#615d59',
        marginTop: 2,
    },
    cardMeta: {
        fontSize: 12,
        color: '#a39e98',
        fontWeight: '500',
        marginBottom: 4,
    },
    cardNotas: {
        fontSize: 13,
        color: '#615d59',
        marginBottom: 8,
        lineHeight: 18,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    btnPrimario: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0075de',
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    btnPrimarioText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    btnSecundario: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f2f9ff',
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    btnSecundarioText: {
        color: '#0075de',
        fontSize: 14,
        fontWeight: '600',
    },
    badge: {
        borderRadius: 9999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.125,
    },
    listaVacia: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    listaVaciaTexto: {
        fontSize: 18,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.95)',
        marginTop: 16,
        letterSpacing: -0.25,
    },
    listaVaciaSubtexto: {
        fontSize: 14,
        color: '#615d59',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
});
