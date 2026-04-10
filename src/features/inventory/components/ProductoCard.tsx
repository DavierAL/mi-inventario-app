// ARCHIVO: src/features/inventory/components/ProductoCard.tsx

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Producto from '../../../core/database/models/Producto';
import { formatearFecha } from '../../../core/utils/fecha';
import { formatearPrecio } from '../../../core/utils/formato';
import { useTheme } from '../../../core/ui/ThemeContext';

interface Props {
    item: Producto;
    onPress: (producto: Producto) => void;
}

const ProductoCardComponent: React.FC<Props> = ({ item, onPress }) => {
    const { colors } = useTheme();

    return (
        <View>
            <TouchableOpacity
                style={[styles.tarjetaProducto, { backgroundColor: colors.superficie }]}
                onPress={() => onPress(item)}
                activeOpacity={0.7}
            >
                {/* Imagen del producto */}
                <View style={[styles.contenedorImagen, { backgroundColor: colors.inputFondo, borderColor: colors.borde }]}>
                    {item.imagen ? (
                        <Image
                            source={{ uri: String(item.imagen) }}
                            style={styles.imagenProducto}
                            contentFit="contain"
                            transition={200}
                            cachePolicy="disk"
                        />
                    ) : (
                        <View style={[styles.imagenPlaceholder, { backgroundColor: colors.inputDeshabilitado }]}>
                            <Text style={styles.imagenPlaceholderIcono}>📦</Text>
                        </View>
                    )}
                </View>
            
                <View style={styles.infoPrincipal}>
                    <Text style={[styles.textoSKU, { color: colors.primario }]}>{item.sku}</Text>
                    <Text style={[styles.textoMarca, { color: colors.textoSecundario }]}>{item.marca}</Text>
                    <Text style={[styles.textoDescripcion, { color: colors.textoPrincipal }]} numberOfLines={2}>{item.descripcion}</Text>
                    <Text style={[styles.textoCodigoBarras, { color: colors.textoSecundario }]}>Cód: {item.codBarras}</Text>
                    {item.fvActual ? (
                        <Text style={[styles.textoFV, { color: colors.error }]}>FV: {formatearFecha(item.fvActual)}</Text>
                    ) : null}
                </View>

                {/* Panel lateral: Precios y Stock */}
                <View style={[styles.infoPrecios, { borderLeftColor: colors.borde }]}>
                    <View style={styles.filaPrecio}>
                        <Text style={[styles.textoPrecioTitulo, { color: colors.textoSecundario }]}>Web</Text>
                        <Text style={[styles.textoPrecioNumero, { color: colors.textoPrincipal }]}>{formatearPrecio(item.precioWeb)}</Text>
                    </View>
                    <View style={styles.filaPrecio}>
                        <Text style={[styles.textoPrecioTitulo, { color: colors.textoSecundario }]}>P. Tienda</Text>
                        <Text style={[styles.textoPrecioNumero, { color: colors.primario }]}>{formatearPrecio(item.precioTienda)}</Text>
                    </View>
                    <View style={[styles.filaStock, { backgroundColor: colors.fondoPrimario }]}>
                        <Text style={[styles.textoStockTitulo, { color: colors.textoSecundario }]}>Stock</Text>
                        <Text style={[styles.textoStockNumero, { color: colors.exito }]}>{item.stockMaster}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export const ProductoCard = memo(ProductoCardComponent, (prevProps, nextProps) => {
    // Rendimiento Extremo: Solo redibujar si cambiaron estas propiedades clave
    return (
        prevProps.item.fvActual === nextProps.item.fvActual &&
        prevProps.item.stockMaster === nextProps.item.stockMaster &&
        prevProps.item.precioWeb === nextProps.item.precioWeb &&
        prevProps.item.precioTienda === nextProps.item.precioTienda &&
        prevProps.item.comentarios === nextProps.item.comentarios &&
        prevProps.item.marca === nextProps.item.marca
    );
});

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
        width: 80,
        height: 80,
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
    textoMarca: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        opacity: 0.7,
        marginBottom: 1
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
