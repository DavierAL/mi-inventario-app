// ARCHIVO: src/screens/ScannerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { EditProductoModal } from '../../inventory/components/EditProductoModal';
import { precargarSonidos, reproducirSonido } from '../../../core/utils/sonidos';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../core/types/navigation';
import { useInventarioStore } from '../../inventory/store/useInventarioStore';
import { useTheme } from '../../../core/ui/ThemeContext';
import { MENSAJES } from '../../../core/constants/mensajes';

import { database } from '../../../core/database';
import { Q } from '@nozbe/watermelondb';
import Producto from '../../../core/database/models/Producto';

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export const ScannerScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<ScannerNavProp>();
    const { 
        setProductoEditando, productoEditando, 
        guardarEdicion 
    } = useInventarioStore();
    
    const [procesandoEscaneo, setProcesandoEscaneo] = useState<boolean>(false);

    useEffect(() => {
        // Precargar sonidos cuando se abre el escáner
        precargarSonidos();
        
        if (productoEditando === null && procesandoEscaneo) {
            const timer = setTimeout(() => setProcesandoEscaneo(false), 500);
            return () => clearTimeout(timer);
        }
    }, [productoEditando]);

    const reproducirBeep = async (exito: boolean) => {
        try {
            if (exito) {
                reproducirSonido('beep');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                reproducirSonido('error');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error) {
            console.log("Audio/Haptic no soportado", error);
        }
    };

    const handleGuardar = async (fv: string, fecha: string, com: string) => {
        const res = await guardarEdicion(fv, fecha, com);
        
        if (res.exito) {
            reproducirSonido('success');
            Toast.show({
                type: 'success',
                text1: MENSAJES.EXITO_GUARDADO,
                text2: MENSAJES.EXITO_GUARDADO_SUB(res.codigo || ''),
                visibilityTime: 2500
            });
        } else {
            reproducirSonido('error');
            Toast.show({ 
                type: 'error', 
                text1: MENSAJES.ERROR_GUARDADO, 
                text2: res.mensajeError || 'No se pudo guardar en la nube.' 
            });
        }
    };

    const manejarCodigoEscaneado = async ({ data }: { data: string }) => {
        if (procesandoEscaneo) return;
        setProcesandoEscaneo(true);

        const codigoLimpio = String(data).trim();

        try {
            // Tarea 3.4.2: Búsqueda asíncrona en SQLite
            const productosEncontrados = await database.collections.get<Producto>('productos')
                .query(Q.where('cod_barras', Q.eq(codigoLimpio)))
                .fetch();
            
            const productoEncontrado = productosEncontrados.length > 0 ? productosEncontrados[0] : null;

            if (productoEncontrado) {
                reproducirBeep(true);
                // MODO NORMAL: Abrimos Modal
                setProductoEditando(productoEncontrado);
            } else {
                reproducirBeep(false);
                Toast.show({
                    type: 'error',
                    text1: MENSAJES.ERROR_NO_ENCONTRADO,
                    text2: MENSAJES.ERROR_NO_ENCONTRADO_SUB(codigoLimpio),
                    position: 'top',
                    visibilityTime: 3000,
                });
                setTimeout(() => setProcesandoEscaneo(false), 1500);
            }
        } catch (error) {
            console.error('[Scanner] Error en búsqueda local:', error);
            setProcesandoEscaneo(false);
        }
    };

    return (
        <View style={styles.contenedor}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={manejarCodigoEscaneado}
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'code128'],
                }}
            />

            <View style={styles.capa}>
                <Text style={styles.textoInfo}>
                    {MENSAJES.ALINEA_CODIGO}
                </Text>

                <View style={styles.marco}>
                    <View style={[styles.esquina, styles.esquinaTL, {borderColor: colors.primario}]} />
                    <View style={[styles.esquina, styles.esquinaTR, {borderColor: colors.primario}]} />
                    <View style={[styles.esquina, styles.esquinaBL, {borderColor: colors.primario}]} />
                    <View style={[styles.esquina, styles.esquinaBR, {borderColor: colors.primario}]} />
                </View>

                {/* Último Escaneado Mini Resumen - Eliminado Ráfaga */}
                <View style={{ height: 40 }} />

                {/* Botón Flotante para Cancelar */}
                <TouchableOpacity 
                    style={styles.botonCancelarCerrar} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.textoBotonCancelar}>{MENSAJES.TERMINAR_LOTE}</Text>
                </TouchableOpacity>
            </View>

            <EditProductoModal
                visible={productoEditando !== null}
                producto={productoEditando}
                onGuardar={handleGuardar}
                onCancelar={() => setProductoEditando(null)}
            />
        </View>
    );
};

const ESQUINA_SIZE = 40;
const ESQUINA_GROSOR = 4;

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#000' },
    capa: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 80,
    },
    textoInfo: {
        color: '#FFF', fontSize: 16, fontWeight: '700',
        backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 24, overflow: 'hidden',
    },
    marco: { width: 280, height: 180, position: 'relative' },
    esquina: { position: 'absolute', width: ESQUINA_SIZE, height: ESQUINA_SIZE, borderColor: '#63B3ED' },
    esquinaTL: { top: 0, left: 0, borderTopWidth: ESQUINA_GROSOR, borderLeftWidth: ESQUINA_GROSOR, borderTopLeftRadius: 10 },
    esquinaTR: { top: 0, right: 0, borderTopWidth: ESQUINA_GROSOR, borderRightWidth: ESQUINA_GROSOR, borderTopRightRadius: 10 },
    esquinaBL: { bottom: 0, left: 0, borderBottomWidth: ESQUINA_GROSOR, borderLeftWidth: ESQUINA_GROSOR, borderBottomLeftRadius: 10 },
    esquinaBR: { bottom: 0, right: 0, borderBottomWidth: ESQUINA_GROSOR, borderRightWidth: ESQUINA_GROSOR, borderBottomRightRadius: 10 },
    botonCancelarCerrar: {
        backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 40
    },
    textoBotonCancelar: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});

