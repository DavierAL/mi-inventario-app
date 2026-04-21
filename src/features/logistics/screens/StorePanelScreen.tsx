// ARCHIVO: src/features/logistics/screens/StorePanelScreen.tsx
/**
 * StorePanelScreen — Panel de la tienda para recepcionar pedidos.
 * Diseño: Notion Design System — dark-mode-first, warm charcoal surfaces, whisper borders.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Alert, ActivityIndicator, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';
import { LogisticsRepository } from '../repository/logisticsRepository';
import PedidoItem from '../../../core/database/models/PedidoItem';
import { QueueService } from '../../../core/services/QueueService';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useNetworkStatus } from '../../../core/utils/useNetworkStatus';
import { useLogisticsSync } from '../hooks/useLogisticsSync';
import { SHADOWS } from '../../../core/ui/shadows';

type StorePanelNavProp = NativeStackNavigationProp<RootStackParamList, 'StorePanel'>;
type StorePanelRoute = RouteProp<RootStackParamList, 'StorePanel'>;

// ─── Badge config por estado ──────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoPedido, { bg: string; text: string; label: string }> = {
    Pendiente:  { bg: 'fondoPrimario', text: 'error', label: 'Pendiente' },
    En_Tienda:  { bg: 'fondoPrimario', text: 'primario', label: 'En Tienda' },
    Entregado:  { bg: 'fondoPrimario', text: 'exito', label: 'Entregado' },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const StorePanelScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<StorePanelNavProp>();
    const route = useRoute<StorePanelRoute>();
    const { isOnline } = useNetworkStatus();
    const { } = useLogisticsSync();

    const [permisoCamera, pedirPermiso] = useCameraPermissions();
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [items, setItems] = useState<PedidoItem[]>([]);
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

    useEffect(() => {
        if (pedido) {
            pedido.items.fetch().then((res: any) => setItems(res));
        } else {
            setItems([]);
        }
    }, [pedido]);

    const cargarPedidoPorId = async (id: string) => {
        try {
            const p = await LogisticsRepository.obtenerPorId(id);
            setPedido(p);
        } catch {
            Toast.show({ type: 'error', text1: 'Pedido no encontrado en local' });
        }
    };

    const handleAbrirGmaps = () => {
        if (pedido?.gmapsUrl) {
            Linking.openURL(pedido.gmapsUrl).catch(() => {
                Toast.show({ type: 'error', text1: 'No se pudo abrir el enlace' });
            });
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
            
            // --- OPTIMIZACIÓN DE IMAGEN (Reducción de peso ~90%) ---
            const infoOriginal = await FileSystem.getInfoAsync(foto.uri);
            const pesoOriginalMB = infoOriginal.exists ? (infoOriginal.size / (1024 * 1024)).toFixed(2) : '?';

            const manipResult = await ImageManipulator.manipulateAsync(
                foto.uri,
                [{ resize: { width: 1024 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const infoOptimizado = await FileSystem.getInfoAsync(manipResult.uri);
            const pesoOptimizadoKB = infoOptimizado.exists ? (infoOptimizado.size / 1024).toFixed(0) : '?';

            console.log(`[POD Optimizer] Reducción: ${pesoOriginalMB}MB -> ${pesoOptimizadoKB}KB`);

            const destino = `${FileSystem.documentDirectory}pod_${pedido?.id ?? 'tmp'}_${Date.now()}.jpg`;
            await FileSystem.moveAsync({ from: manipResult.uri, to: destino });

            // Borrar el temporal original (el de la cámara)
            if (foto.uri !== manipResult.uri) {
                await FileSystem.deleteAsync(foto.uri, { idempotent: true });
            }

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
            if (isOnline) {
                QueueService.procesarColaFotos().catch(() => {});
            }
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
                type: 'success',
                text1: 'Entrega confirmada',
                text2: isOnline ? 'Subiendo evidencia...' : 'Se sincronizará cuando haya red',
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.cardValor, { color: colors.textoPrincipal }]}>{pedido.codPedido}</Text>
                                        {pedido.canal === 'woocommerce' && <Text style={styles.badgeWoo}>WooCommerce</Text>}
                                    </View>
                                </View>
                                {badge && (
                                    <View style={[styles.badge, { backgroundColor: colors[badge.bg as keyof typeof colors] as string }]}>
                                        <Text style={[styles.badgeText, { color: colors[badge.text as keyof typeof colors] as string }]}>{badge.label}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.borde }]} />

                             <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={15} color={colors.textoTerciario} />
                                <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Cliente</Text>
                                    <Text style={[styles.cardValor, { color: colors.textoPrincipal }]}>{pedido.cliente}</Text>
                                    {pedido.clienteTelefono ? (
                                        <Text style={[styles.cardMeta, { color: colors.textoSecundario }]}>{pedido.clienteTelefono}</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Entrega & Dirección V6 */}
                            {(pedido.direccion || pedido.distrito) && (
                                <View style={[styles.infoRow, { marginTop: 12 }]}>
                                    <Ionicons name="location-outline" size={15} color={colors.textoTerciario} />
                                    <View style={{ marginLeft: 8, flex: 1 }}>
                                        <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Dirección de Entrega</Text>
                                        <Text style={[styles.cardValor, { color: colors.textoPrincipal, fontSize: 14 }]}>
                                            {pedido.direccion}{pedido.distrito ? `, ${pedido.distrito}` : ''}
                                        </Text>
                                        {pedido.referencia ? (
                                            <Text style={[styles.cardMeta, { color: colors.textoSecundario, marginTop: 2 }]}>
                                                Ref: {pedido.referencia}
                                            </Text>
                                        ) : null}
                                        {pedido.gmapsUrl && (
                                            <TouchableOpacity 
                                                style={[styles.btnLink, { marginTop: 8 }]} 
                                                onPress={handleAbrirGmaps}
                                            >
                                                <Ionicons name="map-outline" size={14} color={colors.primario} />
                                                <Text style={[styles.btnLinkText, { color: colors.primario }]}>Ver en Google Maps</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}

                            {pedido.operadorLogistico && (
                                <View style={[styles.infoRow, { marginTop: 12 }]}>
                                    <Ionicons name="bus-outline" size={15} color={colors.textoTerciario} />
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={[styles.cardLabel, { color: colors.textoTerciario }]}>Operador Logístico</Text>
                                        <Text style={[styles.cardValor, { color: colors.textoPrincipal, fontSize: 14 }]}>
                                            {pedido.operadorLogistico.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            )}

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

                        {/* LISTA DE PRODUCTOS V6 */}
                        <Text style={[styles.seccionTitulo, { color: colors.textoPrincipal }]}>Productos del Pedido</Text>
                        <View style={[styles.card, { backgroundColor: colors.superficie, borderColor: colors.borde, padding: 0 }]}>
                            {items.length === 0 ? (
                                <View style={{ padding: 16, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textoTerciario, fontSize: 13 }}>No hay items registrados</Text>
                                </View>
                            ) : (
                                items.map((item, idx) => (
                                    <View key={item.id} style={[
                                        styles.itemRow, 
                                        idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borde }
                                    ]}>
                                        <View style={styles.itemCantidad}>
                                            <Text style={styles.itemCantidadText}>{item.cantidadPedida}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.itemNombre, { color: colors.textoPrincipal }]}>{item.descripcionWoo}</Text>
                                            {item.skuWoo ? <Text style={[styles.itemSku, { color: colors.textoTerciario }]}>SKU: {item.skuWoo}</Text> : null}
                                        </View>
                                        <Text style={[styles.itemPrecio, { color: colors.textoSecundario }]}>
                                            S/ {item.precioUnitarioWoo?.toFixed(2)}
                                        </Text>
                                    </View>
                                ))
                            )}
                            
                            {pedido.metodoPagoDisplay || pedido.totalWoo ? (
                                <View style={[styles.pagoResumen, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderTopWidth: 1, borderTopColor: colors.borde }]}>
                                    <View style={styles.pagoRow}>
                                        <Text style={[styles.pagoLabel, { color: colors.textoSecundario }]}>Pago:</Text>
                                        <Text style={[styles.pagoValor, { color: colors.textoPrincipal }]}>{pedido.metodoPagoDisplay || '---'}</Text>
                                    </View>
                                    <View style={styles.pagoRow}>
                                        <Text style={[styles.totalLabel, { color: colors.textoPrincipal }]}>TOTAL:</Text>
                                        <Text style={[styles.totalValor, { color: colors.primario }]}>S/ {pedido.totalWoo?.toFixed(2) || '0.00'}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>

                        {/* Sección POD */}
                        <Text style={[styles.seccionTitulo, { color: colors.textoPrincipal, marginTop: 16 }]}>Evidencia de Entrega (POD)</Text>

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
    badgeWoo: {
        backgroundColor: '#0075de',
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        overflow: 'hidden',
    },
    btnLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    btnLinkText: {
        fontSize: 13,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    itemCantidad: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: 'rgba(0,117,222,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemCantidadText: {
        color: '#0075de',
        fontSize: 12,
        fontWeight: '700',
    },
    itemNombre: {
        fontSize: 14,
        fontWeight: '600',
    },
    itemSku: {
        fontSize: 11,
        marginTop: 2,
    },
    itemPrecio: {
        fontSize: 13,
        fontWeight: '500',
    },
    pagoResumen: {
        padding: 12,
        gap: 4,
    },
    pagoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pagoLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    pagoValor: {
        fontSize: 12,
        fontWeight: '600',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    totalValor: {
        fontSize: 16,
        fontWeight: '800',
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
        ...SHADOWS.CARD,
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
    cardMeta: {
        fontSize: 12,
        fontWeight: '500',
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
        ...SHADOWS.CARD,
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
        ...SHADOWS.CARD,
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
