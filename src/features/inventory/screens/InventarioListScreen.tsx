// ARCHIVO: src/screens/InventarioListScreen.tsx
import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import {
    StyleSheet, Text, View, ActivityIndicator,
    StatusBar, TouchableOpacity, Alert,
    TextInput, RefreshControl, ScrollView,
    Animated, Platform, UIManager
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
import { benchmark } from '../../../core/utils/benchmark';
import { RootStackParamList } from '../../../core/types/navigation';
import { useFiltrosInventario, FiltroCaducidad, Ordenamiento } from '../hooks/useFiltrosInventario';
import { MENSAJES } from '../../../core/constants/mensajes';
import Toast from 'react-native-toast-message';
import { reproducirSonido } from '../../../core/utils/sonidos';
import withObservables from '@nozbe/with-observables';
import { Query } from '@nozbe/watermelondb';
import Producto from '../../../core/database/models/Producto';
import { ProductoInventario } from '../../../core/types/inventario';
import { ProductoCard } from '../components/ProductoCard';
import { SkeletonCard } from '../../../core/ui/SkeletonCard';
import { map } from 'rxjs/operators';
import { calcularDiasRestantes } from '../../../core/utils/fecha';



if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type InventarioListNavProp = NativeStackNavigationProp<RootStackParamList, 'InventarioList'>;

// ─── Sub-componente ListaReactiva (Optimización WatermelonDB) ──────────────

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
            // @ts-ignore - Library types for FlashList are currently incompatible with React 19 types in this environment
            estimatedItemSize={104}
            onScroll={onScroll}
            scrollEventThrottle={16}
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
                <View style={styles.listaVacia}>
                    <Ionicons name="cube-outline" size={64} color={colors.textoTerciario} />
                    <Text style={[styles.listaVaciaTexto, { color: colors.textoSecundario, marginTop: 16, textAlign: 'center' }]}>
                        {busqueda ? MENSAJES.SIN_RESULTADOS(busqueda) : 'No hay productos en el inventario local.'}
                    </Text>
                    {!busqueda && (
                        <TouchableOpacity 
                            style={[styles.botonReintentar, { backgroundColor: colors.primario, marginTop: 20 }]}
                            onPress={repararBaseDeDatos}
                            disabled={sincronizandoFondo}
                        >
                            <Text style={styles.textoBotonReintentar}>
                                {sincronizandoFondo ? 'Sincronizando...' : 'Sincronizar Ahora'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            }
        />
    );
});

const ListaReactiva = withObservables(['query', 'filtroRapido'], ({ query, filtroRapido }: { query: Query<Producto>, filtroRapido: FiltroCaducidad }) => ({
    productos: query.observe().pipe(
        map(productos => {
            if (filtroRapido === 'TODOS') return productos;
            
            // Filtramos en memoria (ultra rápido con RxJS)
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
    
    // Obtenemos la Query (Consulta) en lugar de la lista filtrada
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

    const handleReparar = () => {
        Alert.alert(
            "Reparar Base de Datos",
            "¿Deseas forzar una descarga completa? Esto arreglará productos sin SKU o imagen, pero consumirá más datos.",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sincronizar Todo", 
                    onPress: async () => {
                        Toast.show({ type: 'info', text1: 'Iniciando reparación...', text2: 'Esto tomará unos segundos' });
                        await repararBaseDeDatos();
                        Toast.show({ type: 'success', text1: 'Sincronización completa' });
                    } 
                }
            ]
        );
    };

    if (error) {
        return (
            <View style={[styles.pantallaCentrada, { backgroundColor: colors.fondo }]}>
                <Text style={[styles.textoError, { color: colors.textoPrincipal }]}>{error}</Text>
                <TouchableOpacity onPress={() => cargarDatosSync()} style={[styles.botonReintentar, { backgroundColor: colors.primario }]}>
                    <Text style={styles.textoBotonReintentar}>{MENSAJES.REINTENTAR_CONEXION}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleReparar} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primario, fontWeight: 'bold' }}>Forzar Resincronización Total</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.superficie} />

            <View style={[styles.areaContenido, { backgroundColor: colors.fondo }]}>
                {modoOffline && (
                    <View style={[styles.bannerOffline, { backgroundColor: colors.bannerOfflineFondo }]}>
                        <Text style={[styles.textoBannerOffline, { color: colors.bannerOfflineTexto }]}>
                            {MENSAJES.MODO_OFFLINE_BANNER(lastSync || '--:--')}
                        </Text>
                    </View>
                )}

                <View style={[styles.cabecera, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={[styles.tituloApp, { color: colors.textoPrincipal }]}>{MENSAJES.TITULO_APP}</Text>
                        
                        <TouchableOpacity 
                            onPress={() => cargarDatosSync()}
                            onLongPress={handleReparar}
                            disabled={sincronizandoFondo}
                            style={[styles.syncBadge, { backgroundColor: colors.superficieAlta }]}
                        >
                            {sincronizandoFondo ? (
                                <ActivityIndicator size="small" color={colors.primario} style={{ marginRight: 6 }} />
                            ) : (
                                <Ionicons name={modoOffline ? "cloud-offline" : "cloud-done"} size={16} color={modoOffline ? colors.error : colors.primario} style={{ marginRight: 6 }} />
                            )}
                            <Text style={[styles.syncText, { color: colors.textoSecundario }]}>
                                {sincronizandoFondo ? 'Sincronizando...' : (lastSync ? `Sinc: ${lastSync}` : 'Sin sincronizar')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                            <Ionicons name="stats-chart" size={26} color={colors.primario} style={{ padding: 4 }} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.contenedorBuscador, { backgroundColor: colors.fondoBuscador, borderColor: colors.borde }]}>
                        <Ionicons name="search-outline" size={18} color={colors.placeholder} style={styles.iconoBuscador} />
                        <TextInput
                            style={[styles.inputBuscador, { color: colors.textoPrincipal }]}
                            placeholder={MENSAJES.BUSCAR_PLACEHOLDER}
                            placeholderTextColor={colors.placeholder}
                            value={busqueda}
                            onChangeText={setBusqueda}
                        />
                    </View>
                </View>

                {/* FILTROS Y ORDENAMIENTO (Mismo estilo previo) */}
                <View style={[styles.contenedorFiltros, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                        {(['TODOS', 'VENCIDOS', '30_DIAS', '90_DIAS'] as const).map(f => (
                            <TouchableOpacity 
                                key={f}
                                style={[
                                    styles.botonFiltro,
                                    { borderColor: colors.borde },
                                    filtroRapido === f && { backgroundColor: colors.primario, borderColor: colors.primario },
                                ]} 
                                onPress={() => setFiltroRapido(f)}
                            >
                                <Text style={[styles.textoFiltro, { color: colors.textoSecundario }, filtroRapido === f && { color: 'white' }]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={[styles.contenedorOrden, { backgroundColor: colors.fondo, borderBottomColor: colors.borde }]}>
                    {(['MARCA', 'STOCK', 'FV'] as const).map(o => (
                        <TouchableOpacity 
                            key={o} 
                            style={[
                                styles.botonOrden,
                                { borderColor: colors.borde },
                                ordenamiento === o && { backgroundColor: colors.primario, borderColor: colors.primario },
                            ]} 
                            onPress={() => setOrdenamiento(o)}
                        >
                            <Text style={[styles.textoBotonOrden, { color: ordenamiento === o ? '#FFF' : colors.textoSecundario }]}>{o}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ flex: 1, width: '100%' }}>
                    {/* SKELETON LOADERS: Mientras carga o sincroniza por primera vez */}
                    {cargando ? (
                        <View style={{ flex: 1, paddingTop: 12 }}>
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
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
                    <TouchableOpacity style={styles.botonFlotanteSubir} onPress={scrollToTop}>
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
                    if (tab === 'lista') scrollToTop();
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
    pantallaCentrada: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    textoError: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
    botonReintentar: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
    textoBotonReintentar: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    bannerOffline: { paddingHorizontal: 16, paddingVertical: 10 },
    textoBannerOffline: { fontSize: 13, fontWeight: '500' },
    // Cabecera — Notion typography style
    cabecera: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
    tituloApp: { fontSize: 26, fontWeight: '700', letterSpacing: -0.625, lineHeight: 32 },
    syncBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    syncText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.125 },
    // Buscador — Notion input spec
    contenedorBuscador: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 8, borderWidth: 1, marginTop: 10 },
    iconoBuscador: { marginRight: 8 },
    inputBuscador: { flex: 1, fontSize: 15, fontWeight: '400' },
    listaVacia: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    listaVaciaIcono: { fontSize: 48, marginBottom: 12 },
    listaVaciaTexto: { fontSize: 16, fontWeight: '500' },
    // Filtros — pill style (9999px radius)
    contenedorFiltros: { paddingVertical: 10, borderBottomWidth: 1 },
    botonFiltro: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 6 },
    filtroActivo: {},
    textoFiltro: { fontWeight: '600', fontSize: 12, letterSpacing: 0.125 },
    // Ordenamiento — subtle pill buttons
    contenedorOrden: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
    botonOrden: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, borderWidth: 1 },
    textoBotonOrden: { fontSize: 12, fontWeight: '600', letterSpacing: 0.125 },
    botonFlotanteSubir: { position: 'absolute', bottom: 20, right: 20, width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 9, elevation: 4 }
});
