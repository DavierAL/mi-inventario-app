// ARCHIVO: src/features/logistics/screens/StorePanelScreen.tsx
/**
 * StorePanelScreen — Panel de la tienda para recepcionar pedidos.
 * Diseño: Notion Design System — dark-mode-first, warm charcoal surfaces, whisper borders.
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import Toast from 'react-native-toast-message';

import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';
import { QueueService } from '../../../core/services/QueueService';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useLogisticsSync } from '../hooks/useLogisticsSync';

type StorePanelNavProp = NativeStackNavigationProp<RootStackParamList, 'StorePanel'>;
type StorePanelRoute = RouteProp<RootStackParamList, 'StorePanel'>;

// ─── Badge config por estado ──────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoPedido, { bg: string; bgDark: string; text: string; label: string }> = {
    Pendiente:  { bg: '#fff4ed', bgDark: '#2d1a0a', text: '#dd5b00', label: 'Pendiente' },
    Picking:    { bg: '#f5f0ff', bgDark: '#1e1028', text: '#9b6dff', label: 'Picking' },
    En_Tienda:  { bg: '#f2f9ff', bgDark: '#0f2035', text: '#62aef0', label: 'En Tienda' },
    Entregado:  { bg: '#f0fdf4', bgDark: '#0a1f12', text: '#22c55e', label: 'Entregado' },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const StorePanelScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<StorePanelNavProp>();
    const route = useRoute<StorePanelRoute>();
    const { } = useLogisticsSync();

    const [permisoCamera, pedirPermiso] = useCameraPermissions();
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [modoEscaner, setModoEscaner] = useState(false);
    const [modoFoto, setModoFoto] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [fotoUri, setFotoUri] = useState<string | null>(null);
    const [qrEscaneado, setQrEscaneado] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        const pedidoId = route.params?.pedidoId;
        if (pedidoId) cargarPedidoPorId(pedidoId);
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
        } catch {
            Toast.show({ type: 'error', text1: 'Error al buscar pedido' });
        }
    };

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
        if (qrEscaneado) return;
        setQrEscaneado(true);
        setModoEscaner(false);
        cargarPedidoPorCodigo(data.trim());
    }, [qrEscaneado]);

    const handleAbrirCamara = async () => {
        if (!permisoCamera?.granted) {
            const { granted } = await pedirPermiso();
            if (!granted) {
                Alert.alert('Permiso requerido', 'Activa la cámara en Ajustes del dispositivo.');
                return;
            }
        }
        setIsCameraReady(false); // Reset on open so we wait again
        setModoFoto(true);
    };

    const handleCapturarFoto = async () => {
        if (!cameraRef.current || !isCameraReady) {
            Toast.show({ type: 'error', text1: 'Cámara no lista', text2: 'Espera un momento e intenta de nuevo' });
            return;
        }
        try {
            setProcesando(true);
            const foto = await cameraRef.current.takePictureAsync({
                quality: 0.75,
                base64: false,
                skipProcessing: true, // más rápido y evita crashes en algunos dispositivos
            });
            if (!foto?.uri) throw new Error('URI de foto nula');
            const destino = `${FileSystem.documentDirectory}pod_${pedido?.id ?? 'tmp'}_${Date.now()}.jpg`;
            await FileSystem.moveAsync({ from: foto.uri, to: destino });
            setFotoUri(destino);
            setModoFoto(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({ type: 'success', text1: 'Foto capturada', text2: 'Lista para guardar' });
        } catch (e: any) {
            console.error('[POD Camera Error]:', e?.message ?? e);
            Toast.show({ type: 'error', text1: 'Error al capturar foto', text2: e?.message ?? 'Intenta de nuevo' });
        } finally {
            setProcesando(false);
        }
    };

    const handleConfirmarEntrega = async () => {
        if (!pedido) return;
        if (!fotoUri) {
            Alert.alert('Foto requerida', 'Toma una foto de evidencia antes de confirmar.');
            return;
        }
        try {
            setProcesando(true);
            await database.write(async () => {
                await pedido.update((p) => {
                    p.estado = 'Entregado';
                    p.podLocalUri = fotoUri;
                });
            });
            const storagePath = `pedidos/${pedido.codPedido}/pod_${Date.now()}.jpg`;
            await QueueService.encolarFoto({
                pedidoId: pedido.id,
                codPedido: pedido.codPedido,
                localUri: fotoUri,
                storagePath,
            });
            const net = await NetInfo.fetch();
            if (net.isConnected) QueueService.procesarColaFotos().catch(() => {});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
                type: 'success',
                text1: 'Entrega confirmada',
                text2: net.isConnected ? 'Subiendo evidencia...' : 'Se sincronizará cuando haya red',
            });
            navigation.goBack();
        } catch {
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
                    <SafeAreaView style={styles.escanerOverlay}>
                        <View style={styles.escanerMarco} />
                        <Text style={styles.escanerHint}>Apunta al QR del pedido</Text>
                        <TouchableOpacity
                            style={styles.escanerCerrar}
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
                    <CameraView
                        ref={cameraRef}
                        style={{ flex: 1 }}
                        facing="back"
                        onCameraReady={() => setIsCameraReady(true)}
                    />
                    <SafeAreaView style={styles.camaraOverlay}>
                        <TouchableOpacity style={styles.camaraCerrar} onPress={() => setModoFoto(false)}>
                            <Ionicons name="close-circle" size={44} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.camaraDisparador,
                                !isCameraReady && { opacity: 0.4 },
                            ]}
                            onPress={handleCapturarFoto}
                            disabled={procesando || !isCameraReady}
                            activeOpacity={0.8}
                        >
                            {procesando
                                ? <ActivityIndicator color="#0075de" />
                                : <Ionicons name="camera" size={36} color="#0075de" />
                            }
                        </TouchableOpacity>
                        <Text style={styles.camaraHint}>
                            {isCameraReady ? 'Fotografía la evidencia de entrega' : 'Iniciando cámara...'}
                        </Text>
                    </SafeAreaView>
                </View>
            </Modal>
        );
    }

    // ─── Vista principal ──────────────────────────────────────────────────────

    const badge = pedido ? (ESTADO_BADGE[pedido.estado] ?? ESTADO_BADGE.En_Tienda) : null;

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
                    <Text style={[styles.titulo, { color: colors.textoPrincipal }]}>Panel Tienda</Text>
                    <Text style={[styles.subtitulo, { color: colors.textoSecundario }]}>Recepción y Entrega POD</Text>
                </View>
                <TouchableOpacity
                    style={[styles.btnEscaner, { backgroundColor: colors.fondoPrimario }]}
                    onPress={handleAbrirEscaner}
                    activeOpacity={0.85}
                >
                    <Ionicons name="qr-code-outline" size={18} color={colors.primario} />
                    <Text style={[styles.btnEscanerText, { color: colors.primario }]}>Escanear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Sin pedido cargado */}
                {!pedido && (
                    <View style={styles.placeholderCard}>
                        <Ionicons name="cube-outline" size={56} color={colors.textoTerciario} />
                        <Text style={[styles.placeholderTitulo, { color: colors.textoPrincipal }]}>Sin pedido cargado</Text>
                        <Text style={[styles.placeholderSubtexto, { color: colors.textoSecundario }]}>
                            Escanea el QR del pedido o selecciónalo desde el Panel de Picking.
                        </Text>
                        <TouchableOpacity
                            style={[styles.btnPrimario, styles.btnGrande, { marginTop: 24, alignSelf: 'center', backgroundColor: colors.primario }]}
                            onPress={handleAbrirEscaner}
                        >
                            <Ionicons name="qr-code-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.btnPrimarioText}>Escanear QR</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Datos del pedido */}
                {pedido && (
                    <>
                        <View style={[styles.card, {
                            backgroundColor: colors.superficie,
                            borderColor: colors.borde,
                        }]}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Código de Pedido</Text>
                                    <Text style={[styles.cardValor, { color: colors.textoPrincipal }]}>{pedido.codPedido}</Text>
                                </View>
                                {badge && (
                                    <View style={[styles.badge, { backgroundColor: isDark ? badge.bgDark : badge.bg }]}>
                                        <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.borde }]} />

                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={15} color={colors.textoTerciario} />
                                <View style={{ marginLeft: 8 }}>
                                    <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Cliente</Text>
                                    <Text style={[styles.cardValor, { color: colors.textoPrincipal }]}>{pedido.cliente}</Text>
                                </View>
                            </View>

                            {pedido.operador && (
                                <View style={[styles.infoRow, { marginTop: 8 }]}>
                                    <Ionicons name="briefcase-outline" size={15} color={colors.textoTerciario} />
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Operador</Text>
                                        <Text style={[styles.cardValor, { color: colors.textoPrincipal }]}>{pedido.operador}</Text>
                                    </View>
                                </View>
                            )}

                            {pedido.notas && (
                                <>
                                    <View style={[styles.divider, { backgroundColor: colors.borde }]} />
                                    <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Notas</Text>
                                    <Text style={[styles.cardValor, { fontWeight: '400', color: colors.textoSecundario, marginTop: 4 }]}>
                                        {pedido.notas}
                                    </Text>
                                </>
                            )}
                        </View>

                        {/* Sección POD */}
                        <Text style={[styles.seccionTitulo, { color: colors.textoPrincipal }]}>Evidencia de Entrega (POD)</Text>

                        {fotoUri ? (
                            <View style={[styles.card, {
                                backgroundColor: colors.superficie,
                                borderColor: colors.borde,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }]}>
                                <View style={[styles.fotoCheck, { backgroundColor: isDark ? '#0a1f12' : '#f0fdf4' }]}>
                                    <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.cardValor, { color: colors.textoPrincipal }]}>Foto capturada</Text>
                                    <Text style={[styles.cardLabel, { color: colors.textoTerciario }]} numberOfLines={1}>
                                        {fotoUri.split('/').pop()}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={handleAbrirCamara}>
                                    <Ionicons name="camera-outline" size={22} color={colors.textoSecundario} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.fotoPlaceholder, {
                                    backgroundColor: colors.superficie,
                                    borderColor: colors.borde,
                                }]}
                                onPress={handleAbrirCamara}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="camera-outline" size={40} color={colors.textoTerciario} />
                                <Text style={[styles.fotoPlaceholderText, { color: colors.textoTerciario }]}>
                                    Toca para capturar evidencia
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Botón confirmar entrega */}
                        {pedido.estado !== 'Entregado' && (
                            <TouchableOpacity
                                style={[
                                    styles.btnPrimario,
                                    styles.btnGrande,
                                    { backgroundColor: !fotoUri ? colors.textoTerciario : colors.primario },
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
                            <View style={[styles.card, {
                                backgroundColor: colors.superficie,
                                borderColor: colors.borde,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                            }]}>
                                <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                                <Text style={[styles.cardValor, { color: '#22c55e' }]}>Pedido entregado con éxito</Text>
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
    },
    subtitulo: {
        fontSize: 14,
        fontWeight: '400',
        marginTop: 1,
    },
    btnEscaner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
    },
    btnEscanerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    scroll: {
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
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    cardValor: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    divider: {
        height: 1,
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
        marginTop: 8,
        marginBottom: 4,
        marginLeft: 4,
    },
    fotoPlaceholder: {
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        ...CARD_SHADOW,
    },
    fotoPlaceholderText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 10,
    },
    fotoCheck: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimario: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 4,
    },
    btnGrande: {
        paddingVertical: 14,
        borderRadius: 8,
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
        marginTop: 16,
        letterSpacing: -0.25,
    },
    placeholderSubtexto: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    // Escáner QR
    escanerOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    escanerMarco: {
        width: 240,
        height: 240,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#0075de',
        backgroundColor: 'transparent',
    },
    escanerHint: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    escanerCerrar: {
        position: 'absolute',
        bottom: 60,
    },
    // Cámara POD
    camaraOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 48,
    },
    camaraCerrar: {
        position: 'absolute',
        top: 48,
        right: 24,
    },
    camaraDisparador: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        ...CARD_SHADOW,
        elevation: 8,
    },
    camaraHint: {
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
