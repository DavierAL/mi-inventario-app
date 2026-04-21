// src/core/ui/components/Shimmer.tsx
import React, { useEffect } from 'react';
import { ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    interpolateColor,
    LinearTransition
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

interface ShimmerProps {
    width: DimensionValue;
    height: DimensionValue;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const Shimmer: React.FC<ShimmerProps> = ({
    width,
    height,
    borderRadius = 8,
    style,
    testID
}) => {
    const { colors } = useTheme();
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            true
        );
    }, []);

    // SOLUCIÓN: Asegurar estabilidad de tipos y formatos para Reanimated
    const colorStart = String(colors.inputDeshabilitado);
    const colorEnd = String(colors.borde); 

    const animatedStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(
                progress.value,
                [0, 1],
                [colorStart, colorEnd]
            )
        };
    }, [colorStart, colorEnd]);

    // SOLUCIÓN AL ERROR DE TS: Definir el estilo base como ViewStyle explícito
    // Esto evita que TS se confunda con los tipos complejos de Reanimated
    const baseStyle: ViewStyle = { 
        width, 
        height, 
        borderRadius, 
        overflow: 'hidden' 
    };

    return (
        <Animated.View 
            testID={testID}
            layout={LinearTransition.duration(300)}
            style={[
                baseStyle,
                animatedStyle,
                style
            ]} 
        />
    );
};
