// ARCHIVO: src/screens/ScannerScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { EditProductoModal } from '../components/EditProductoModal';
import { precargarSonidos, reproducirSonido } from '../utils/sonidos';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useInventarioStore } from '../store/useInventarioStore';

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export const ScannerScreen = () => {
    const navigation = useNavigation<ScannerNavProp>();
    const { 
        inventario, setProductoEditando, productoEditando, 
        guardando, guardarEdicion, guardarEdicionDirecta 
    } = useInventarioStore();
    
    const [procesandoEscaneo, setProcesandoEscaneo] = useState<boolean>(false);
    const [modoRafaga, setModoRafaga] = useState<boolean>(false);
    const [ultimoEscaneado, setUltimoEscaneado] = useState<string | null>(null);

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

    const manejarCodigoEscaneado = ({ data }: { data: string }) => {
        if (procesandoEscaneo) return;
        setProcesandoEscaneo(true);

        const codigoLimpio = String(data).trim();
        const productoEncontrado = inventario.find(
            (p) => String(p.Cod_Barras).trim() === codigoLimpio
        );

        if (productoEncontrado) {
            reproducirBeep(true);
            
            if (modoRafaga) {
                // MODO RÁFAGA: Guardado silencioso de fondo, cámara no se detiene mucho
                guardarEdicionDirecta(productoEncontrado);
                setUltimoEscaneado(productoEncontrado.SKU || codigoLimpio);
                
                Toast.show({
                    type: 'success',
                    text1: '⚡ Ráfaga: Procesado',
                    text2: `${productoEncontrado.Descripcion}`,
                    position: 'top',
                    visibilityTime: 1200,
                });
                // En modo ráfaga, habilitamos el escáner rápido de nuevo
                setTimeout(() => setProcesandoEscaneo(false), 800);
            } else {
                // MODO NORMAL: Abrimos Modal
                setProductoEditando(productoEncontrado);
            }
        } else {
            reproducirBeep(false);
            Toast.show({
                type: 'error',
                text1: '❌ No encontrado',
                text2: `El código ${codigoLimpio} no existe en stock.`,
                position: 'top',
                visibilityTime: 3000,
            });
            setTimeout(() => setProcesandoEscaneo(false), 1500);
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
                {/* Selector de Modo */}
                <View style={styles.contenedorModos}>
                    <TouchableOpacity 
                        style={[styles.botonModo, !modoRafaga && styles.botonModoActivo]}
                        onPress={() => setModoRafaga(false)}
                    >
                        <Text style={[styles.textoModo, !modoRafaga && styles.textoModoActivo]}>Modo Edición</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.botonModo, modoRafaga && styles.botonModoActivo, modoRafaga && {backgroundColor: '#DD6B20'}]}
                        onPress={() => setModoRafaga(true)}
                    >
                        <Text style={[styles.textoModo, modoRafaga && styles.textoModoActivo]}>⚡ Ráfaga</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.textoInfo}>
                    {modoRafaga ? 'Alinea para marcaje rápido' : 'Alinea el código en el centro'}
                </Text>

                <View style={styles.marco}>
                    <View style={[styles.esquina, styles.esquinaTL, modoRafaga && {borderColor: '#DD6B20'}]} />
                    <View style={[styles.esquina, styles.esquinaTR, modoRafaga && {borderColor: '#DD6B20'}]} />
                    <View style={[styles.esquina, styles.esquinaBL, modoRafaga && {borderColor: '#DD6B20'}]} />
                    <View style={[styles.esquina, styles.esquinaBR, modoRafaga && {borderColor: '#DD6B20'}]} />
                </View>

                {/* Último Escaneado Mini Resumen */}
                <View style={{ height: 40, justifyContent: 'center' }}>
                    {modoRafaga && ultimoEscaneado && (
                        <Text style={{ color: '#48BB78', fontWeight: 'bold' }}>✓ {ultimoEscaneado}</Text>
                    )}
                </View>

                {/* Botón Flotante para Cancelar */}
                <TouchableOpacity 
                    style={styles.botonCancelarCerrar} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.textoBotonCancelar}>✕ Terminar Lote</Text>
                </TouchableOpacity>
            </View>

            <EditProductoModal
                visible={productoEditando !== null}
                producto={productoEditando}
                guardando={guardando}
                onGuardar={guardarEdicion}
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
    textoBotonCancelar: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    contenedorModos: {
        flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24, padding: 4, marginBottom: 20
    },
    botonModo: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20
    },
    botonModoActivo: {
        backgroundColor: '#3182CE'
    },
    textoModo: {
        color: '#A0AEC0', fontWeight: 'bold', fontSize: 14
    },
    textoModoActivo: {
        color: '#FFF'
    }
});
