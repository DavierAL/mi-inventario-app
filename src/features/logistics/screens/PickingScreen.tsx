// ARCHIVO: src/features/logistics/screens/PickingScreen.tsx
/**
 * PickingScreen — Panel de pedidos pendientes para el operador de almacén.
 *
 * Diseño: Notion Design System (dark-mode-first, warm neutrals, whisper borders, Notion Blue).
 */
import React, { memo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, FlatList, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useLogisticsSync } from '../hooks/useLogisticsSync';

type PickingNavProp = NativeStackNavigationProp<RootStackParamList, 'PickingList'>;

// ─── Colores por estado (Notion semantic palette) ────────────────────────────

const ESTADO_BADGE: Record<EstadoPedido, { bg: string; bgDark: string; text: string; label: string }> = {
    Pendiente:  { bg: '#fff4ed', bgDark: '#2d1a0a', text: '#dd5b00', label: 'Pendiente' },
    En_Tienda:  { bg: '#f2f9ff', bgDark: '#0f2035', text: '#62aef0', label: 'En Tienda' },
    Entregado:  { bg: '#f0fdf4', bgDark: '#0a1f12', text: '#22c55e', label: 'Entregado' },
};

// ─── Tarjeta de pedido ───────────────────────────────────────────────────────

interface PedidoCardProps {
    pedido: Pedido;
    onDespachar: (pedido: Pedido) => void;
    onVerPanel: (pedido: Pedido) => void;
}

const PedidoCard = memo(({ pedido, onDespachar, onVerPanel }: PedidoCardProps) => {
    const { colors, isDark } = useTheme();
    const badge = ESTADO_BADGE[pedido.estado] ?? ESTADO_BADGE.Pendiente;
    const puedeDespachar = pedido.estado === 'Pendiente';

    return (
        <View style={[styles.card, {
            backgroundColor: colors.superficie,
            borderColor: colors.borde,
            shadowColor: isDark ? '#000' : '#000',
        }]}>
            {/* Cabecera de la tarjeta */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardCodigo, { color: colors.textoPrincipal }]}>{pedido.codPedido}</Text>
                    <Text style={[styles.cardCliente, { color: colors.textoSecundario }]} numberOfLines={1}>{pedido.cliente}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: isDark ? badge.bgDark : badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
            </View>

            {/* Info secundaria */}
            {pedido.operador ? (
                <Text style={[styles.cardMeta, { color: colors.textoTerciario }]}>
                    <Ionicons name="person-outline" size={12} color={colors.textoTerciario} /> {pedido.operador}
                </Text>
            ) : null}
            {pedido.notas ? (
                <Text style={[styles.cardNotas, { color: colors.textoSecundario }]} numberOfLines={2}>{pedido.notas}</Text>
            ) : null}

            {/* Acciones */}
            <View style={styles.cardActions}>
                {puedeDespachar && (
                    <TouchableOpacity
                        style={[styles.btnPrimario, { backgroundColor: colors.primario }]}
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
                    style={[styles.btnSecundario, { backgroundColor: colors.fondoPrimario }]}
                    onPress={() => onVerPanel(pedido)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="qr-code-outline" size={16} color={colors.primario} style={{ marginRight: 4 }} />
                    <Text style={[styles.btnSecundarioText, { color: colors.primario }]}>Panel Tienda</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// ─── Lista reactiva ──────────────────────────────────────────────────────────

interface ListaBaseProps {
    pedidos: Pedido[];
    isFiltrado: boolean;
    onDespachar: (p: Pedido) => void;
    onVerPanel: (p: Pedido) => void;
}

const ListaBase = memo(({ pedidos, isFiltrado, onDespachar, onVerPanel }: ListaBaseProps) => {
    const { colors } = useTheme();
    return (
        <FlatList
            data={pedidos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <PedidoCard pedido={item} onDespachar={onDespachar} onVerPanel={onVerPanel} />
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

const ListaReactiva = withObservables(['busqueda', 'filtroEstado', 'ordenDesc'], ({ busqueda, filtroEstado, ordenDesc }: ListaReactivaParams) => {
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
            .get<Pedido>('pedidos')
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
                    <Text style={[styles.titulo, { color: colors.textoPrincipal }]}>Logística</Text>
                    <Text style={[styles.subtitulo, { color: colors.textoSecundario }]}>Panel de Picking</Text>
                </View>
                <TouchableOpacity
                    style={[styles.btnFab, { backgroundColor: colors.primario }]}
                    onPress={() => navigation.navigate('StorePanel', {})}
                    activeOpacity={0.85}
                >
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Indicador de sincronización */}
            {(cargando || error) && (
                <View style={[styles.syncIndicator, {
                    backgroundColor: error ? (isDark ? '#2d1010' : '#fff0f0') : (isDark ? '#0f1e2d' : '#f0f8ff'),
                    borderColor: colors.borde,
                }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {cargando && <ActivityIndicator size="small" color={colors.primario} style={{ marginRight: 8 }} />}
                        <Text style={[styles.syncText, { color: error ? colors.error : colors.primario }]}>
                            {error ? '⚠️ ' + error : '🔄 Sincronizando pedidos...'}
                        </Text>
                    </View>
                    {!cargando && error && (
                        <TouchableOpacity onPress={reSincronizar} style={[styles.retryBtn, { backgroundColor: isDark ? '#3d1010' : 'rgba(211, 47, 47, 0.1)' }]}>
                            <Text style={[styles.retryText, { color: colors.error }]}>Reintentar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Buscador & Orden */}
            <View style={[styles.barraHerramientas, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                <View style={[styles.contenedorBuscador, { backgroundColor: colors.fondoBuscador, borderColor: colors.borde }]}>
                    <Ionicons name="search-outline" size={18} color={colors.placeholder} style={styles.iconoBuscador} />
                    <TextInput
                        style={[styles.inputBuscador, { color: colors.textoPrincipal }]}
                        placeholder="Buscar por código o cliente..."
                        placeholderTextColor={colors.placeholder}
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                    {busqueda.length > 0 && (
                        <TouchableOpacity onPress={() => setBusqueda('')} style={styles.btnLimpiar}>
                            <Ionicons name="close-circle" size={16} color={colors.placeholder} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.btnOrden, { borderColor: colors.borde, backgroundColor: colors.fondo }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setOrdenDesc(!ordenDesc);
                    }}
                >
                    <Ionicons name={ordenDesc ? 'arrow-down' : 'arrow-up'} size={18} color={colors.textoSecundario} />
                </TouchableOpacity>
            </View>

            {/* Filtros de estado */}
            <View style={[styles.estadosRow, {
                backgroundColor: colors.superficie,
                borderBottomColor: colors.borde,
            }]}>
                {Object.entries(ESTADO_BADGE).map(([estado, cfg]) => {
                    const isSelected = filtroEstado === estado;
                    const isDimmed = filtroEstado !== null && !isSelected;
                    return (
                        <TouchableOpacity 
                            key={estado} 
                            style={[styles.badgeBtn, {
                                backgroundColor: isDark ? cfg.bgDark : cfg.bg,
                                borderColor: isSelected ? cfg.text : 'transparent',
                                borderWidth: 1,
                                opacity: isDimmed ? 0.4 : 1,
                            }]}
                            onPress={() => handleToggleFiltro(estado as EstadoPedido)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Lista reactiva de pedidos */}
            <ListaReactiva 
                busqueda={busqueda} 
                filtroEstado={filtroEstado} 
                ordenDesc={ordenDesc}
                isFiltrado={Boolean(busqueda.trim().length > 0 || filtroEstado !== null)}
                onDespachar={handleDespachar} 
                onVerPanel={handleVerPanel} 
            />

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

const CARD_SHADOW = {
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
        ...CARD_SHADOW,
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
        ...CARD_SHADOW,
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
});
