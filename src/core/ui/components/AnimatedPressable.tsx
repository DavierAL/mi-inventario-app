// src/core/ui/components/AnimatedPressable.tsx
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps extends PressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    haptic?: Haptics.ImpactFeedbackStyle;
}

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
    children,
    style,
    scaleTo = 0.96,
    haptic = Haptics.ImpactFeedbackStyle.Light,
    onPressIn,
    onPressOut,
    ...props
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = (e: any) => {
        if (haptic) Haptics.impactAsync(haptic);
        scale.value = withSpring(scaleTo, { damping: 10, stiffness: 200 });
        opacity.value = withTiming(0.85, { duration: 100 });
        onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
    };

    return (
        <AnimatedPressableBase
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, animatedStyle]}
        >
            {children}
        </AnimatedPressableBase>
    );
};
