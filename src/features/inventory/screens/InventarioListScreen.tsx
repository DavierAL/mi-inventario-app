// ARCHIVO: src/features/inventory/screens/InventarioListScreen.tsx
import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import {
    StyleSheet, View, ActivityIndicator,
    StatusBar, TouchableOpacity, Alert,
    RefreshControl, ScrollView,
    Platform, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
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
import { Text, Surface, Button, Input, Badge } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type InventarioListNavProp = NativeStackNavigationProp<RootStackParamList, 'InventarioList'>;

// ─── Sub-componente ListaReactiva ──────────────────────────────────────────

interface ListaBaseProps {
    productos: Producto[];
    onPress: (p: Producto) => void;
    busqueda: string;
    onScroll: (event: any) => void;
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
            contentContainerStyle={{ paddingVertical: TOKENS.spacing.md }}
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
                    <Text variant="body" color={colors.textoSecundario} align="center" style={{ marginTop: TOKENS.spacing.md }}>
                        {busqueda ? MENSAJES.SIN_RESULTADOS(busqueda) : 'No hay productos en el inventario local.'}
                    </Text>
                    {!busqueda && (
                        <Button 
                            label={sincronizandoFondo ? 'Sincronizando...' : 'Sincronizar Ahora'}
                            variant="primary"
                            loading={sincronizandoFondo}
                            style={{ marginTop: TOKENS.spacing.xl, width: '100%' }}
                            onPress={repararBaseDeDatos}
                        />
                    )}
                </Surface>
            }
        />
    );
});

const ListaReactiva = withObservables(['query', 'filtroRapido'], ({ query, filtroRapido }: { query: Query<Producto>, filtroRapido: FiltroCaducidad }) => ({
    productos: query.observe().pipe(
        map(productos => {
            if (filtroRapido === 'TODOS') return productos;
            return productos.filter(p => {
                const dias = calcularDiasRestantes(p.fvActualTs);
                if (filtroRapido === 'VENCIDOS') return dias < 0;
                if (filtroRapido === '30_DIAS') return dias >= 0 && dias <= 30;
                if (filtroRapido === '90_DIAS') return dias > 30 && dias <= 90;
                return true;
            });
        })
    )
}))(ListaBase);

// ─── Pantalla Principal ───────────────────────────────────────────────────

export const InventarioListScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<InventarioListNavProp>();

    const { 
        cargando, error, pendientesSync, lastSync, sincronizandoFondo,
        repararBaseDeDatos, conectarInventario, cargarDatosSync,
        productoEditando, setProductoEditando, guardarEdicion, modoOffline
    } = useInventarioStore();

    const [busqueda, setBusqueda] = useState('');
    
    const { 
        queryProductos, 
        filtroRapido, setFiltroRapido, 
        ordenamiento, setOrdenamiento 
    } = useFiltrosInventario(busqueda);

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

    const handleScroll = useCallback((event: any) => {
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

            {/* Cabecera Premium */}
            <View style={[styles.cabecera, { 
                backgroundColor: colors.superficie,
                borderBottomColor: colors.borde,
            }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text variant="h1" weight="bold">Mi Inventario</Text>
                        <Text variant="tiny" weight="bold" color={colors.textoTerciario}>
                            {lastSync ? `SYNC: ${lastSync}` : 'SIN SINCRONIZAR'}
                        </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {pendientesSync > 0 && (
                            <Badge 
                                label={String(pendientesSync)}
                                variant="info"
                                style={{ marginRight: 8 }}
                            />
                        )}
                        <TouchableOpacity 
                            style={[styles.btnCircle, { backgroundColor: colors.fondoPrimario }]}
                            onPress={handleSyncManual}
                            onLongPress={handleReparar}
                            disabled={cargando}
                        >
                            {cargando ? (
                                <ActivityIndicator size="small" color={colors.primario} />
                            ) : (
                                <Ionicons name="sync" size={20} color={colors.primario} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <Input 
                    placeholder={MENSAJES.BUSCAR_PLACEHOLDER}
                    value={busqueda}
                    onChangeText={setBusqueda}
                    icon={<Ionicons name="search-outline" size={20} color={colors.textoTerciario} />}
                    containerStyle={{ marginTop: TOKENS.spacing.md }}
                />
            </View>

            <View style={[styles.areaContenido, { backgroundColor: colors.fondo }]}>
                {modoOffline && (
                    <View style={[styles.bannerOffline, { backgroundColor: colors.error }]}>
                        <Text variant="small" weight="bold" color="#FFF">
                            {MENSAJES.MODO_OFFLINE_BANNER(lastSync || '--:--')}
                        </Text>
                    </View>
                )}

                {/* Filtros */}
                <View style={[styles.filtrosRow, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
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
                                    color={filtroRapido === f ? '#FFF' : colors.primario}
                                >
                                    {f === 'TODOS' ? 'Todos' : f === 'VENCIDOS' ? 'Vencidos' : f === '30_DIAS' ? '30 Días' : '90 Días'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ flex: 1 }}>
                    {cargando ? (
                        <View style={{ flex: 1, padding: 20 }}>
                            {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
                        </View>
                    ) : (
                        <ListaReactiva 
                            query={queryProductos} 
                            filtroRapido={filtroRapido} 
                            onPress={setProductoEditando} 
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
                        style={[styles.fab, { backgroundColor: colors.superficie, shadowColor: '#000' }]} 
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
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
