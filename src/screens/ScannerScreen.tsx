// ARCHIVO: src/screens/ScannerScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useInventarioStore } from '../store/useInventarioStore';

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export const ScannerScreen = () => {
    const navigation = useNavigation<ScannerNavProp>();
    const inventario = useInventarioStore(state => state.inventario);
    const setProductoEditando = useInventarioStore(state => state.setProductoEditando);
    
    const [procesandoEscaneo, setProcesandoEscaneo] = useState<boolean>(false);

    const reproducirBeep = async (exito: boolean) => {
        try {
            if (exito) {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
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
            setProductoEditando(productoEncontrado);
            navigation.goBack(); // Cierra el escáner y vuelve a la lista, donde se abrirá el modal.
        } else {
            reproducirBeep(false);
            Alert.alert(
                'Producto no encontrado',
                `El código escaneado (${codigoLimpio}) no existe en tu base de datos actual.`,
                [{ text: 'Aceptar', onPress: () => setProcesandoEscaneo(false) }]
            );
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
                <Text style={styles.textoInfo}>Alinea el código en el centro</Text>

                <View style={styles.marco}>
                    <View style={[styles.esquina, styles.esquinaTL]} />
                    <View style={[styles.esquina, styles.esquinaTR]} />
                    <View style={[styles.esquina, styles.esquinaBL]} />
                    <View style={[styles.esquina, styles.esquinaBR]} />
                </View>

                {/* Botón Flotante para Cancelar */}
                <TouchableOpacity 
                    style={styles.botonCancelarCerrar} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.textoBotonCancelar}>✕ Cancelar</Text>
                </TouchableOpacity>
            </View>
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
