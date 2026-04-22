// ARCHIVO: src/core/ui/SkeletonCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { Shimmer } from './components/Shimmer';

export const SkeletonCard = () => {
    const { colors } = useTheme();

    return (
        <View style={[styles.tarjetaProducto, { backgroundColor: colors.superficie }]}>
            {/* Imagen Caja Falsa */}
            <Shimmer width={62} height={62} borderRadius={8} style={{ marginRight: 10 }} />
        
            {/* Textos Falsos Centro */}
            <View style={styles.infoPrincipal}>
                <View style={{ gap: 6 }}>
                    <Shimmer width="40%" height={12} borderRadius={4} />
                    <Shimmer width="90%" height={16} borderRadius={4} />
                    <Shimmer width="70%" height={16} borderRadius={4} />
                    <Shimmer width="50%" height={10} borderRadius={4} />
                </View>
            </View>

            {/* Panel Lateral Precios Falsos */}
            <View style={[styles.infoPrecios, { borderLeftColor: colors.borde }]}>
                <Shimmer width="80%" height={10} borderRadius={4} style={{ marginBottom: 8 }} />
                <Shimmer width="80%" height={10} borderRadius={4} />
                <Shimmer width="100%" height={26} borderRadius={6} style={{ marginTop: 12 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    tarjetaProducto: {
        marginHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoPrincipal: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 10,
    },
    infoPrecios: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingLeft: 10,
        minWidth: 85,
    },
});
