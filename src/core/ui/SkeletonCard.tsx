// ARCHIVO: src/core/ui/SkeletonCard.tsx

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from './ThemeContext';

export const SkeletonCard = () => {
    const { colors } = useTheme();
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animación de pulso repetitivo "respiración"
        Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(animValue, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7], // Parpadeo suave
    });

    const skeletonColor = colors.inputDeshabilitado;

    return (
        <View style={[styles.tarjetaProducto, { backgroundColor: colors.superficie }]}>
            {/* Imagen Caja Falsa */}
            <Animated.View style={[styles.contenedorImagen, { backgroundColor: skeletonColor, opacity }]} />
        
            {/* Textos Falsos Centro */}
            <View style={styles.infoPrincipal}>
                <Animated.View style={[styles.cajaTexto, { width: '40%', height: 12, backgroundColor: skeletonColor, opacity }]} />
                <Animated.View style={[styles.cajaTexto, { width: '90%', height: 16, backgroundColor: skeletonColor, opacity, marginTop: 8 }]} />
                <Animated.View style={[styles.cajaTexto, { width: '70%', height: 16, backgroundColor: skeletonColor, opacity, marginTop: 4 }]} />
                <Animated.View style={[styles.cajaTexto, { width: '50%', height: 10, backgroundColor: skeletonColor, opacity, marginTop: 8 }]} />
            </View>

            {/* Panel Lateral Precios Falsos */}
            <View style={[styles.infoPrecios, { borderLeftColor: colors.borde }]}>
                <Animated.View style={[styles.cajaTexto, { width: '80%', height: 10, backgroundColor: skeletonColor, opacity, marginBottom: 8 }]} />
                <Animated.View style={[styles.cajaTexto, { width: '80%', height: 10, backgroundColor: skeletonColor, opacity }]} />
                <Animated.View style={[styles.cajaTexto, { width: '100%', height: 26, backgroundColor: skeletonColor, opacity, marginTop: 12, borderRadius: 6 }]} />
            </View>
        </View>
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
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    contenedorImagen: {
        width: 62,
        height: 62,
        marginRight: 10,
        borderRadius: 8,
    },
    infoPrincipal: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 10,
    },
    cajaTexto: {
        borderRadius: 4,
    },
    infoPrecios: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingLeft: 10,
        borderLeftWidth: 1,
        minWidth: 85,
    },
});
