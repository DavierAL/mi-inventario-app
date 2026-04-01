// ARCHIVO: src/screens/ScannerScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { ProductoInventario } from '../types/inventario';

interface Props {
    inventario: ProductoInventario[];
    onProductoEncontrado: (producto: ProductoInventario) => void;
    onCancelar: () => void;
}

export const ScannerScreen: React.FC<Props> = ({
    inventario,
    onProductoEncontrado,
    onCancelar,
}) => {
    // Previene que la cámara dispare múltiples lecturas del mismo código
    const [procesandoEscaneo, setProcesandoEscaneo] = useState<boolean>(false);

    const manejarCodigoEscaneado = ({ data }: { data: string }) => {
        if (procesandoEscaneo) return;
        setProcesandoEscaneo(true);

        const codigoLimpio = String(data).trim();

        const productoEncontrado = inventario.find(
            (p) => String(p.Cod_Barras).trim() === codigoLimpio
        );

        if (productoEncontrado) {
            onProductoEncontrado(productoEncontrado);
        } else {
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

            {/* Marco visual de guía */}
            <View style={styles.capa}>
                <Text style={styles.textoInfo}>Alinea el código en el centro</Text>

                <View style={styles.marco}>
                    <View style={[styles.esquina, styles.esquinaTL]} />
                    <View style={[styles.esquina, styles.esquinaTR]} />
                    <View style={[styles.esquina, styles.esquinaBL]} />
                    <View style={[styles.esquina, styles.esquinaBR]} />
                </View>

                <TouchableOpacity style={styles.botonCancelar} onPress={onCancelar}>
                    <Text style={styles.textoBoton}>✕ Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ESQUINA_SIZE = 24;
const ESQUINA_GROSOR = 3;

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#000',
    },
    capa: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 80,
    },
    textoInfo: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    // Marco con esquinas, estilo "visor de escáner"
    marco: {
        width: 220,
        height: 140,
        position: 'relative',
    },
    esquina: {
        position: 'absolute',
        width: ESQUINA_SIZE,
        height: ESQUINA_SIZE,
        borderColor: '#3182CE',
    },
    esquinaTL: {
        top: 0, left: 0,
        borderTopWidth: ESQUINA_GROSOR,
        borderLeftWidth: ESQUINA_GROSOR,
        borderTopLeftRadius: 4,
    },
    esquinaTR: {
        top: 0, right: 0,
        borderTopWidth: ESQUINA_GROSOR,
        borderRightWidth: ESQUINA_GROSOR,
        borderTopRightRadius: 4,
    },
    esquinaBL: {
        bottom: 0, left: 0,
        borderBottomWidth: ESQUINA_GROSOR,
        borderLeftWidth: ESQUINA_GROSOR,
        borderBottomLeftRadius: 4,
    },
    esquinaBR: {
        bottom: 0, right: 0,
        borderBottomWidth: ESQUINA_GROSOR,
        borderRightWidth: ESQUINA_GROSOR,
        borderBottomRightRadius: 4,
    },
    botonCancelar: {
        backgroundColor: '#E53E3E',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 12,
        elevation: 4,
    },
    textoBoton: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
