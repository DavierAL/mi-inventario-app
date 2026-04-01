// ARCHIVO: src/screens/InventarioListScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    StyleSheet, Text, View, ActivityIndicator,
    SafeAreaView, StatusBar, TouchableOpacity, Alert,
    TextInput, RefreshControl
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { FlashList } from '@shopify/flash-list';
import { useDebounce } from '../utils/useDebounce';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { ProductoCard } from '../components/ProductoCard';
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
        productoEditando, setProductoEditando, guardando, guardarEdicion,
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

    const inventarioFiltrado = useMemo(() => {
        const termino = busquedaDebounced.toLowerCase().trim();
        if (!termino) return inventario;
        return inventario.filter(p =>
            String(p.SKU).toLowerCase().includes(termino) ||
            String(p.Descripcion).toLowerCase().includes(termino) ||
            String(p.Cod_Barras).toLowerCase().includes(termino)
        );
    }, [busquedaDebounced, inventario]);

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

    const manejarProductoEncontrado = (producto: ProductoInventario) => {
        setProductoEditando(producto);
    };

    if (cargando) {
        return (
            <View style={[styles.pantallaCentrada, { backgroundColor: colors.fondo }]}>
                <ActivityIndicator size="large" color={colors.primario} />
                <Text style={[styles.textoCargando, { color: colors.textoSecundario }]}>Sincronizando inventario...</Text>
            </View>
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
                        {busqueda && inventarioFiltrado.length > 0 ? `${inventarioFiltrado.length} de ` : ''}{inventario.length} productos registrados
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

                {/* Importante: FlashList necesita de un contenedor con altura implícita o 'flex: 1' */}
                <View style={{ flex: 1, width: '100%' }}>
                    <FastList
                        data={inventarioFiltrado}
                        keyExtractor={(item: ProductoInventario) => String(item.Cod_Barras).trim()}
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
                guardando={guardando}
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
});
