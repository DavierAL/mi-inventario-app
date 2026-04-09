// ARCHIVO: src/screens/InventarioListScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    StyleSheet, Text, View, ActivityIndicator,
    StatusBar, TouchableOpacity, Alert,
    TextInput, RefreshControl, ScrollView,
    Animated, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useDebounce } from '../utils/useDebounce';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { formatearFecha, calcularDiasRestantes } from '../utils/fecha';

import { ProductoCard } from '../components/ProductoCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { EditProductoModal } from '../components/EditProductoModal';
import { BottomBar } from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { useInventarioStore } from '../store/useInventarioStore';
import { RootStackParamList } from '../types/navigation';
import { ProductoInventario } from '../types/inventario';
import { useFiltrosInventario, FiltroCaducidad, Ordenamiento } from '../hooks/useFiltrosInventario';
import { MENSAJES } from '../constants/mensajes';
import Toast from 'react-native-toast-message';
import { reproducirSonido } from '../utils/sonidos';

const FastList = FlashList as any;

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type InventarioListNavProp = NativeStackNavigationProp<RootStackParamList, 'InventarioList'>;

export const InventarioListScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<InventarioListNavProp>();

    const {
        inventario, cargando, busqueda, setBusqueda,
        conectarInventario, cargarDatosSync,
        productoEditando, setProductoEditando, guardarEdicion,
        error, modoOffline, lastSync,
        pendientesSync, sincronizandoFondo
    } = useInventarioStore();

    // LÓGICA DE FILTRADO EXTRAÍDA A UN HOOK PURAMENTE FUNCIONAL
    const { 
        inventarioProcesado, conteos, 
        filtroRapido, setFiltroRapido, 
        ordenamiento, setOrdenamiento 
    } = useFiltrosInventario(inventario, busqueda);

    // Wrappers animados: LayoutAnimation + Haptics antes de cambiar filtro/orden
    const cambiarFiltro = useCallback((nuevoFiltro: FiltroCaducidad) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFiltroRapido(nuevoFiltro);
    }, [setFiltroRapido]);

    const cambiarOrden = useCallback((nuevoOrden: Ordenamiento) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOrdenamiento(nuevoOrden);
    }, [setOrdenamiento]);

    useEffect(() => {
        const unsub = conectarInventario();
        return () => unsub();
    }, [conectarInventario]);

    const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
    const [refrescando, setRefrescando] = useState(false);
    
    // UI State para el botón flotante
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
    }, [mostrarBotonSubir]);

    const handleRefresh = useCallback(() => {
        setRefrescando(true);
        cargarDatosSync();
        setRefrescando(false);
    }, [cargarDatosSync]);

    const handleBotonEscaner = async () => {
        if (!permisoCamara?.granted) {
            const permiso = await pedirPermisoCamara();
            if (!permiso.granted) {
                Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para escanear productos.');
                return;
            }
        }
        navigation.navigate('Scanner');
    };

    if (cargando && Object.keys(inventario).length === 0) {
        const fakeList = [1, 2, 3, 4, 5, 6, 7];
        return (
            <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.superficie} />
                <View style={[styles.cabecera, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <Text style={[styles.tituloApp, { color: colors.textoPrincipal }]}>{MENSAJES.TITULO_APP}</Text>
                    <Text style={[styles.subtituloApp, { color: colors.textoSecundario }]}>{MENSAJES.CARGANDO_INVENTARIO}</Text>
                </View>
                <ScrollView style={{ flex: 1, marginTop: 10 }}>
                    {fakeList.map((k) => <SkeletonCard key={k} />)}
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <View style={[styles.pantallaCentrada, { backgroundColor: colors.fondo }]}>
                <Text style={styles.iconoError}>📡</Text>
                <Text style={[styles.textoError, { color: colors.textoSecundario }]}>{error}</Text>
                <TouchableOpacity onPress={() => cargarDatosSync()} style={[styles.botonReintentar, { backgroundColor: colors.primario }]}>
                    <Text style={styles.textoBotonReintentar}>{MENSAJES.REINTENTAR_CONEXION}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleGuardar = async (fv: string, fecha: string, com: string) => {
        const res = await guardarEdicion(fv, fecha, com);
        
        if (res.exito) {
            reproducirSonido('success');
            if (res.webhookEncolado) {
                Toast.show({
                    type: 'info',
                    text1: 'Guardado (Sync pendiente)',
                    text2: 'El cambio está seguro, pero se enviará a Sheets al recuperar conexión.',
                    visibilityTime: 4000
                });
            } else {
                Toast.show({
                    type: 'success',
                    text1: MENSAJES.EXITO_GUARDADO,
                    text2: MENSAJES.EXITO_GUARDADO_SUB(res.codigo || ''),
                    visibilityTime: 2500
                });
            }
        } else {
            reproducirSonido('error');
            Toast.show({ 
                type: 'error', 
                text1: MENSAJES.ERROR_GUARDADO, 
                text2: res.mensajeError || 'No se pudo guardar en la nube.' 
            });
        }
    };

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.superficie} />

            <View style={[styles.areaContenido, { backgroundColor: colors.fondo }]}>
                {modoOffline && (
                    <View style={[styles.bannerOffline, { backgroundColor: colors.bannerOfflineFondo }]}>
                        <Text style={[styles.textoBannerOffline, { color: colors.bannerOfflineTexto }]}>
                            {MENSAJES.MODO_OFFLINE_BANNER(lastSync || '--:--')}
                        </Text>
                        <TouchableOpacity onPress={() => cargarDatosSync()}>
                            <Text style={[styles.botonReconectar, { color: colors.bannerOfflineBoton }]}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.cabecera, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={[styles.tituloApp, { color: colors.textoPrincipal }]}>{MENSAJES.TITULO_APP}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                            <Ionicons name="stats-chart" size={26} color={colors.primario} style={{ padding: 4 }} />
                        </TouchableOpacity>
                    </View>
                    {pendientesSync > 0 && (
                        <Text style={{ fontSize: 13, color: colors.error, fontWeight: '700', marginTop: -2, marginBottom: 4 }}>
                            {sincronizandoFondo ? '🔄 Enviando pendientes...' : `⏳ ${pendientesSync} edición(es) por enviar`}
                        </Text>
                    )}
                    <Text style={[styles.subtituloApp, { color: colors.textoSecundario }]}>
                        {MENSAJES.PRODUCTOS_REGISTRADOS(inventarioProcesado.length, Object.keys(inventario).length, !!busqueda || filtroRapido !== 'TODOS')}
                    </Text>
                    
                    <View style={[styles.contenedorBuscador, { backgroundColor: colors.fondoBuscador, borderColor: colors.borde }]}>
                        <Ionicons name="search-outline" size={20} color={colors.placeholder} style={styles.iconoBuscador} />
                        <TextInput
                            style={[styles.inputBuscador, { color: colors.textoPrincipal }]}
                            placeholder={MENSAJES.BUSCAR_PLACEHOLDER}
                            placeholderTextColor={colors.placeholder}
                            value={busqueda}
                            onChangeText={setBusqueda}
                            returnKeyType="search"
                            clearButtonMode="while-editing"
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')}>
                                <Ionicons name="close-circle" size={20} color={colors.placeholder} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* DASHBOARD DE CADUCIDAD (CARRUSEL) */}
                <View style={[styles.contenedorFiltros, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                        <TouchableOpacity 
                            style={[styles.botonFiltro, filtroRapido === 'TODOS' && [styles.filtroActivo, { borderColor: colors.primario, backgroundColor: colors.primario }]]}
                            onPress={() => cambiarFiltro('TODOS')}
                        >
                            <Ionicons name="layers-outline" size={16} color={filtroRapido === 'TODOS' ? 'white' : colors.textoSecundario} />
                            <Text style={[styles.textoFiltro, { color: colors.textoSecundario }, filtroRapido === 'TODOS' && { color: 'white' }]}> {MENSAJES.FILTRO_TODOS}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.botonFiltro, { borderColor: colors.error }, filtroRapido === 'VENCIDOS' && { backgroundColor: colors.error }]}
                            onPress={() => cambiarFiltro('VENCIDOS')}
                        >
                            <Ionicons name="alert-circle" size={16} color={filtroRapido === 'VENCIDOS' ? 'white' : colors.error} />
                            <Text style={[styles.textoFiltro, { color: colors.error }, filtroRapido === 'VENCIDOS' && { color: 'white' }]}>
                                {MENSAJES.FILTRO_VENCIDOS}: {conteos.vencidos}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.botonFiltro, { borderColor: '#DD6B20' }, filtroRapido === '30_DIAS' && { backgroundColor: '#DD6B20' }]}
                            onPress={() => cambiarFiltro('30_DIAS')}
                        >
                            <Ionicons name="time-outline" size={16} color={filtroRapido === '30_DIAS' ? 'white' : '#DD6B20'} />
                            <Text style={[styles.textoFiltro, { color: '#DD6B20' }, filtroRapido === '30_DIAS' && { color: 'white' }]}>
                                {MENSAJES.FILTRO_30_DIAS}: {conteos.en30Dias}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.botonFiltro, { borderColor: '#D69E2E' }, filtroRapido === '90_DIAS' && { backgroundColor: '#D69E2E' }]}
                            onPress={() => cambiarFiltro('90_DIAS')}
                        >
                            <Ionicons name="calendar-outline" size={16} color={filtroRapido === '90_DIAS' ? 'white' : '#D69E2E'} />
                            <Text style={[styles.textoFiltro, { color: '#D69E2E' }, filtroRapido === '90_DIAS' && { color: 'white' }]}>
                                {MENSAJES.FILTRO_90_DIAS }: {conteos.en90Dias}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* BOTONES DE ORDENAMIENTO */}
                <View style={[styles.contenedorOrden, { backgroundColor: colors.fondo, borderBottomColor: colors.borde }]}>
                    <Text style={[styles.etiquetaOrden, { color: colors.textoSecundario }]}>Ordenar:</Text>
                    {(['MARCA', 'STOCK', 'FV'] as const).map((opcion) => (
                        <TouchableOpacity
                            key={opcion}
                            onPress={() => cambiarOrden(opcion)}
                            style={[
                                styles.botonOrden,
                                { borderColor: colors.borde },
                                ordenamiento === opcion && { backgroundColor: colors.primario, borderColor: colors.primario }
                            ]}
                        >
                            <Ionicons
                                name={opcion === 'MARCA' ? 'pricetag-outline' : opcion === 'STOCK' ? 'cube-outline' : 'calendar-outline'}
                                size={13}
                                color={ordenamiento === opcion ? '#FFF' : colors.textoSecundario}
                            />
                            <Text style={[
                                styles.textoBotonOrden,
                                { color: ordenamiento === opcion ? '#FFF' : colors.textoSecundario }
                            ]}>
                                {opcion === 'MARCA' ? MENSAJES.ORDEN_MARCA : opcion === 'STOCK' ? MENSAJES.ORDEN_STOCK : MENSAJES.ORDEN_VENCE}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ flex: 1, width: '100%' }}>
                    <FastList
                        ref={listRef}
                        data={inventarioProcesado}
                        keyExtractor={(item: ProductoInventario) => `${item.Cod_Barras}_${item.SKU}`}
                        estimatedItemSize={104}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        renderItem={({ item }: { item: ProductoInventario }) => (
                            <ProductoCard item={item} onPress={setProductoEditando} />
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={refrescando}
                                onRefresh={handleRefresh}
                                colors={[colors.primario]}
                                tintColor={colors.primario}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.listaVacia}>
                                <Text style={styles.listaVaciaIcono}>🔎</Text>
                                <Text style={[styles.listaVaciaTexto, { color: colors.textoSecundario }]}>
                                    {MENSAJES.SIN_RESULTADOS(busqueda || '')}
                                </Text>
                            </View>
                        }
                    />
                </View>

                {/* Botón Flotante para Subir */}
                {mostrarBotonSubir && (
                    <Animated.View style={{ position: 'absolute', bottom: 20, right: 20 }}>
                        <TouchableOpacity
                            style={[styles.botonFlotanteSubir, { backgroundColor: colors.superficie, borderColor: colors.borde }]}
                            onPress={scrollToTop}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-up" size={24} color={colors.primario} style={{ opacity: 0.6 }} />
                        </TouchableOpacity>
                    </Animated.View>
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
                onTabPress={(tab) => {
                    if (tab === 'escaner') handleBotonEscaner();
                    if (tab === 'lista') scrollToTop();
                    if (tab === 'historial') navigation.navigate('Historial');
                }} 
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    areaContenido: { flex: 1 },
    pantallaCentrada: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20
    },
    iconoError: { fontSize: 48, marginBottom: 16 },
    textoCargando: { marginTop: 15, fontSize: 16, fontWeight: '500' },
    textoError: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
    botonReintentar: {
        paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, elevation: 2
    },
    textoBotonReintentar: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    bannerOffline: {
        paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center'
    },
    textoBannerOffline: { fontSize: 13, fontWeight: '500', flex: 1 },
    botonReconectar: { fontSize: 13, fontWeight: '700', marginLeft: 12 },
    cabecera: {
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
        borderBottomWidth: 1, marginBottom: 10
    },
    tituloApp: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    subtituloApp: { fontSize: 14, marginTop: 4, fontWeight: '500', marginBottom: 14 },
    contenedorBuscador: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10
    },
    iconoBuscador: { fontSize: 16, marginRight: 8 },
    inputBuscador: { flex: 1, fontSize: 15, padding: 0 },
    botonLimpiar: { fontSize: 16, paddingLeft: 8, fontWeight: '600' },
    listaVacia: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    listaVaciaIcono: { fontSize: 48, marginBottom: 12 },
    listaVaciaTexto: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
    contenedorFiltros: {
        paddingBottom: 10,
        marginBottom: 8,
        borderBottomWidth: 1,
    },
    botonFiltro: {
        borderWidth: 1.5,
        borderColor: '#CBD5E0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
    },
    filtroActivo: {
        backgroundColor: '#3182CE',
        borderColor: '#3182CE',
    },
    textoFiltro: {
        fontWeight: 'bold',
        fontSize: 13,
    },
    contenedorOrden: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 8,
        borderBottomWidth: 1,
    },
    etiquetaOrden: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 4,
    },
    botonOrden: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    textoBotonOrden: {
        fontSize: 12,
        fontWeight: '700',
    },
    botonFlotanteSubir: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        opacity: 0.8, // Opacidad bajita como pidió el usuario
    }
});
