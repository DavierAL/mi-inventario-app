// ARCHIVO: src/components/ProductoCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ProductoInventario } from '../types/inventario';
import { formatearFecha } from '../utils/fecha';
import { formatearPrecio } from '../utils/formato';
import { useTheme } from '../context/ThemeContext';

interface Props {
    item: ProductoInventario;
    onPress: (producto: ProductoInventario) => void;
}

export const ProductoCard: React.FC<Props> = ({ item, onPress }) => {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.tarjetaProducto, { backgroundColor: colors.superficie }]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            {/* Imagen del producto */}
            <View style={[styles.contenedorImagen, { backgroundColor: colors.inputFondo, borderColor: colors.borde }]}>
                {item.Imagen ? (
                    <Image
                        source={{ uri: String(item.Imagen) }}
                        style={styles.imagenProducto}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={[styles.imagenPlaceholder, { backgroundColor: colors.inputDeshabilitado }]}>
                        <Text style={styles.imagenPlaceholderIcono}>📦</Text>
                    </View>
                )}
            </View>
            
            <View style={styles.infoPrincipal}>
                <Text style={[styles.textoSKU, { color: colors.primario }]}>{item.SKU}</Text>
                <Text style={[styles.textoDescripcion, { color: colors.textoPrincipal }]} numberOfLines={2}>{item.Descripcion}</Text>
                <Text style={[styles.textoCodigoBarras, { color: colors.textoSecundario }]}>Cód: {item.Cod_Barras}</Text>
                {item.FV_Actual ? (
                    <Text style={[styles.textoFV, { color: colors.error }]}>FV: {formatearFecha(item.FV_Actual)}</Text>
                ) : null}
            </View>

            {/* Panel lateral: Precios y Stock */}
            <View style={[styles.infoPrecios, { borderLeftColor: colors.borde }]}>
                <View style={styles.filaPrecio}>
                    <Text style={[styles.textoPrecioTitulo, { color: colors.textoSecundario }]}>Web</Text>
                    <Text style={[styles.textoPrecioNumero, { color: colors.textoPrincipal }]}>{formatearPrecio(item.Precio_Web)}</Text>
                </View>
                <View style={styles.filaPrecio}>
                    <Text style={[styles.textoPrecioTitulo, { color: colors.textoSecundario }]}>P. Tienda</Text>
                    <Text style={[styles.textoPrecioNumero, { color: colors.primario }]}>{formatearPrecio(item.Precio_Tienda)}</Text>
                </View>
                <View style={[styles.filaStock, { backgroundColor: colors.fondoPrimario }]}>
                    <Text style={[styles.textoStockTitulo, { color: colors.textoSecundario }]}>Stock</Text>
                    <Text style={[styles.textoStockNumero, { color: colors.exito }]}>{item.Stock_Master}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    tarjetaProducto: {
        marginHorizontal: 15,
        marginBottom: 12,
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    contenedorImagen: {
        width: 62,
        height: 62,
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
    },
    imagenProducto: {
        width: '100%',
        height: '100%',
    },
    imagenPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagenPlaceholderIcono: {
        fontSize: 24,
    },
    infoPrincipal: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 10,
    },
    textoSKU: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    textoDescripcion: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    textoCodigoBarras: {
        fontSize: 11,
        fontFamily: 'monospace',
        marginTop: 4,
    },
    textoFV: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    infoPrecios: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingLeft: 10,
        borderLeftWidth: 1,
        minWidth: 85,
    },
    filaPrecio: {
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    textoPrecioTitulo: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    textoPrecioNumero: {
        fontSize: 13,
        fontWeight: '700',
    },
    filaStock: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignItems: 'center',
        width: '100%',
    },
    textoStockTitulo: {
        fontSize: 9,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    textoStockNumero: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: -2,
    },
});
