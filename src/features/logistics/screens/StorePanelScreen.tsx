// ARCHIVO: src/features/logistics/screens/StorePanelScreen.tsx
/**
 * StorePanelScreen — Panel de la tienda para recepcionar Envios.
 * Diseño: Notion Design System — dark-mode-first, warm charcoal surfaces, whisper borders.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
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
import Envio, { EstadoPedido } from '../../../core/database/models/Envio';
import { LogisticsRepository } from '../repository/logisticsRepository';
import { QueueActions } from '../../../core/services/queue';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useNetworkStatus } from '../../../core/utils/useNetworkStatus';
import { useLogisticsSync } from '../hooks/useLogisticsSync';
import { Text, Surface, Button, Badge } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';
import { Logger } from '../../../core/services/LoggerService';
import { ErrorService } from '../../../core/services/ErrorService';
import { validateData, EnvioSchema } from '../../../core/validation/schemas';
import { EnviosService } from '../services/enviosService';


type StorePanelNavProp = NativeStackNavigationProp<RootStackParamList, 'StorePanel'>;
type StorePanelRoute = RouteProp<RootStackParamList, 'StorePanel'>;

// ─── Badge config por estado ──────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoPedido, { bg: string; text: string; label: string }> = {
    Pendiente:  { bg: 'rgba(255, 171, 0, 0.15)', text: '#ffab00', label: 'Pendiente' }, // Notion Yellow/Warning
    En_Tienda:  { bg: 'rgba(0, 117, 222, 0.1)', text: '#0075de', label: 'En Tienda' }, // Notion Blue
    Entregado:  { bg: 'rgba(75, 160, 66, 0.15)', text: '#4ba042', label: 'Entregado' }, // Notion Green
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const StorePanelScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<StorePanelNavProp>();
    const route = useRoute<StorePanelRoute>();
    const { isOnline } = useNetworkStatus();
    const { } = useLogisticsSync();

    const [permisoCamera, pedirPermiso] = useCameraPermissions();
    const [envio, setEnvio] = useState<Envio | null>(null);
    const [modoEscaner, setModoEscaner] = useState(false);
    const [modoFoto, setModoFoto] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [fotoUri, setFotoUri] = useState<string | null>(null);
    const [qrEscaneado, setQrEscaneado] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        const pedidoId = route.params?.pedidoId;
        if (pedidoId) {
            setFotoUri(null); // Reset photo for new order
            cargarPedidoPorId(pedidoId);
        }
    }, [route.params?.pedidoId]);


    const cargarPedidoPorId = async (id: string) => {
        try {
            const p = await LogisticsRepository.obtenerPorId(id);
            setEnvio(p);
        } catch {
            Toast.show({ type: 'error', text1: 'envio no encontrado en local' });
        }
    };

    const handleAbrirGmaps = () => {
        if (envio?.gmapsUrl) {
            Linking.openURL(envio.gmapsUrl).catch(() => {
                Toast.show({ type: 'error', text1: 'No se pudo abrir el enlace' });
            });
        }
    };

    const cargarPedidoPorCodigo = async (codPedido: string) => {
        try {
            const results = await database
                .get<Envio>('envios')
                .query(Q.where('cod_pedido', codPedido))
                .fetch();
            if (results.length > 0) {
                setFotoUri(null); // Reset photo for new order
                setEnvio(results[0]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({ type: 'success', text1: `Envío ${codPedido} cargado` });
            } else {
                Toast.show({ type: 'error', text1: 'Envío no encontrado', text2: codPedido });
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Error al buscar envío' });
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

            const destino = `${FileSystem.documentDirectory}pod_${envio?.id ?? 'tmp'}_${Date.now()}.jpg`;
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
        if (!envio) return;
        
        if (!fotoUri) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                '⚠️ Evidencia Requerida',
                'Es obligatorio tomar una fotografía del paquete o del cliente recibiendo el pedido antes de confirmar la entrega.'
            );
            return;
        }

        Logger.info('[StorePanel] Iniciando confirmación de entrega', {
            pedidoId: envio.id,
            codPedido: envio.codPedido,
        });

        try {
            setProcesando(true);

            // PASO 1: Actualizar WatermelonDB local (optimistic update para UI)
            await database.write(async () => {
                await envio.update((p) => {
                    p.estado = 'Entregado';
                    p.podLocalUri = fotoUri;
                });
            });

            // PASO 2: Subir foto a Supabase Storage
            Toast.show({ type: 'info', text1: 'Subiendo evidencia...' });
            const podUrl = await EnviosService.subirFotoPOD(fotoUri, envio.codPedido);

            // PASO 3: ⚠️ CRÍTICO — Actualizar tabla `envios` en Supabase
            // (ESTE ERA EL PASO FALTANTE QUE CAUSABA QUE LOS CAMBIOS NO LLEGUEN)
            const supabaseId = envio.supabaseId ?? envio.id;
            const resultado = await EnviosService.actualizarEstado({
                supabaseRowId: supabaseId,
                nuevoEstado: 'Entregado',
                podUrl: podUrl ?? undefined,
            });

            if (resultado.exito) {
                // PASO 4: Notificar Google Sheets (no-bloqueante)
                EnviosService.notificarSheets(supabaseId).catch(() => {});

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Toast.show({
                    type: 'success',
                    text1: '✅ Entrega confirmada',
                    text2: 'Evidencia guardada en el sistema',
                });
                
                Logger.info('[StorePanel] Entrega confirmada exitosamente', {
                    pedidoId: envio.id,
                });
            } else {
                // Fallback: sin conexión o error en Supabase
                // Encolar el trabajo para retry automático cuando hay red
                Toast.show({
                    type: 'warning',
                    text1: 'Sin conexión a Internet',
                    text2: 'Guardado localmente. Se sincronizará cuando haya red.',
                });

                Logger.warn('[StorePanel] Encolando ESTADO_ENVIO para retry offline', {
                    pedidoId: envio.id,
                });

                await QueueActions.enqueueEstadoEnvio({
                    supabaseRowId: supabaseId,
                    nuevoEstado: 'Entregado',
                    podLocalUri: fotoUri,
                    codPedido: envio.codPedido,
                });
            }

            navigation.goBack();

        } catch (error) {
            ErrorService.handle(error, {
                operation: 'confirmarEntrega',
                pedidoId: envio.id,
            });
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
                        <Text style={styles.escanerHint}>Apunta al QR del envio</Text>
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

    // ─── Componentes Memoizados ──────────────────────────────────────────────
    
    const OrderDetailsCard = React.memo(({ item }: { item: Envio }) => (
        <Surface variant="elevated" padding="lg" style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text variant="tiny" weight="bold" color={colors.textoTerciario}>
                        CÓDIGO DE ENVÍO
                    </Text>
                    <Text variant="h2" weight="bold">{item.codPedido}</Text>
                </View>
                <Badge 
                    label={item.estado.replace('_', ' ')} 
                    variant={item.estado === 'Entregado' ? 'success' : 'primary'} 
                />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borde }]} />

            <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={colors.textoTerciario} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text variant="tiny" weight="bold" color={colors.textoTerciario}>CLIENTE</Text>
                    <Text variant="body" weight="medium">{item.cliente}</Text>
                    {item.telefono && (
                        <Text variant="small" color={colors.textoSecundario}>{item.telefono}</Text>
                    )}
                </View>
            </View>

            {(item.direccion || item.distrito) && (
                <View style={[styles.infoRow, { marginTop: TOKENS.spacing.md }]}>
                    <Ionicons name="location-outline" size={16} color={colors.textoTerciario} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text variant="tiny" weight="bold" color={colors.textoTerciario}>DIRECCIÓN</Text>
                        <Text variant="body">
                            {item.direccion}{item.distrito ? `, ${item.distrito}` : ''}
                        </Text>
                        {item.referencia && (
                            <Text variant="small" color={colors.textoSecundario} style={{ marginTop: 2 }}>
                                Ref: {item.referencia}
                            </Text>
                        )}
                        {item.gmapsUrl && (
                            <TouchableOpacity 
                                style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }} 
                                onPress={handleAbrirGmaps}
                            >
                                <Ionicons name="map-outline" size={14} color={colors.primario} />
                                <Text variant="small" weight="bold" color={colors.primario} style={{ marginLeft: 4 }}>
                                    Ver en Google Maps
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {item.operador && (
                <View style={[styles.infoRow, { marginTop: TOKENS.spacing.md }]}>
                    <Ionicons name="bicycle-outline" size={16} color={colors.textoTerciario} />
                    <View style={{ marginLeft: 12 }}>
                        <Text variant="tiny" weight="bold" color={colors.textoTerciario}>OPERADOR</Text>
                        <Text variant="body" weight="medium">{item.operador.toUpperCase()}</Text>
                    </View>
                </View>
            )}

            {item.notas && (
                <>
                    <View style={[styles.divider, { backgroundColor: colors.borde }]} />
                    <Text variant="tiny" weight="bold" color={colors.textoTerciario}>NOTAS</Text>
                    <Text variant="small" color={colors.textoSecundario} style={{ marginTop: 4 }}>
                        {item.notas}
                    </Text>
                </>
            )}
        </Surface>
    ));

    const PODEvidenceSection = React.memo(({ uri, isDelivered }: { uri: string | null, isDelivered: boolean }) => (
        <>
            <Text variant="h3" weight="bold" style={{ color: colors.textoPrincipal, marginTop: TOKENS.spacing.xl, marginBottom: TOKENS.spacing.sm }}>
                Evidencia de Entrega (POD)
            </Text>

            {uri ? (
                <Surface variant="elevated" padding="lg" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.fotoCheck, { backgroundColor: isDark ? '#0a1f12' : '#f0fdf4' }]}>
                        <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                    </View>
                    <View style={{ flex: 1, marginLeft: TOKENS.spacing.md }}>
                        <Text variant="body" weight="bold">Foto capturada</Text>
                        <Text variant="small" color={colors.textoTerciario} numberOfLines={1}>
                            Guardada localmente
                        </Text>
                    </View>
                    {!isDelivered && (
                        <Button 
                            label="Cambiar"
                            variant="ghost"
                            size="sm"
                            onPress={handleAbrirCamara}
                        />
                    )}
                </Surface>
            ) : (
                <Surface variant="outline" padding="xl" style={{ alignItems: 'center', borderStyle: 'dashed' }}>
                    <Ionicons name="camera-outline" size={48} color={colors.textoTerciario} />
                    <Text variant="body" color={colors.textoSecundario} style={{ marginTop: TOKENS.spacing.sm, textAlign: 'center' }}>
                        Es necesario capturar una foto para confirmar la entrega.
                    </Text>
                    <Button 
                        label="Tomar Fotografía"
                        variant="secondary"
                        style={{ marginTop: TOKENS.spacing.lg }}
                        icon={<Ionicons name="camera" size={18} color={colors.primario} />}
                        onPress={handleAbrirCamara}
                    />
                </Surface>
            )}
        </>
    ));

    // ─── Vista principal ──────────────────────────────────────────────────────

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
                    <Text variant="h2" weight="bold">Panel Tienda</Text>
                    <Text variant="small" color={colors.textoSecundario}>Recepción y Entrega POD</Text>
                </View>
                <Button 
                    label="Escanear"
                    variant="secondary"
                    size="sm"
                    icon={<Ionicons name="qr-code-outline" size={18} color={colors.primario} />}
                    onPress={handleAbrirEscaner}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Sin envio cargado */}
                {!envio && (
                    <Surface variant="flat" padding="xxl" style={styles.placeholderCard}>
                        <Ionicons name="cube-outline" size={64} color={colors.textoTerciario} />
                        <Text variant="h3" weight="bold" style={{ marginTop: TOKENS.spacing.md }}>
                            Sin envío cargado
                        </Text>
                        <Text variant="body" align="center" color={colors.textoSecundario} style={{ marginTop: TOKENS.spacing.sm }}>
                            Escanea el QR del envío o selecciónalo desde el Panel de Picking.
                        </Text>
                        <Button 
                            label="Escanear QR"
                            variant="primary"
                            style={{ marginTop: TOKENS.spacing.xl, width: '100%' }}
                            icon={<Ionicons name="qr-code-outline" size={18} color="#FFF" />}
                            onPress={handleAbrirEscaner}
                        />
                    </Surface>
                )}

                {/* Datos del envio */}
                {envio && (
                    <>
                        <OrderDetailsCard item={envio} />
                        
                        <PODEvidenceSection 
                            uri={fotoUri} 
                            isDelivered={envio.estado === 'Entregado'} 
                        />

                        {/* Botón Final */}
                        <Button 
                            label={procesando ? "Guardando..." : "Confirmar Entrega"}
                            variant="primary"
                            loading={procesando}
                            disabled={!fotoUri || envio.estado === 'Entregado'}
                            style={{ marginTop: TOKENS.spacing.xxl, marginBottom: TOKENS.spacing.huge }}
                            onPress={handleConfirmarEntrega}
                            icon={!procesando && <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
                        />

                        {envio.estado === 'Entregado' && (
                            <Surface variant="flat" padding="md" style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0a1f12' : '#f0fdf4', marginBottom: TOKENS.spacing.xl }}>
                                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                                <Text variant="body" weight="bold" color="#22c55e" style={{ marginLeft: 8 }}>
                                    Envío entregado con éxito
                                </Text>
                            </Surface>
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
        elevation: 2,
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
        elevation: 2,
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
        borderColor: '#4ba042', // primario Notion
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
        backgroundColor: '#f6f5f4', // superficieAlta
        alignItems: 'center',
        justifyContent: 'center',
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
