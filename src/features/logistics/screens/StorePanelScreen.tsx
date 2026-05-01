// ARCHIVO: src/features/logistics/screens/StorePanelScreen.tsx
/**
 * StorePanelScreen — Panel de la tienda para recepcionar Envios.
 * Diseño: Notion Design System — dark-mode-first, warm charcoal surfaces, whisper borders.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Alert, Modal, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeInDown, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Envio, { EstadoPedido } from '../../../core/database/models/Envio';
import { LogisticaHistorialRepository } from '../repository/logisticaHistorialRepository';
import { LogisticsRepository } from '../repository/logisticsRepository';
import { QueueActions } from '../../../core/services/queue';
import { BottomBar, TabActivo } from '../../../core/ui/BottomBar';
import { useTheme } from '../../../core/ui/ThemeContext';
import { RootStackParamList } from '../../../core/types/navigation';
import { useNetworkStatus } from '../../../core/utils/useNetworkStatus';
import { useLogisticsSync } from '../hooks/useLogisticsSync';
import { Text, Surface, Button, Badge, AnimatedPressable as TouchableOpacity } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';
import { Logger } from '../../../core/services/LoggerService';
import { ErrorService } from '../../../core/services/ErrorService';
import { validateData, EnvioSchema } from '../../../core/validation/schemas';
import { EnviosService } from '../services/enviosService';
import { usePermissions } from '../../../core/hooks/usePermissions';


type StorePanelNavProp = NativeStackNavigationProp<RootStackParamList, 'StorePanel'>;
type StorePanelRoute = RouteProp<RootStackParamList, 'StorePanel'>;

// ─── Componente principal ─────────────────────────────────────────────────────

export const StorePanelScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<StorePanelNavProp>();
    const route = useRoute<StorePanelRoute>();
    const { isOnline } = useNetworkStatus();
    const { cargando: syncCargando } = useLogisticsSync();
    const { role } = usePermissions();

    const esOperadorPermitido = (operador?: string) => {
        if (!role || role === 'admin' || role === 'atencion') return true;
        const op = operador || '';
        if (role === 'logistica') return op === 'Salva';
        if (role === 'tienda') return ['Tienda', 'Yango', 'Cabify'].includes(op);
        return true;
    };

    const [permisoCamera, pedirPermiso] = useCameraPermissions();
    const [envio, setEnvio] = useState<Envio | null>(null);
    const [modoEscaner, setModoEscaner] = useState(false);
    const [modoFoto, setModoFoto] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [fotoUri, setFotoUri] = useState<string | null>(null);
    const [qrEscaneado, setQrEscaneado] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
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
            if (!esOperadorPermitido(p.operador)) {
                Toast.show({ type: 'error', text1: 'Acceso restringido', text2: 'Este pedido no pertenece a tu operador' });
                navigation.goBack();
                return;
            }
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
                const p = results[0];
                if (!esOperadorPermitido(p.operador)) {
                    Toast.show({ type: 'error', text1: 'Acceso restringido', text2: 'Este pedido no pertenece a tu operador' });
                    return;
                }
                setFotoUri(null); // Reset photo for new order
                setEnvio(p);
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
                [{ resize: { width: 800 } }], // Reducido para asegurar peso < 100kb
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
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
        } catch (e: unknown) {
            const err = e as Error;
            console.error('[POD Camera Error]:', err.message);
            Toast.show({ type: 'error', text1: 'Error al capturar foto', text2: err.message || 'Intenta de nuevo' });
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

            // PASO 1: Subir foto a Supabase Storage
            Toast.show({ type: 'info', text1: 'Subiendo evidencia...' });
            const podUrl = await EnviosService.subirFotoPOD(fotoUri, envio.codPedido);

            // PASO 2: Actualizar WatermelonDB local (optimistic update para UI y Sync)
            const estadoAnterior = envio.estado;
            await database.write(async () => {
                await envio.update((p) => {
                    p.estado = 'Entregado';
                    p.podLocalUri = fotoUri;
                    if (podUrl) {
                        p.urlFoto = podUrl;
                        p.podUrl = podUrl;
                    }
                });
            });

            // Registrar en historial local
            await LogisticaHistorialRepository.registrarCambio({
                envioId: envio.id,
                codPedido: envio.codPedido,
                estadoAnterior,
                estadoNuevo: 'Entregado',
                rolUsuario: role || undefined
            });

            const supabaseId = envio.supabaseId || envio.id; // Uso fallback a id si supabaseId es vacío

            if (podUrl) {
                // PASO 3: Notificar Google Sheets (no-bloqueante)
                // Se confía en que WatermelonDB suba el registro, pero enviamos el webhook con los datos para evitar lectura desactualizada
                EnviosService.notificarSheets(supabaseId, {
                    cod_pedido: envio.codPedido,
                    estado: 'Entregado',
                    url_foto: podUrl
                }).catch(() => {});

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                // --- MEJORA VISUAL: Mostrar overlay de éxito antes de salir ---
                setShowSuccess(true);
                setTimeout(() => {
                    navigation.goBack();
                }, 2000);
                
                Logger.info('[StorePanel] Entrega confirmada exitosamente', {
                    pedidoId: envio.id,
                });
            } else {
                // Fallback: sin conexión o error en Supabase Storage
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
                
                navigation.goBack();
            }

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
                <Surface style={[styles.modalFull, { backgroundColor: colors.absolutoNegro }]}>
                    <CameraView
                        style={styles.cameraFull}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={handleQrEscaneado}
                    />
                    <SafeAreaView style={styles.escanerOverlay}>
                        <View style={[styles.escanerMarco, { borderColor: colors.absolutoBlanco }]} />
                        <Text style={[styles.escanerHint, { color: colors.absolutoBlanco }]}>Apunta al QR del envio</Text>
                        <TouchableOpacity
                            style={styles.escanerCerrar}
                            onPress={() => setModoEscaner(false)}
                        >
                            <Ionicons name="close-circle" size={48} color={colors.absolutoBlanco} />
                        </TouchableOpacity>
                    </SafeAreaView>
                </Surface>
            </Modal>
        );
    }

    // ─── Modal cámara POD ─────────────────────────────────────────────────────

    if (modoFoto) {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setModoFoto(false)}>
                <Surface style={[styles.modalFull, { backgroundColor: colors.absolutoNegro }]}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.cameraFull}
                        facing="back"
                        onCameraReady={() => setIsCameraReady(true)}
                    />
                    <SafeAreaView style={styles.camaraOverlay}>
                        <TouchableOpacity style={styles.camaraCerrar} onPress={() => setModoFoto(false)}>
                            <Ionicons name="close-circle" size={44} color={colors.absolutoBlanco} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.camaraDisparador,
                                { backgroundColor: colors.superficieAlta },
                                !isCameraReady && styles.disabledOpacity,
                            ]}
                            onPress={handleCapturarFoto}
                            disabled={procesando || !isCameraReady}
                        >
                            {procesando
                                ? <ActivityIndicator color={colors.primario} />
                                : <Ionicons name="camera" size={36} color={colors.primario} />
                            }
                        </TouchableOpacity>
                        <Text style={[styles.camaraHint, { color: colors.absolutoBlanco }]}>
                            {isCameraReady ? 'Fotografía la evidencia de entrega' : 'Iniciando cámara...'}
                        </Text>
                    </SafeAreaView>
                </Surface>
            </Modal>
        );
    }

    // ─── Vista principal ──────────────────────────────────────────────────────

    // ─── Componentes Memoizados ──────────────────────────────────────────────
    
    const OrderDetailsCard = React.memo(({ item }: { item: Envio }) => (
        <Animated.View entering={FadeInDown.springify().damping(15)}>
            <Surface variant="elevated" padding="lg" style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.flex1}>
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
                    <View style={styles.infoCol}>
                        <Text variant="tiny" weight="bold" color={colors.textoTerciario}>CLIENTE</Text>
                        <Text variant="body" weight="medium">{item.cliente}</Text>
                        {!!item.telefono && (
                            <TouchableOpacity 
                                onPress={() => Linking.openURL(`tel:${item.telefono}`)}
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, paddingVertical: 4 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityLabel={`Llamar al cliente al teléfono ${item.telefono}`}
                                accessibilityRole="button"
                            >
                                <Ionicons name="call-outline" size={12} color={colors.primario} />
                                <Text variant="small" weight="bold" color={colors.primario} style={{ marginLeft: 4 }}>
                                    {item.telefono}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {(item.direccion || item.distrito) && (
                    <View style={[styles.infoRow, { marginTop: TOKENS.spacing.md }]}>
                        <Ionicons name="location-outline" size={16} color={colors.textoTerciario} />
                        <View style={styles.infoCol}>
                            <Text variant="tiny" weight="bold" color={colors.textoTerciario}>DIRECCIÓN</Text>
                            <Text variant="body">
                                {item.direccion}{item.distrito ? `, ${item.distrito}` : ''}
                            </Text>
                            {!!item.referencia && (
                                <Text variant="small" color={colors.textoSecundario} style={styles.marginTop2}>
                                    Ref: {item.referencia}
                                </Text>
                            )}
                            {!!item.gmapsUrl && (
                                <TouchableOpacity 
                                    style={[styles.gmapsBtn, { paddingVertical: 4 }]} 
                                    onPress={handleAbrirGmaps}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    accessibilityLabel="Ver ubicación en Google Maps"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="map-outline" size={14} color={colors.primario} />
                                    <Text variant="small" weight="bold" color={colors.primario} style={styles.marginLeft4}>
                                        Ver en Google Maps
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {!!item.operador && (
                    <View style={[styles.infoRow, { marginTop: TOKENS.spacing.md }]}>
                        <Ionicons name="bicycle-outline" size={16} color={colors.textoTerciario} />
                        <View style={styles.marginLeft12}>
                            <Text variant="tiny" weight="bold" color={colors.textoTerciario}>OPERADOR</Text>
                            <Badge 
                                label={item.operador}
                                variant={item.operador === 'Salva' ? 'primary' : 'success'}
                                style={{ marginTop: 2 }}
                            />
                        </View>
                    </View>
                )}

                {(item.aPagar !== undefined || item.formaPago) && (
                    <View style={[styles.infoRow, { marginTop: TOKENS.spacing.md }]}>
                        <Ionicons name="cash-outline" size={16} color={colors.textoTerciario} />
                        <View style={styles.marginLeft12}>
                            <Text variant="tiny" weight="bold" color={colors.textoTerciario}>PAGO Y COBRO</Text>
                            <Text variant="body" weight="bold">
                                {item.aPagar && item.aPagar > 0 ? `S/ ${item.aPagar.toFixed(2)}` : 'S/ 0.00'}
                                <Text variant="small" color={colors.textoSecundario}> ({item.formaPago || 'Sin especificar'})</Text>
                            </Text>
                        </View>
                    </View>
                )}

                {!!item.notas && (
                    <>
                        <View style={[styles.divider, { backgroundColor: colors.borde }]} />
                        <Text variant="tiny" weight="bold" color={colors.textoTerciario}>NOTAS</Text>
                        <Text variant="small" color={colors.textoSecundario} style={styles.marginTop4}>
                            {item.notas}
                        </Text>
                    </>
                )}
            </Surface>
        </Animated.View>
    ));

    const PODEvidenceSection = React.memo(({ uri, isDelivered }: { uri: string | null, isDelivered: boolean }) => (
        <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text variant="h3" weight="bold" style={styles.podTitulo}>
                Evidencia de Entrega (POD)
            </Text>

            {uri ? (
                <Surface variant="elevated" padding="lg" style={styles.podCard}>
                    <View style={[styles.fotoCheck, { backgroundColor: colors.fondoPrimario }]}>
                        <Ionicons name="checkmark-circle" size={32} color={colors.exito} />
                    </View>
                    <View style={styles.podInfo}>
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
                <Surface variant="outline" padding="xl" style={styles.podPlaceholder}>
                    <Ionicons name="camera-outline" size={48} color={colors.textoTerciario} />
                    <Text variant="body" color={colors.textoSecundario} style={styles.podText}>
                        Es necesario capturar una foto para confirmar la entrega.
                    </Text>
                    <Button 
                        label="Tomar Fotografía"
                        variant="secondary"
                        style={[styles.marginTopLg, { borderStyle: 'dashed' }]}
                        icon={<Ionicons name="camera" size={18} color={colors.primario} />}
                        onPress={handleAbrirCamara}
                    />
                </Surface>
            )}
        </Animated.View>
    ));

    const SuccessOverlay = () => (
        <Animated.View 
            entering={FadeIn} 
            exiting={FadeOut}
            style={[StyleSheet.absoluteFill, styles.successOverlay, { backgroundColor: colors.fondo + 'E6' }]}
        >
            <Animated.View entering={ZoomIn.delay(200)} style={styles.successContainer}>
                <View style={[styles.successCircle, { backgroundColor: colors.fondoPrimario }]}>
                    <Ionicons name="checkmark" size={80} color={colors.exito} />
                </View>
                <Text variant="h1" weight="bold" style={styles.successTitle}>¡Entregado!</Text>
                <Text variant="body" color={colors.textoSecundario} align="center">
                    El envío {envio?.codPedido} ha sido registrado con éxito.
                </Text>
            </Animated.View>
        </Animated.View>
    );

    // ─── Vista principal ──────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.fondo }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.fondo}
            />

            {/* Cabecera */}
            <Surface 
                variant="flat" 
                style={[styles.cabecera, { borderBottomColor: colors.borde }]}
            >
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    accessibilityLabel="Volver a la pantalla anterior"
                    accessibilityRole="button"
                >
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
                    accessibilityLabel="Escanear código QR de envío"
                />
            </Surface>

            <ScrollView contentContainerStyle={styles.scroll}>

                {/* Sin envio cargado */}
                {!envio && (
                    <Surface variant="flat" padding="xxl" style={styles.placeholderCard}>
                        <Ionicons name="cube-outline" size={64} color={colors.textoTerciario} />
                        <Text variant="h3" weight="bold" style={styles.marginTopMd}>
                            Sin envío cargado
                        </Text>
                        <Text variant="body" align="center" color={colors.textoSecundario} style={styles.marginTopSm}>
                            Escanea el QR del envío o selecciónalo desde el Panel de Picking.
                        </Text>
                        <Button 
                            label="Escanear QR"
                            variant="primary"
                            style={styles.escanerBtnFull}
                            icon={<Ionicons name="qr-code-outline" size={18} color={colors.superficie} />}
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
                            style={styles.confirmBtn}
                            onPress={handleConfirmarEntrega}
                            icon={!procesando && (
                                <Ionicons 
                                    name="checkmark-circle-outline" 
                                    size={20} 
                                    color={!fotoUri || envio.estado === 'Entregado' ? colors.textoTerciario : colors.absolutoBlanco} 
                                />
                            )}
                        />

                        {envio.estado === 'Entregado' && (
                            <Surface variant="flat" padding="md" style={styles.successBanner}>
                                <Ionicons name="checkmark-circle" size={24} color={colors.exito} />
                                <Text variant="body" weight="bold" color={colors.exito} style={styles.marginLeft8}>
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
                    if (tab === 'historial') navigation.navigate('LogisticsHistory');
                    if (tab === 'escaner') navigation.navigate('Scanner');
                    if (tab === 'logistica') navigation.navigate('PickingList');
                }}
            />

            {showSuccess && <SuccessOverlay />}
        </SafeAreaView>
    );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    flex1: { flex: 1 },
    marginLeft12: { marginLeft: 12 },
    marginLeft4: { marginLeft: 4 },
    marginLeft8: { marginLeft: 8 },
    marginTop2: { marginTop: 2 },
    marginTop4: { marginTop: 4 },
    marginTopMd: { marginTop: TOKENS.spacing.md },
    marginTopSm: { marginTop: TOKENS.spacing.sm },
    marginTopLg: { marginTop: TOKENS.spacing.lg },
    infoCol: { marginLeft: 12, flex: 1 },
    gmapsBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
    podTitulo: { marginTop: TOKENS.spacing.xl, marginBottom: TOKENS.spacing.sm },
    podCard: { flexDirection: 'row', alignItems: 'center' },
    podInfo: { flex: 1, marginLeft: TOKENS.spacing.md },
    podPlaceholder: { alignItems: 'center', borderStyle: 'dashed' },
    podText: { marginTop: TOKENS.spacing.sm, textAlign: 'center' },
    escanerBtnFull: { marginTop: TOKENS.spacing.xl, width: '100%' },
    confirmBtn: { marginTop: TOKENS.spacing.xxl, marginBottom: TOKENS.spacing.huge },
    successBanner: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'transparent', // Se sobreescribe con el fondoPrimario dinámico en el componente
        marginBottom: TOKENS.spacing.xl 
    },
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemCantidadText: {
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
    },
    escanerHint: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    modalFull: { flex: 1 },
    cameraFull: { flex: 1 },
    disabledOpacity: { opacity: 0.4 },
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
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
    },
    camaraHint: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    // --- Estilos de Éxito Premium ---
    successOverlay: {
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successContainer: {
        alignItems: 'center',
        padding: TOKENS.spacing.xl,
        width: '80%',
    },
    successCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: TOKENS.spacing.xl,
    },
    successTitle: {
        marginBottom: TOKENS.spacing.sm,
    },
});
