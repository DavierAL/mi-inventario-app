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
                        {typeof item.fvActualTs === 'number' && (() => {
                            const fv = item.fvActualTs as number;
                            const nowTs = Date.now();
                            const diffDays = (fv - nowTs) / (1000 * 60 * 60 * 24);
                            if (diffDays < 0) return (
                                <Badge label="VENCIDO" variant="error" style={{ marginLeft: 8 }} />
                            );
                            if (diffDays < 90) return (
                                <Badge label={`Vence en ${Math.ceil(diffDays)}d`} variant="warning" style={{ marginLeft: 8 }} />
                            );
                            return (
                                <Text variant="tiny" color={colors.textoTerciario} style={{ marginLeft: 8 }}>
                                    FV: {formatearFecha(item.fvActualTs)}
                                </Text>
                            );
                        })()}
                    </View>
                </View>

                {/* Panel lateral: Stock */}
                <Surface variant="flat" style={[styles.infoStock, { backgroundColor: colors.inputFondo }]}>
                    <Text variant="tiny" weight="bold" color={colors.textoTerciario}>STOCK</Text>
                    <Text 
                        variant="h2" 
                        weight="bold" 
                        color={item.stockMaster > 0 ? colors.exito : colors.error}
                    >
                        {item.stockMaster}
                    </Text>
                    <Text variant="tiny" weight="bold" color={colors.textoTerciario}>UNID</Text>
                </Surface>
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
        marginHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    contenedorImagen: {
        width: 70,
        height: 70,
        marginRight: 12,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        backgroundColor: '#ffffff', // Aislamos imagen con fondo blanco para elegancia
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
    infoStock: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        minWidth: 60,
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
