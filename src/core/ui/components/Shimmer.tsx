// src/core/ui/components/Shimmer.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
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
    width: number | string;
    height: number | string;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export const Shimmer: React.FC<ShimmerProps> = ({
    width,
    height,
    borderRadius = 8,
    style
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

    const animatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            progress.value,
            [0, 1],
            [colors.inputDeshabilitado, colors.borde]
        );
        return { backgroundColor };
    });

    return (
        <Animated.View 
            layout={LinearTransition}
            style={[
                { width, height, borderRadius },
                animatedStyle,
                style
            ]} 
        />
    );
};
