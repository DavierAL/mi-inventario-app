// ARCHIVO: src/features/logistics/screens/StorePanelScreen.tsx
/**
 * StorePanelScreen — Panel de la tienda para recepcionar pedidos.
 *
 * Flujo:
 *  1. (Opcional) Escanear QR del pedido → carga datos desde SQLite local.
 *  2. Capturar foto POD (Proof of Delivery).
 *  3. Guardar URI local + encolar job de upload en QueueService.
 *  4. Si hay red → procesarTodo() inmediato; si no → queda en cola offline.
 *
 * Diseño: Notion Design System (warm white bg, whisper borders, Notion Blue CTAs).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import Toast from 'react-native-toast-message';
import * as Haptics2 from 'expo-haptics';

import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';
import { QueueService } from '../../../core/services/QueueService';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useLogisticsSync } from '../hooks/useLogisticsSync';

type StorePanelNavProp = NativeStackNavigationProp<RootStackParamList, 'StorePanel'>;
type StorePanelRoute = RouteProp<RootStackParamList, 'StorePanel'>;

// ─── Colores por estado ───────────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoPedido, { bg: string; text: string; label: string }> = {
    Pendiente:  { bg: '#fff4ed', text: '#dd5b00', label: 'Pendiente' },
    Picking:    { bg: '#f5f0ff', text: '#391c57', label: 'Picking' },
    En_Tienda:  { bg: '#f2f9ff', text: '#097fe8', label: 'En Tienda' },
    Entregado:  { bg: '#f0fdf4', text: '#1aae39', label: 'Entregado' },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const StorePanelScreen = () => {
    const { isDark } = useTheme();
    const navigation = useNavigation<StorePanelNavProp>();
    const route = useRoute<StorePanelRoute>();
    const { cargando: sincronizando } = useLogisticsSync();

    const [permisoCamera, pedirPermiso] = useCameraPermissions();
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [modoEscaner, setModoEscaner] = useState(false);
    const [modoFoto, setModoFoto] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [fotoUri, setFotoUri] = useState<string | null>(null);
    const [qrEscaneado, setQrEscaneado] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Si vino con pedidoId desde PickingScreen, cargarlo directamente
    useEffect(() => {
        const pedidoId = route.params?.pedidoId;
        if (pedidoId) {
            cargarPedidoPorId(pedidoId);
        }
    }, [route.params?.pedidoId]);

    const cargarPedidoPorId = async (id: string) => {
        try {
            const p = await database.get<Pedido>('pedidos').find(id);
            setPedido(p);
        } catch {
            Toast.show({ type: 'error', text1: 'Pedido no encontrado en local' });
        }
    };

    const cargarPedidoPorCodigo = async (codPedido: string) => {
        try {
            const results = await database
                .get<Pedido>('pedidos')
                .query(Q.where('cod_pedido', codPedido))
                .fetch();
            if (results.length > 0) {
                setPedido(results[0]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({ type: 'success', text1: `Pedido ${codPedido} cargado` });
            } else {
                Toast.show({ type: 'error', text1: 'Pedido no encontrado', text2: codPedido });
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error al buscar pedido' });
        }
    };

    // ─── Escaneo QR ───────────────────────────────────────────────────────────

    const handleAbrirEscaner = async () => {
        if (!permisoCamera?.granted) {
            const { granted } = await pedirPermiso();
            if (!granted) {
                Alert.alert('Permiso requerido', 'Activa la cámara en Ajustes del dispositivo.');
                return;
            }
        }
        setQrEscaneado(false);
        setModoEscaner(true);
    };

    const handleQrEscaneado = useCallback(({ data }: { data: string }) => {
        if (qrEscaneado) return; // evitar múltiples disparos
        setQrEscaneado(true);
        setModoEscaner(false);
        cargarPedidoPorCodigo(data.trim());
    }, [qrEscaneado]);

    // ─── Captura de foto POD ──────────────────────────────────────────────────

    const handleAbrirCamara = async () => {
        if (!permisoCamera?.granted) {
            const { granted } = await pedirPermiso();
            if (!granted) {
                Alert.alert('Permiso requerido', 'Activa la cámara en Ajustes del dispositivo.');
                return;
            }
        }
        setModoFoto(true);
    };

    const handleCapturarFoto = async () => {
        if (!cameraRef.current) return;
        try {
            setProcesando(true);
            const foto = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: false,
                skipProcessing: false,
            });
            if (!foto?.uri) throw new Error('No se obtuvo URI de la foto');

            // Mover a directorio permanente con nombre único
            const destino = `${FileSystem.documentDirectory}pod_${pedido?.id ?? 'tmp'}_${Date.now()}.jpg`;
            await FileSystem.moveAsync({ from: foto.uri, to: destino });

            setFotoUri(destino);
            setModoFoto(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({ type: 'success', text1: 'Foto capturada', text2: 'Lista para guardar' });
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error al capturar foto' });
        } finally {
            setProcesando(false);
        }
    };

    // ─── Confirmar entrega (guarda local + encola upload) ─────────────────────

    const handleConfirmarEntrega = async () => {
        if (!pedido) return;
        if (!fotoUri) {
            Alert.alert('Foto requerida', 'Toma una foto de evidencia antes de confirmar.');
            return;
        }

        try {
            setProcesando(true);

            // 1. Actualizar SQLite local de forma inmediata (Local-First)
            await database.write(async () => {
                await pedido.update((p) => {
                    p.estado = 'Entregado';
                    p.podLocalUri = fotoUri;
                });
            });

            // 2. Encolar job de upload (Storage → Firestore → delete local)
            const storagePath = `pedidos/${pedido.codPedido}/pod_${Date.now()}.jpg`;
            await QueueService.encolarFoto({
                pedidoId: pedido.id,
                localUri: fotoUri,
                storagePath,
            });

            // 3. Intentar procesar inmediatamente si hay red
            const net = await NetInfo.fetch();
            if (net.isConnected) {
                QueueService.procesarColaFotos().catch(() => {});
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
                type: 'success',
                text1: 'Entrega confirmada',
                text2: net.isConnected ? 'Subiendo evidencia...' : 'Se sincronizará cuando haya red',
            });

            navigation.goBack();
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error al confirmar entrega' });
        } finally {
            setProcesando(false);
        }
    };

    // ─── Modal escáner QR ─────────────────────────────────────────────────────

    if (modoEscaner) {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setModoEscaner(false)}>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <CameraView
                        style={{ flex: 1 }}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={handleQrEscaneado}
                    />
                    <SafeAreaView style={styles.escaner_overlay}>
                        <View style={styles.escaner_marco} />
                        <Text style={styles.escaner_hint}>Apunta al QR del pedido</Text>
                        <TouchableOpacity
                            style={styles.escaner_cerrar}
                            onPress={() => setModoEscaner(false)}
                        >
                            <Ionicons name="close-circle" size={48} color="#fff" />
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Modal>
        );
    }

    // ─── Modal cámara POD ─────────────────────────────────────────────────────

    if (modoFoto) {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setModoFoto(false)}>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
                    <SafeAreaView style={styles.camara_overlay}>
                        <TouchableOpacity
                            style={styles.camara_cerrar}
                            onPress={() => setModoFoto(false)}
                        >
                            <Ionicons name="close-circle" size={44} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.camara_disparador}
                            onPress={handleCapturarFoto}
                            disabled={procesando}
                            activeOpacity={0.8}
                        >
                            {procesando
                                ? <ActivityIndicator color="#0075de" />
                                : <Ionicons name="camera" size={36} color="#0075de" />
                            }
                        </TouchableOpacity>
                        <Text style={styles.camara_hint}>Fotografía la evidencia de entrega</Text>
                    </SafeAreaView>
                </View>
            </Modal>
        );
    }

    // ─── Vista principal ──────────────────────────────────────────────────────

    const badge = pedido ? (ESTADO_BADGE[pedido.estado] ?? ESTADO_BADGE.En_Tienda) : null;

    return (
        <SafeAreaView style={styles.contenedor}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="#f6f5f4" />

            {/* Cabecera */}
            <View style={styles.cabecera}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="rgba(0,0,0,0.95)" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.titulo}>Panel Tienda</Text>
                    <Text style={styles.subtitulo}>Recepción y Entrega POD</Text>
                </View>
                <TouchableOpacity
                    style={styles.btnEscaner}
                    onPress={handleAbrirEscaner}
                    activeOpacity={0.85}
                >
                    <Ionicons name="qr-code-outline" size={18} color="#0075de" />
                    <Text style={styles.btnEscanerText}>Escanear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Sin pedido cargado */}
                {!pedido && (
                    <View style={styles.placeholderCard}>
                        <Ionicons name="cube-outline" size={56} color="#a39e98" />
                        <Text style={styles.placeholderTitulo}>Sin pedido cargado</Text>
                        <Text style={styles.placeholderSubtexto}>
                            Escanea el QR del pedido o selecciónalo desde el Panel de Picking.
                        </Text>
                        <TouchableOpacity
                            style={[styles.btnPrimario, { marginTop: 24, alignSelf: 'center' }]}
                            onPress={handleAbrirEscaner}
                        >
                            <Ionicons name="qr-code-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.btnPrimarioText}>Escanear QR</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Datos del pedido cargado */}
                {pedido && (
                    <>
                        {/* Tarjeta de datos */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardLabel}>Código de Pedido</Text>
                                    <Text style={styles.cardValor}>{pedido.codPedido}</Text>
                                </View>
                                {badge && (
                                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={15} color="#a39e98" />
                                <View style={{ marginLeft: 8 }}>
                                    <Text style={styles.cardLabel}>Cliente</Text>
                                    <Text style={styles.cardValor}>{pedido.cliente}</Text>
                                </View>
                            </View>

                            {pedido.operador && (
                                <View style={[styles.infoRow, { marginTop: 8 }]}>
                                    <Ionicons name="briefcase-outline" size={15} color="#a39e98" />
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={styles.cardLabel}>Operador</Text>
                                        <Text style={styles.cardValor}>{pedido.operador}</Text>
                                    </View>
                                </View>
                            )}

                            {pedido.notas && (
                                <>
                                    <View style={styles.divider} />
                                    <Text style={styles.cardLabel}>Notas</Text>
                                    <Text style={[styles.cardValor, { fontWeight: '400', color: '#615d59', marginTop: 4 }]}>
                                        {pedido.notas}
                                    </Text>
                                </>
                            )}
                        </View>

                        {/* Sección POD */}
                        <Text style={styles.seccionTitulo}>Evidencia de Entrega (POD)</Text>

                        {fotoUri ? (
                            /* Foto capturada — muestra nombre de archivo y botón de reemplazar */
                            <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
                                <View style={styles.fotoCheck}>
                                    <Ionicons name="checkmark-circle" size={32} color="#1aae39" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.cardValor}>Foto capturada</Text>
                                    <Text style={styles.cardLabel} numberOfLines={1}>
                                        {fotoUri.split('/').pop()}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={handleAbrirCamara}>
                                    <Ionicons name="camera-outline" size={22} color="#615d59" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.fotoPlaceholder}
                                onPress={handleAbrirCamara}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="camera-outline" size={40} color="#a39e98" />
                                <Text style={styles.fotoPlaceholderText}>Toca para capturar evidencia</Text>
                            </TouchableOpacity>
                        )}

                        {/* Botón confirmar entrega */}
                        {pedido.estado !== 'Entregado' && (
                            <TouchableOpacity
                                style={[
                                    styles.btnPrimario,
                                    styles.btnGrande,
                                    !fotoUri && styles.btnDeshabilitado,
                                ]}
                                onPress={handleConfirmarEntrega}
                                disabled={!fotoUri || procesando}
                                activeOpacity={0.85}
                            >
                                {procesando
                                    ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                                    : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                }
                                <Text style={styles.btnPrimarioText}>
                                    {procesando ? 'Guardando...' : 'Confirmar Entrega'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {pedido.estado === 'Entregado' && (
                            <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                                <Ionicons name="checkmark-circle" size={28} color="#1aae39" />
                                <Text style={[styles.cardValor, { color: '#1aae39' }]}>Pedido entregado con éxito</Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <BottomBar
                modoActivo="logistica"
                onTabPress={(tab: TabActivo) => {
                    if (tab === 'lista') navigation.navigate('InventarioList');
                    if (tab === 'historial') navigation.navigate('Historial');
                    if (tab === 'escaner') navigation.navigate('Scanner');
                    if (tab === 'logistica') navigation.navigate('PickingList');
                }}
            />
        </SafeAreaView>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 2,
};

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#f6f5f4' },
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
    },
    subtitulo: {
        fontSize: 14,
        fontWeight: '400',
        color: '#615d59',
        marginTop: 1,
    },
    btnEscaner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f9ff',
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
    },
    btnEscanerText: {
        color: '#0075de',
        fontSize: 13,
        fontWeight: '600',
    },
    scroll: {
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
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#a39e98',
        marginBottom: 2,
    },
    cardValor: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.95)',
        letterSpacing: -0.1,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginVertical: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
    seccionTitulo: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(0,0,0,0.95)',
        marginTop: 8,
        marginBottom: 4,
        marginLeft: 4,
    },
    fotoPlaceholder: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        ...SHADOW,
    },
    fotoPlaceholderText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#a39e98',
        marginTop: 10,
    },
    fotoCheck: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimario: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0075de',
        borderRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 4,
    },
    btnGrande: {
        paddingVertical: 14,
        borderRadius: 8,
    },
    btnDeshabilitado: {
        backgroundColor: '#a39e98',
    },
    btnPrimarioText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    placeholderCard: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    placeholderTitulo: {
        fontSize: 20,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.95)',
        marginTop: 16,
        letterSpacing: -0.25,
    },
    placeholderSubtexto: {
        fontSize: 14,
        color: '#615d59',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },

    // Escáner QR
    escaner_overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    escaner_marco: {
        width: 240,
        height: 240,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#0075de',
        backgroundColor: 'transparent',
    },
    escaner_hint: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    escaner_cerrar: {
        position: 'absolute',
        bottom: 60,
    },

    // Cámara POD
    camara_overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 48,
    },
    camara_cerrar: {
        position: 'absolute',
        top: 48,
        right: 24,
    },
    camara_disparador: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOW,
        elevation: 8,
    },
    camara_hint: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 9999,
    },
});
