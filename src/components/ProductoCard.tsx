// ARCHIVO: src/components/ProductoCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProductoInventario } from '../types/inventario';

interface Props {
    item: ProductoInventario;
    onPress: (producto: ProductoInventario) => void;
}

export const ProductoCard: React.FC<Props> = ({ item, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.tarjetaProducto}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.infoPrincipal}>
                <Text style={styles.textoSKU}>{item.SKU}</Text>
                <Text style={styles.textoDescripcion} numberOfLines={2}>{item.Descripcion}</Text>
                <Text style={styles.textoCodigoBarras}>Cód: {item.Cod_Barras}</Text>
                {item.FV_Actual ? (
                    <Text style={styles.textoFV}>FV: {item.FV_Actual}</Text>
                ) : null}
                {item.Comentarios ? (
                    <Text style={styles.textoComentario} numberOfLines={1}>💬 {item.Comentarios}</Text>
                ) : null}
            </View>
            <View style={styles.infoStock}>
                <Text style={styles.textoStockTitulo}>Stock</Text>
                <Text style={styles.textoStockNumero}>{item.Stock_Master}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    tarjetaProducto: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 15,
        marginBottom: 12,
        padding: 18,
        borderRadius: 12,
        flexDirection: 'row',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    infoPrincipal: {
        flex: 1,
        justifyContent: 'center',
    },
    textoSKU: {
        fontSize: 13,
        color: '#3182CE',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    textoDescripcion: {
        fontSize: 16,
        color: '#2D3748',
        fontWeight: '600',
        lineHeight: 22,
    },
    textoCodigoBarras: {
        fontSize: 11,
        color: '#A0AEC0',
        fontFamily: 'monospace',
        marginTop: 4,
    },
    textoFV: {
        fontSize: 12,
        color: '#E53E3E',
        marginTop: 4,
        fontWeight: '600',
    },
    textoComentario: {
        fontSize: 12,
        color: '#718096',
        marginTop: 3,
        fontStyle: 'italic',
    },
    infoStock: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 18,
        borderLeftWidth: 1,
        borderLeftColor: '#EDF2F7',
        minWidth: 80,
    },
    textoStockTitulo: {
        fontSize: 11,
        color: '#A0AEC0',
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    textoStockNumero: {
        fontSize: 28,
        fontWeight: '900',
        color: '#38A169',
        marginTop: 2,
    },
});
