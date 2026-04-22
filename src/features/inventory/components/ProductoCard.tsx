// ARCHIVO: src/features/inventory/components/ProductoCard.tsx

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Producto from '../../../core/database/models/Producto';
import { formatearFecha } from '../../../core/utils/fecha';
import { formatearPrecio } from '../../../core/utils/formato';
import { useTheme } from '../../../core/ui/ThemeContext';

import { Text, Surface, Badge } from '../../../core/ui/components';
import { TOKENS } from '../../../core/ui/tokens';
import { SHADOWS } from '../../../core/ui/shadows';

interface Props {
    item: Producto;
    onPress: (producto: Producto) => void;
}

const ProductoCardComponent: React.FC<Props> = ({ item, onPress }) => {
    const { colors } = useTheme();

    return (
        <Surface 
            variant="elevated" 
            style={styles.tarjetaProducto} 
            padding="md"
        >
            <TouchableOpacity
                onPress={() => onPress(item)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center' }}
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
                            <Text variant="h2">📦</Text>
                        </View>
                    )}
                </View>
            
                <View style={styles.infoPrincipal}>
                    <Text variant="tiny" weight="bold" color={colors.primario}>{item.sku}</Text>
                    <Text variant="small" weight="bold" color={colors.textoSecundario} style={{ opacity: 0.7 }}>
                        {item.marca.toUpperCase()}
                    </Text>
                    <Text variant="body" weight="bold" numberOfLines={2}>{item.descripcion}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text variant="tiny" color={colors.textoTerciario} style={{ fontFamily: 'monospace' }}>
                            {item.codBarras}
                        </Text>
                        {item.fvActualTs && (
                            <Badge 
                                label={`FV: ${formatearFecha(item.fvActualTs)}`}
                                variant="error"
                                style={{ marginLeft: 8 }}
                            />
                        )}
                    </View>
                </View>

                {/* Panel lateral: Stock */}
                <View style={[styles.infoPrecios, { borderLeftColor: colors.borde }]}>
                    <Text variant="tiny" weight="bold" color={colors.textoSecundario}>STOCK</Text>
                    <Text 
                        variant="h1" 
                        weight="bold" 
                        color={item.stockMaster > 0 ? colors.exito : colors.error}
                    >
                        {item.stockMaster}
                    </Text>
                    <Text variant="tiny" color={colors.textoTerciario}>UNIDADES</Text>
                </View>
            </TouchableOpacity>
        </Surface>
    );
};

export const ProductoCard = memo(ProductoCardComponent, (prevProps, nextProps) => {
    // Rendimiento Extremo: Solo redibujar si cambiaron estas propiedades clave
    return (
        prevProps.item.fvActualTs === nextProps.item.fvActualTs &&
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
        ...SHADOWS.CARD,
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
