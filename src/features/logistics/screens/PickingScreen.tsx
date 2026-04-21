// ARCHIVO: src/features/logistics/screens/PickingScreen.tsx
/**
 * PickingScreen — Panel de pedidos pendientes para el operador de almacén.
 *
 * Diseño: Notion Design System (dark-mode-first, warm neutrals, whisper borders, Notion Blue).
 */
import React, { memo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
const FlashListAny = FlashList as any;
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Envio, { EstadoPedido } from '../../../core/database/models/Envio';
import { LogisticsRepository } from '../repository/logisticsRepository';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useLogisticsSync } from '../hooks/useLogisticsSync';
import { SkeletonCard } from '../../../core/ui/SkeletonCard';
import { SHADOWS } from '../../../core/ui/shadows';

import { 
    Text, 
    Surface, 
    Button, 
    Badge, 
    Input 
} from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';

type PickingNavProp = NativeStackNavigationProp<RootStackParamList, 'PickingList'>;

// ─── Tarjeta de envio ───────────────────────────────────────────────────────

interface PedidoCardProps {
    envio: Envio;
    onDespachar: (envio: Envio) => void;
    onVerPanel: (envio: Envio) => void;
}

const PedidoCard = memo(({ envio, onDespachar, onVerPanel }: PedidoCardProps) => {
    const { colors } = useTheme();
    const puedeDespachar = envio.estado === 'Pendiente';

    // Mapeo semántico para el Badge del Design System
    const getBadgeVariant = (estado: string): any => {
        switch (estado) {
            case 'Pendiente': return 'error';
            case 'En_Tienda': return 'info';
            case 'Entregado': return 'success';
            default: return 'default';
        }
    };

    return (
        <Surface variant="elevated" style={styles.card} padding="lg">
            {/* Cabecera de la tarjeta */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text variant="h3" weight="bold">{envio.codPedido}</Text>
                    </View>
                    <Text variant="body" color={colors.textoSecundario} numberOfLines={1}>
                        {envio.cliente}
                    </Text>
                </View>
                <Badge 
                    label={envio.estado.replace('_', ' ')} 
                    variant={getBadgeVariant(envio.estado)} 
                />
            </View>

            {/* Info Logística */}
            <View style={styles.logisticaRow}>
                {envio.distrito && (
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={colors.textoTerciario} />
                        <Text variant="small" color={colors.textoTerciario} style={{ marginLeft: 4 }}>
                            {envio.distrito}
                        </Text>
                    </View>
                )}
                {envio.operador && (
                    <View style={[styles.metaItem, { marginLeft: TOKENS.spacing.md }]}>
                        <Ionicons name="bicycle-outline" size={12} color={colors.textoTerciario} />
                        <Text variant="small" color={colors.textoTerciario} style={{ marginLeft: 4 }}>
                            {envio.operador}
                        </Text>
                    </View>
                )}
            </View>

            {envio.notas ? (
                <View style={styles.notasContainer}>
                    <Text variant="small" color={colors.textoSecundario} numberOfLines={2}>
                        {envio.notas}
                    </Text>
                </View>
            ) : null}

            {/* Acciones del Design System */}
            <View style={styles.cardActions}>
                {puedeDespachar && (
                    <Button 
                        label="Despachar"
                        variant="primary"
                        size="sm"
                        style={{ flex: 1, marginRight: TOKENS.spacing.sm }}
                        icon={<Ionicons name="arrow-forward" size={16} color="#FFF" />}
                        onPress={() => onDespachar(envio)}
                    />
                )}
                <Button 
                    label="Ver Panel"
                    variant="secondary"
                    size="sm"
                    style={{ flex: puedeDespachar ? 1 : 2 }}
                    icon={<Ionicons name="qr-code-outline" size={16} color={colors.primario} />}
                    onPress={() => onVerPanel(envio)}
                />
            </View>
        </Surface>
    );
});

// ─── Lista reactiva ──────────────────────────────────────────────────────────

interface ListaBaseProps {
    pedidos: Envio[];
    isFiltrado: boolean;
    onDespachar: (p: Envio) => void;
    onVerPanel: (p: Envio) => void;
}

const ListaBase = memo(({ pedidos, isFiltrado, onDespachar, onVerPanel }: ListaBaseProps) => {
    const { colors } = useTheme();
    return (
        <FlashListAny
            data={pedidos}
            keyExtractor={(item: any) => item.id}
            estimatedItemSize={160}
            renderItem={({ item }: any) => (
                <PedidoCard envio={item} onDespachar={onDespachar} onVerPanel={onVerPanel} />
            )}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
                <View style={styles.listaVacia}>
                    <Ionicons name={isFiltrado ? "search-outline" : "checkmark-circle-outline"} size={56} color={colors.textoTerciario} />
                    <Text style={[styles.listaVaciaTexto, { color: colors.textoPrincipal }]}>
                        {isFiltrado ? 'No se encontraron pedidos' : 'Sin pedidos pendientes'}
                    </Text>
                    <Text style={[styles.listaVaciaSubtexto, { color: colors.textoSecundario }]}>
                        {isFiltrado ? 'Intenta con otros criterios de búsqueda.' : 'Los pedidos nuevos aparecerán aquí al sincronizar.'}
                    </Text>
                </View>
            }
        />
    );
});

// Suscripción reactiva
interface ListaReactivaParams {
    busqueda: string;
    filtroEstado: EstadoPedido | null;
    ordenDesc: boolean;
    isFiltrado: boolean;
}

export const PickingList = withObservables(['busqueda', 'filtroEstado', 'ordenDesc'], ({ busqueda, filtroEstado, ordenDesc }: ListaReactivaParams) => {
    let condiciones: any[] = [];
    
    if (filtroEstado) {
        condiciones.push(Q.where('estado', filtroEstado));
    }
    
    if (busqueda.trim()) {
        const termino = `%${Q.sanitizeLikeString(busqueda.trim())}%`;
        condiciones.push(
            Q.or(
                Q.where('cod_pedido', Q.like(termino)),
                Q.where('cliente', Q.like(termino))
            )
        );
    }
    
    condiciones.push(Q.sortBy('created_at', ordenDesc ? Q.desc : Q.asc));

    return {
        pedidos: database
            .get<Envio>('envios')
            .query(...condiciones)
            .observeWithColumns(['estado'])
    };
})(ListaBase);

// ─── Pantalla principal ──────────────────────────────────────────────────────

export const PickingScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<PickingNavProp>();
    const { cargando, error, reSincronizar } = useLogisticsSync();

    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | null>(null);
    const [ordenDesc, setOrdenDesc] = useState(true);

    const handleDespachar = async (envio: Envio) => {
        try {
            await LogisticsRepository.actualizarEstado(envio, 'En_Tienda');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleVerPanel = (envio: Envio) => {
        navigation.navigate('StorePanel', { pedidoId: envio.id });
    };

    const handleToggleFiltro = (estado: EstadoPedido) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFiltroEstado(prev => prev === estado ? null : estado);
    };

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.fondo}
            />

            {/* Cabecera */}
            <View style={[styles.cabecera, {
                backgroundColor: colors.superficie,
                borderBottomColor: colors.borde,
            }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.textoPrincipal} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text variant="h2" weight="bold">Logística</Text>
                    <Text variant="small" color={colors.textoSecundario}>Panel de Picking</Text>
                </View>
                <TouchableOpacity onPress={reSincronizar} style={styles.syncBtn} disabled={cargando}>
                    {cargando ? (
                        <ActivityIndicator size="small" color={colors.primario} />
                    ) : (
                        <Ionicons name="sync" size={22} color={colors.primario} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Buscador y Filtros */}
            <View style={[styles.filtrosBox, { backgroundColor: colors.superficie, borderBottomColor: colors.borde, padding: TOKENS.spacing.lg }]}>
                <Input 
                    placeholder="Buscar por código o cliente..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                    icon={<Ionicons name="search-outline" size={20} color={colors.textoTerciario} />}
                    containerStyle={{ marginBottom: TOKENS.spacing.md }}
                />

                <View style={styles.filtrosRow}>
                    <TouchableOpacity
                        onPress={() => handleToggleFiltro('Pendiente')}
                        style={[
                            styles.filtroChip,
                            { backgroundColor: colors.fondoPrimario },
                            filtroEstado === 'Pendiente' && { backgroundColor: colors.primario }
                        ]}
                    >
                        <Text 
                            variant="small" 
                            weight="medium"
                            color={filtroEstado === 'Pendiente' ? '#FFF' : colors.primario}
                        >
                            Pendientes
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={() => handleToggleFiltro('En_Tienda')}
                        style={[
                            styles.filtroChip,
                            { backgroundColor: colors.fondoPrimario, marginLeft: TOKENS.spacing.sm },
                            filtroEstado === 'En_Tienda' && { backgroundColor: colors.primario }
                        ]}
                    >
                        <Text 
                            variant="small" 
                            weight="medium"
                            color={filtroEstado === 'En_Tienda' ? '#FFF' : colors.primario}
                        >
                            En Tienda
                        </Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <TouchableOpacity 
                        onPress={() => setOrdenDesc(!ordenDesc)} 
                        style={[styles.ordenBtn, { backgroundColor: colors.fondoPrimario }]}
                    >
                        <Ionicons 
                            name={ordenDesc ? "filter" : "filter-outline"} 
                            size={18} 
                            color={colors.primario} 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Lista reactiva de envíos */}
            <View style={{ flex: 1 }}>
                {cargando && (
                    <View style={{ padding: TOKENS.spacing.lg }}>
                        <SkeletonCard />
                        <SkeletonCard />
                    </View>
                )}
                
                <PickingList 
                    busqueda={busqueda} 
                    filtroEstado={filtroEstado} 
                    ordenDesc={ordenDesc}
                    isFiltrado={Boolean(busqueda.trim().length > 0 || filtroEstado !== null)}
                    onDespachar={handleDespachar} 
                    onVerPanel={handleVerPanel} 
                />
            </View>

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

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    cabecera: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backBtn: { marginRight: 12, padding: 4 },
    titulo: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.25,
        lineHeight: 28,
    },
    subtitulo: {
        fontSize: 14,
        fontWeight: '400',
        marginTop: 1,
    },
    btnFab: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.CARD,
    },
    barraHerramientas: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    contenedorBuscador: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
    },
    iconoBuscador: { marginRight: 8 },
    inputBuscador: { flex: 1, fontSize: 15, fontWeight: '400' },
    btnLimpiar: { padding: 4 },
    btnOrden: {
        width: 44,
        height: 44,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    estadosRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 8,
        flexWrap: 'wrap',
    },
    badgeBtn: {
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
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
    lista: {
        padding: 16,
        gap: 12,
        paddingBottom: 32,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        ...SHADOWS.CARD,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardCodigo: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    canalBadge: {
        backgroundColor: 'rgba(75, 160, 66, 0.15)', // Light version of primario
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    canalBadgeText: {
        color: '#4ba042',
        fontSize: 10,
        fontWeight: '800',
    },
    logisticaRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    opLogisticoBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 8,
    },
    opLogisticoText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardCliente: {
        fontSize: 14,
        fontWeight: '400',
        marginTop: 2,
    },
    cardMeta: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    cardNotas: {
        fontSize: 13,
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
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    btnSecundarioText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listaVacia: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    listaVaciaTexto: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
        letterSpacing: -0.25,
    },
    listaVaciaSubtexto: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    syncIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    syncText: {
        fontSize: 13,
        fontWeight: '500',
    },
    retryBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    retryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filtroChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    ordenBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filtrosBox: {
        paddingVertical: 12,
    },
    filtrosRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    notasContainer: {
        marginTop: 8,
        padding: 8,
        borderRadius: 4,
    },
    syncBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
