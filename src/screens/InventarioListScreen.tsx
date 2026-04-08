// ARCHIVO: src/screens/InventarioListScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ActivityIndicator,
    StatusBar, TouchableOpacity, Alert,
    TextInput, RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { FlashList } from '@shopify/flash-list';
import { useDebounce } from '../utils/useDebounce';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { ProductoCard } from '../components/ProductoCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { EditProductoModal } from '../components/EditProductoModal';
import { BottomBar } from '../components/BottomBar';
import { useTheme } from '../context/ThemeContext';
import { useInventarioStore } from '../store/useInventarioStore';
import { RootStackParamList } from '../types/navigation';
import { ProductoInventario } from '../types/inventario';

const FastList = FlashList as any;

type InventarioListNavProp = NativeStackNavigationProp<RootStackParamList, 'InventarioList'>;

export const InventarioListScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<InventarioListNavProp>();

    const {
        inventario, cargando, error, modoOffline, lastSync,
        busqueda, setBusqueda, cargarDatos,
        productoEditando, setProductoEditando, guardarEdicion,
        pendientesSync, sincronizandoFondo, iniciarListenerInternet
    } = useInventarioStore();

    const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
    const [refrescando, setRefrescando] = useState(false);
    
    // Retardo artificial para búsquedas
    const busquedaDebounced = useDebounce(busqueda, 300);

    useEffect(() => {
        cargarDatos();
        iniciarListenerInternet();
    }, []);

    const [filtroRapido, setFiltroRapido] = useState<'TODOS' | 'VENCIDOS' | '30_DIAS' | '90_DIAS'>('TODOS');

    const { inventarioProcesado, conteos } = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        
        let vencidos = 0, en30Dias = 0, en90Dias = 0;
        
        // 1. Calculamos los días restantes para CADA producto
        const inventarioConDias = inventario.map(item => {
            let diasRestantes = Infinity;
            
            if (item.FV_Actual) {
                const [dia, mes, anio] = item.FV_Actual.split('/');
                if(dia && mes && anio) {
                    const fechaVencimiento = new Date(Number(anio), Number(mes) - 1, Number(dia));
                    const diferenciaMilisegundos = fechaVencimiento.getTime() - hoy.getTime();
                    diasRestantes = Math.ceil(diferenciaMilisegundos / (1000 * 3600 * 24));
                    
                    if (diasRestantes < 0) vencidos++;
                    else if (diasRestantes <= 30) en30Dias++;
                    else if (diasRestantes <= 90) en90Dias++;
                }
            }
            return { ...item, diasRestantes };
        });

        // 2. Filtramos según botón
        let listaFiltrada = inventarioConDias;
        if (filtroRapido === 'VENCIDOS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes < 0);
        if (filtroRapido === '30_DIAS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes >= 0 && i.diasRestantes <= 30);
        if (filtroRapido === '90_DIAS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes > 30 && i.diasRestantes <= 90);

        // 3. Aplicamos la búsqueda de texto si el usuario escribió algo
        const termino = busquedaDebounced.toLowerCase().trim();
        if (termino) {
            listaFiltrada = listaFiltrada.filter(p =>
                String(p.SKU).toLowerCase().includes(termino) ||
                String(p.Descripcion).toLowerCase().includes(termino) ||
                String(p.Cod_Barras).toLowerCase().includes(termino)
            );
        }

        // Ordenar rápido para que los que expiran primero salgan arriba, solo si estamos en un filtro activo
        if (filtroRapido !== 'TODOS') {
            listaFiltrada.sort((a, b) => a.diasRestantes - b.diasRestantes);
        }

        return { inventarioProcesado: listaFiltrada, conteos: { vencidos, en30Dias, en90Dias } };
    }, [busquedaDebounced, inventario, filtroRapido]);

    const handleRefresh = async () => {
        setRefrescando(true);
        await cargarDatos(true);
        setRefrescando(false);
    };

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

    const manejarProductoEncontrado = useCallback((producto: ProductoInventario) => {
        setProductoEditando(producto);
    }, [setProductoEditando]);

    if (cargando && inventario.length === 0) {
        // En lugar del spinner solitario, renderizamos Skeletons
        const fakeList = [1, 2, 3, 4, 5, 6, 7];
        return (
            <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.superficie} />
                <View style={[styles.cabecera, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <Text style={[styles.tituloApp, { color: colors.textoPrincipal }]}>Inventario Activo</Text>
                    <Text style={[styles.subtituloApp, { color: colors.textoSecundario }]}>Sincronizando con la nube...</Text>
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
                <TouchableOpacity onPress={() => cargarDatos()} style={[styles.botonReintentar, { backgroundColor: colors.primario }]}>
                    <Text style={styles.textoBotonReintentar}>Reintentar Conexión</Text>
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
                            📵 Caché local · Última sync: {lastSync}
                        </Text>
                        <TouchableOpacity onPress={() => cargarDatos()}>
                            <Text style={[styles.botonReconectar, { color: colors.bannerOfflineBoton }]}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.cabecera, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <Text style={[styles.tituloApp, { color: colors.textoPrincipal }]}>Inventario Activo</Text>
                    {pendientesSync > 0 && (
                        <Text style={{ fontSize: 13, color: colors.error, fontWeight: '700', marginTop: -2, marginBottom: 4 }}>
                            {sincronizandoFondo ? '🔄 Enviando pendientes...' : `⏳ ${pendientesSync} edición(es) por enviar`}
                        </Text>
                    )}
                    <Text style={[styles.subtituloApp, { color: colors.textoSecundario }]}>
                        {busqueda || filtroRapido !== 'TODOS' ? `${inventarioProcesado.length} de ` : ''}{inventario.length} productos registrados
                    </Text>
                    
                    <View style={[styles.contenedorBuscador, { backgroundColor: colors.fondoBuscador, borderColor: colors.borde }]}>
                        <Text style={styles.iconoBuscador}>🔍</Text>
                        <TextInput
                            style={[styles.inputBuscador, { color: colors.textoPrincipal }]}
                            placeholder="Buscar SKU, código o título..."
                            placeholderTextColor={colors.placeholder}
                            value={busqueda}
                            onChangeText={setBusqueda}
                            returnKeyType="search"
                            clearButtonMode="while-editing"
                        />
                        {busqueda.length > 0 && (
                            <TouchableOpacity onPress={() => setBusqueda('')}>
                                <Text style={[styles.botonLimpiar, { color: colors.placeholder }]}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* NUEVO: DASHBOARD DE CADUCIDAD (CARRUSEL) */}
                <View style={[styles.contenedorFiltros, { backgroundColor: colors.superficie, borderBottomColor: colors.borde }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                        <TouchableOpacity 
                            style={[styles.botonFiltro, filtroRapido === 'TODOS' && [styles.filtroActivo, { borderColor: colors.primario, backgroundColor: colors.primario }]]}
                            onPress={() => setFiltroRapido('TODOS')}
                        >
                            <Text style={[styles.textoFiltro, { color: colors.textoSecundario }, filtroRapido === 'TODOS' && { color: 'white' }]}>📦 Todos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.botonFiltro, { borderColor: '#E53E3E' }, filtroRapido === 'VENCIDOS' && { backgroundColor: '#E53E3E' }]}
                            onPress={() => setFiltroRapido('VENCIDOS')}
                        >
                            <Text style={[styles.textoFiltro, { color: '#E53E3E' }, filtroRapido === 'VENCIDOS' && { color: 'white' }]}>
                                🔴 Vencidos: {conteos.vencidos}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.botonFiltro, { borderColor: '#DD6B20' }, filtroRapido === '30_DIAS' && { backgroundColor: '#DD6B20' }]}
                            onPress={() => setFiltroRapido('30_DIAS')}
                        >
                            <Text style={[styles.textoFiltro, { color: '#DD6B20' }, filtroRapido === '30_DIAS' && { color: 'white' }]}>
                                🟠 {'<'} 30 días: {conteos.en30Dias}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.botonFiltro, { borderColor: '#D69E2E' }, filtroRapido === '90_DIAS' && { backgroundColor: '#D69E2E' }]}
                            onPress={() => setFiltroRapido('90_DIAS')}
                        >
                            <Text style={[styles.textoFiltro, { color: '#D69E2E' }, filtroRapido === '90_DIAS' && { color: 'white' }]}>
                                🟡 {'<'} 90 días: {conteos.en90Dias}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Importante: FlashList necesita de un contenedor con altura implícita o 'flex: 1' */}
                <View style={{ flex: 1, width: '100%' }}>
                    <FastList
                        data={inventarioProcesado}
                        keyExtractor={(item: ProductoInventario) => `${item.Cod_Barras}_${item.SKU}`}
                        estimatedItemSize={104} // Clave del alto rendimiento
                        renderItem={({ item }: { item: ProductoInventario }) => (
                            <ProductoCard item={item} onPress={manejarProductoEncontrado} />
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
                                    {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin inventario'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </View>

            <EditProductoModal
                visible={productoEditando !== null}
                producto={productoEditando}
                onGuardar={guardarEdicion}
                onCancelar={() => setProductoEditando(null)}
            />

            {/* Bottom Bar: Mantenemos la pestaña 'lista' activa, y al pulsar escáner navegamos */}
            <BottomBar 
                modoActivo="lista" 
                onTabPress={(tab) => {
                    if (tab === 'escaner') handleBotonEscaner();
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
    }
});
