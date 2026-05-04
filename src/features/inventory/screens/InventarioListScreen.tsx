// ARCHIVO: src/features/inventory/screens/InventarioListScreen.tsx
import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import {
    StyleSheet, View, ActivityIndicator,
    StatusBar, Alert,
    RefreshControl, ScrollView,
    Platform, UIManager, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EditProductoModal } from '../components/EditProductoModal';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { useInventarioStore } from '../store/useInventarioStore';
import { RootStackParamList } from '../../../core/types/navigation';
import { useFiltrosInventario, FiltroCaducidad } from '../hooks/useFiltrosInventario';
import { MENSAJES } from '../../../core/constants/mensajes';
import Toast from 'react-native-toast-message';
import { reproducirSonido } from '../../../core/utils/sonidos';
import withObservables from '@nozbe/with-observables';
import { Query } from '@nozbe/watermelondb';
import Producto from '../../../core/database/models/Producto';
import { ProductoCard } from '../components/ProductoCard';
import { SkeletonCard } from '../../../core/ui/SkeletonCard';
import { map } from 'rxjs/operators';
import { calcularDiasRestantes } from '../../../core/utils/fecha';
import { 
    Text, Surface, Button, Input, Badge, HeaderPremium,
    AnimatedPressable as TouchableOpacity 
} from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';
import { usePermissions } from '../../../core/hooks/usePermissions';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type InventarioListNavProp = NativeStackNavigationProp<RootStackParamList, 'InventarioList'>;

// ─── Sub-componente ListaReactiva ──────────────────────────────────────────

interface ListaBaseProps {
    productos: Producto[];
    onPress: (p: Producto) => void;
    busqueda: string;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    listRef: any;
    refrescando: boolean;
    onRefresh: () => void;
    repararBaseDeDatos: () => Promise<void>;
    sincronizandoFondo: boolean;
}

const ListaBase = memo(({ 
    productos, onPress, busqueda, onScroll, listRef, refrescando, onRefresh,
    repararBaseDeDatos, sincronizandoFondo
}: ListaBaseProps) => {
    const { colors } = useTheme();
    return (
        <FlashList
            ref={listRef as any}
            data={productos}
            keyExtractor={(item: Producto) => item.id}
            // @ts-ignore
            estimatedItemSize={110}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listaPadding}
            renderItem={({ item }: { item: Producto }) => (
                <ProductoCard item={item} onPress={onPress} />
            )}
            refreshControl={
                <RefreshControl
                    refreshing={refrescando}
                    onRefresh={onRefresh}
                    colors={[colors.primario]}
                    tintColor={colors.primario}
                />
            }
            ListEmptyComponent={
                <Surface variant="flat" padding="xxl" style={styles.listaVacia}>
                    <Ionicons name="cube-outline" size={64} color={colors.textoTerciario} />
                    <Text variant="body" color={colors.textoSecundario} align="center" style={styles.marginTopMd}>
                        {busqueda ? MENSAJES.SIN_RESULTADOS(busqueda) : 'No hay productos en el inventario local.'}
                    </Text>
                    {!busqueda && (
                        <Button 
                            label={sincronizandoFondo ? 'Sincronizando...' : 'Sincronizar Ahora'}
                            variant="primary"
                            loading={sincronizandoFondo}
                            style={styles.syncBtnFull}
                            onPress={repararBaseDeDatos}
                        />
                    )}
                </Surface>
            }
        />
    );
});

const ListaReactiva = withObservables(['query'], ({ query }: { query: Query<Producto> }) => ({
    productos: query.observe()
}))(ListaBase);

// ─── Pantalla Principal ───────────────────────────────────────────────────

export const InventarioListScreen = () => {
    const { colors, isDark, toggleTheme } = useTheme();
    const navigation = useNavigation<InventarioListNavProp>();
    const route = useRoute<any>();
    const marcaFiltro = route.params?.marca;

    const { 
        cargando, error, pendientesSync, lastSync, sincronizandoFondo,
        repararBaseDeDatos, conectarInventario, cargarDatosSync,
        productoEditando, setProductoEditando, guardarEdicion, modoOffline
    } = useInventarioStore();
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('edit_inventory');

    const [busqueda, setBusqueda] = useState('');
    
    const { 
        queryProductos, 
        filtroRapido, setFiltroRapido, 
        ordenamiento, setOrdenamiento 
    } = useFiltrosInventario(busqueda, marcaFiltro);

    useEffect(() => {
        conectarInventario();
    }, []);

    const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
    const [refrescando, setRefrescando] = useState(false);
    const [mostrarBotonSubir, setMostrarBotonSubir] = useState(false);
    const listRef = useRef<any>(null);
    const mostrarRef = useRef(false);

    const scrollToTop = () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const show = offsetY > 300;
        if (show !== mostrarRef.current) {
            mostrarRef.current = show;
            setMostrarBotonSubir(show);
        }
    }, []);

    const handleRefresh = useCallback(() => {
        cargarDatosSync();
    }, [cargarDatosSync]);

    const handleBotonEscaner = async () => {
        if (!permisoCamara?.granted) {
            const permiso = await pedirPermisoCamara();
            if (!permiso.granted) return;
        }
        navigation.navigate('Scanner');
    };

    const handleGuardar = async (fv: string, fecha: string, com: string) => {
        const res = await guardarEdicion(fv, fecha, com);
        if (res.exito) {
            reproducirSonido('success');
            Toast.show({ type: 'success', text1: MENSAJES.EXITO_GUARDADO });
        }
    };

    const handleSyncManual = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        cargarDatosSync();
    };

    const handleReparar = () => {
        Alert.alert(
            "Reparar Base de Datos",
            "¿Deseas forzar una resincronización total?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Sincronizar", onPress: repararBaseDeDatos }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.superficie} />
            <HeaderPremium 
                titulo="Almacén" 
                showSync={true}
                isSyncing={cargando}
                onSync={handleSyncManual}
                lastSync={lastSync}
            />

            <View style={[styles.areaBuscador, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                <Input 
                    placeholder={MENSAJES.BUSCAR_PLACEHOLDER}
                    value={busqueda}
                    onChangeText={setBusqueda}
                    icon={<Ionicons name="search-outline" size={20} color={colors.textoTerciario} />}
                    containerStyle={styles.searchContainer}
                />
            </View>

            <View style={[styles.areaContenido, { backgroundColor: colors.fondo }]}>
                {modoOffline && (
                    <View style={[styles.bannerOffline, { backgroundColor: colors.error }]}>
                        <Text variant="small" weight="bold" color={colors.absolutoBlanco}>
                            {MENSAJES.MODO_OFFLINE_BANNER(lastSync || '--:--')}
                        </Text>
                    </View>
                )}

                {/* Filtros */}
                <View style={[styles.filtrosRow, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosScroll}>
                        {(['TODOS', 'VENCIDOS', '30_DIAS', '90_DIAS'] as FiltroCaducidad[]).map(f => (
                            <TouchableOpacity 
                                key={f}
                                style={[
                                    styles.chip, 
                                    { backgroundColor: colors.fondoPrimario },
                                    filtroRapido === f && { backgroundColor: colors.primario }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setFiltroRapido(f);
                                }}
                            >
                                <Text 
                                    variant="small" 
                                    weight="bold" 
                                    color={filtroRapido === f ? colors.absolutoBlanco : colors.primario}
                                >
                                    {f === 'TODOS' ? 'Todos' : f === 'VENCIDOS' ? 'Vencidos' : f === '30_DIAS' ? '30 Días' : '90 Días'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.flex1}>
                    {cargando ? (
                        <View style={styles.cargandoContenedor}>
                            {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
                        </View>
                    ) : (
                        <ListaReactiva 
                            query={queryProductos} 
                            onPress={canEdit ? setProductoEditando : undefined} 
                            busqueda={busqueda}
                            onScroll={handleScroll}
                            listRef={listRef}
                            refrescando={refrescando}
                            onRefresh={handleRefresh}
                            repararBaseDeDatos={repararBaseDeDatos}
                            sincronizandoFondo={sincronizandoFondo}
                        />
                    )}
                </View>

                {mostrarBotonSubir && (
                    <TouchableOpacity 
                        style={[styles.fab, { backgroundColor: colors.superficie, shadowColor: colors.textoPrincipal }]} 
                        onPress={scrollToTop}
                    >
                        <Ionicons name="arrow-up" size={24} color={colors.primario} />
                    </TouchableOpacity>
                )}
            </View>

            <EditProductoModal
                visible={productoEditando !== null}
                producto={productoEditando}
                onGuardar={handleGuardar}
                onCancelar={() => setProductoEditando(null)}
            />

            <BottomBar
                modoActivo="lista"
                onTabPress={(tab: TabActivo) => {
                    if (tab === 'escaner') handleBotonEscaner();
                    if (tab === 'historial') navigation.navigate('Historial');
                    if (tab === 'logistica') navigation.navigate('PickingList');
                    if (tab === 'analytics') navigation.navigate('Analytics');
                    if (tab === 'marcas') navigation.navigate('ControlMarcas');
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    marginTopMd: { marginTop: TOKENS.spacing.md },
    marginRight8: { marginRight: 8 },
    syncBtnFull: { marginTop: TOKENS.spacing.xl, width: '100%' },
    filaSync: { flexDirection: 'row', alignItems: 'center' },
    headerBranding: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logoTiny: { width: 32, height: 32 },
    areaBuscador: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
    searchContainer: { marginTop: TOKENS.spacing.md },
    filtrosScroll: { paddingHorizontal: 20, gap: 8 },
    cargandoContenedor: { flex: 1, padding: 20 },
    listaPadding: { paddingVertical: TOKENS.spacing.md },
    contenedor: { flex: 1 },
    areaContenido: { flex: 1 },
    cabecera: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    btnCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    filtrosRow: { paddingVertical: 12, borderBottomWidth: 1 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    listaVacia: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    bannerOffline: { padding: 8, alignItems: 'center' },
    fab: { 
        position: 'absolute', bottom: 20, right: 20, 
        width: 48, height: 48, borderRadius: 24, 
        justifyContent: 'center', alignItems: 'center',
        elevation: 4, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
    }
});
