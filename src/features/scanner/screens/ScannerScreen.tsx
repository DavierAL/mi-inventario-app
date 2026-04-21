// ARCHIVO: src/features/scanner/screens/ScannerScreen.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../core/types/navigation';
import { useTheme } from '../../../core/ui/ThemeContext';
import { MENSAJES } from '../../../core/constants/mensajes';
import { EditProductoModal } from '../../inventory';
import { useScanner } from '../';
import { Text, Button, Surface } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;

export const ScannerScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<ScannerNavProp>();
    const { 
        procesandoEscaneo, 
        productoEditando, 
        setProductoEditando, 
        manejarCodigoEscaneado, 
        handleGuardarCambios 
    } = useScanner();

    return (
        <View style={styles.contenedor}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={manejarCodigoEscaneado}
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
                }}
            />

            <View style={styles.capa}>
                <Surface variant="flat" padding="lg" radius="full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <Text variant="body" weight="bold" color="#FFF">
                        {MENSAJES.ALINEA_CODIGO}
                    </Text>
                </Surface>

                <View style={styles.marco}>
                    <View style={[styles.esquina, styles.esquinaTL, { borderColor: colors.primario }]} />
                    <View style={[styles.esquina, styles.esquinaTR, { borderColor: colors.primario }]} />
                    <View style={[styles.esquina, styles.esquinaBL, { borderColor: colors.primario }]} />
                    <View style={[styles.esquina, styles.esquinaBR, { borderColor: colors.primario }]} />
                </View>

                <Button 
                    label={MENSAJES.TERMINAR_LOTE}
                    variant="secondary"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
                    onPress={() => navigation.goBack()}
                />
            </View>

            <EditProductoModal
                visible={productoEditando !== null}
                producto={productoEditando}
                onGuardar={async (fv, fecha, com) => {
                    await handleGuardarCambios(fv, fecha, com);
                }}
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
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 80,
    },
    marco: { width: 280, height: 180, position: 'relative' },
    esquina: { position: 'absolute', width: ESQUINA_SIZE, height: ESQUINA_SIZE },
    esquinaTL: { top: 0, left: 0, borderTopWidth: ESQUINA_GROSOR, borderLeftWidth: ESQUINA_GROSOR, borderTopLeftRadius: 10 },
    esquinaTR: { top: 0, right: 0, borderTopWidth: ESQUINA_GROSOR, borderRightWidth: ESQUINA_GROSOR, borderTopRightRadius: 10 },
    esquinaBL: { bottom: 0, left: 0, borderBottomWidth: ESQUINA_GROSOR, borderLeftWidth: ESQUINA_GROSOR, borderBottomLeftRadius: 10 },
    esquinaBR: { bottom: 0, right: 0, borderBottomWidth: ESQUINA_GROSOR, borderRightWidth: ESQUINA_GROSOR, borderBottomRightRadius: 10 },
});
