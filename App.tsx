// ==========================================
// ARCHIVO: App.tsx (Orquestador Principal)
// ==========================================
import React, { useEffect, useState } from 'react';
import {
    StyleSheet, Text, View, FlatList, ActivityIndicator,
    SafeAreaView, StatusBar, TouchableOpacity, Alert,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';

// Tipos, servicios y componentes
import { ProductoInventario } from './src/types/inventario';
import { obtenerInventario, actualizarProducto } from './src/services/api';
import { ProductoCard } from './src/components/ProductoCard';
import { EditProductoModal } from './src/components/EditProductoModal';
import { ScannerScreen } from './src/screens/ScannerScreen';

export default function App() {
    // ==========================================
    // 1. ESTADOS GLOBALES
    // ==========================================
    const [inventario, setInventario] = useState<ProductoInventario[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [modoOffline, setModoOffline] = useState<boolean>(false);
    const [lastSync, setLastSync] = useState<string | undefined>(undefined);

    // Estados de UI y navegación
    const [modo, setModo] = useState<'lista' | 'escaner' | 'editar'>('lista');
    const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();

    // Estados del formulario de edición
    const [productoEditando, setProductoEditando] = useState<ProductoInventario | null>(null);
    const [guardando, setGuardando] = useState<boolean>(false);

    // ==========================================
    // 2. CICLO DE VIDA (INICIALIZACIÓN)
    // ==========================================
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            setError(null);
            const resultado = await obtenerInventario();
            setInventario(resultado.datos);
            setModoOffline(resultado.fromCache);
            setLastSync(resultado.lastSync);
        } catch (err) {
            setError('No se pudo conectar con la base de datos.\nVerifica tu conexión a internet.');
        } finally {
            setCargando(false);
        }
    };

    // ==========================================
    // 3. LÓGICA DEL ESCÁNER
    // ==========================================
    const abrirEscaner = async () => {
        if (!permisoCamara?.granted) {
            const permiso = await pedirPermisoCamara();
            if (!permiso.granted) {
                Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para escanear productos.');
                return;
            }
        }
        setModo('escaner');
    };

    const manejarProductoEncontrado = (producto: ProductoInventario) => {
        setProductoEditando(producto);
        setModo('editar');
    };

    // ==========================================
    // 4. LÓGICA DEL FORMULARIO CON ROLLBACK
    // ==========================================
    const guardarEdicion = async (fv: string, fechaEdicion: string, comentario: string) => {
        if (!productoEditando) return;

        setGuardando(true);
        const codigo = productoEditando.Cod_Barras;

        // Guardamos una copia del estado anterior para el rollback
        const inventarioPrevio = inventario;

        // Actualización Optimista: actualizamos la vista de inmediato
        setInventario(inv =>
            inv.map(item =>
                String(item.Cod_Barras).trim() === String(codigo).trim()
                    ? { ...item, FV_Actual: fv, Fecha_edicion: fechaEdicion, Comentarios: comentario }
                    : item
            )
        );

        // Cerramos el modal inmediatamente para mejor UX
        setModo('lista');
        setGuardando(false);
        setProductoEditando(null);

        // Enviamos al servidor en segundo plano
        const exito = await actualizarProducto(codigo, undefined, fv, fechaEdicion, comentario);

        if (!exito) {
            // ROLLBACK: si el servidor falló, revertimos el inventario al estado anterior
            setInventario(inventarioPrevio);
            Alert.alert(
                'Error de Sincronización',
                'No se pudo guardar en la nube. El cambio fue revertido. Verifica tu conexión e inténtalo de nuevo.'
            );
        }
    };

    const cancelarEdicion = () => {
        setModo('lista');
        setProductoEditando(null);
    };

    // ==========================================
    // 5. RENDERIZADO
    // ==========================================

    // Pantalla de carga
    if (cargando) {
        return (
            <View style={styles.pantallaCentrada}>
                <ActivityIndicator size="large" color="#3182CE" />
                <Text style={styles.textoCargando}>Sincronizando inventario...</Text>
            </View>
        );
    }

    // Pantalla de error sin caché disponible
    if (error) {
        return (
            <View style={styles.pantallaCentrada}>
                <Text style={styles.iconoError}>📡</Text>
                <Text style={styles.textoError}>{error}</Text>
                <TouchableOpacity onPress={cargarDatos} style={styles.botonReintentar}>
                    <Text style={styles.textoBotonReintentar}>Reintentar Conexión</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Pantalla del escáner (pantalla completa)
    if (modo === 'escaner') {
        return (
            <ScannerScreen
                inventario={inventario}
                onProductoEncontrado={manejarProductoEncontrado}
                onCancelar={() => setModo('lista')}
            />
        );
    }

    // Pantalla principal (lista de inventario)
    return (
        <SafeAreaView style={styles.contenedor}>
            <StatusBar barStyle="dark-content" />

            {/* Banner offline */}
            {modoOffline && (
                <View style={styles.bannerOffline}>
                    <Text style={styles.textoBannerOffline}>
                        📵 Modo sin conexión · Última sync: {lastSync}
                    </Text>
                    <TouchableOpacity onPress={cargarDatos}>
                        <Text style={styles.botonReconectar}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Cabecera */}
            <View style={styles.cabecera}>
                <Text style={styles.tituloApp}>Inventario Activo</Text>
                <Text style={styles.subtituloApp}>
                    {inventario.length} productos registrados
                </Text>
            </View>

            {/* Lista de productos */}
            <FlatList
                data={inventario}
                keyExtractor={(item) => String(item.Cod_Barras).trim()}
                renderItem={({ item }) => (
                    <ProductoCard
                        item={item}
                        onPress={manejarProductoEncontrado}
                    />
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
            />

            {/* FAB: Botón flotante del escáner */}
            <TouchableOpacity style={styles.fab} onPress={abrirEscaner}>
                <Text style={styles.fabIcono}>📷</Text>
            </TouchableOpacity>

            {/* Modal de edición */}
            <EditProductoModal
                visible={modo === 'editar'}
                producto={productoEditando}
                guardando={guardando}
                onGuardar={guardarEdicion}
                onCancelar={cancelarEdicion}
            />
        </SafeAreaView>
    );
}

// ==========================================
// 6. ESTILOS
// ==========================================
const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    pantallaCentrada: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
        padding: 20,
    },
    iconoError: {
        fontSize: 48,
        marginBottom: 16,
    },
    textoCargando: {
        marginTop: 15,
        fontSize: 16,
        color: '#4A5568',
        fontWeight: '500',
    },
    textoError: {
        fontSize: 16,
        color: '#4A5568',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    botonReintentar: {
        backgroundColor: '#3182CE',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 2,
    },
    textoBotonReintentar: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    bannerOffline: {
        backgroundColor: '#744210',
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textoBannerOffline: {
        color: '#FEFCBF',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    botonReconectar: {
        color: '#F6E05E',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 12,
    },
    cabecera: {
        padding: 25,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginBottom: 15,
    },
    tituloApp: {
        fontSize: 26,
        fontWeight: '800',
        color: '#2D3748',
        letterSpacing: -0.5,
    },
    subtituloApp: {
        fontSize: 14,
        color: '#718096',
        marginTop: 4,
        fontWeight: '500',
    },
    fab: {
        position: 'absolute',
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        right: 24,
        bottom: 30,
        backgroundColor: '#3182CE',
        borderRadius: 32,
        elevation: 6,
        shadowColor: '#3182CE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    fabIcono: {
        fontSize: 28,
    },
});