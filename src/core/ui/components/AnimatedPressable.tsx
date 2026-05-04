import React from 'react';
import { StyleProp, ViewStyle, PressableProps } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps extends PressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    haptic?: Haptics.ImpactFeedbackStyle;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: import('react-native').AccessibilityRole;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
    children,
    style,
    scaleTo = 0.96,
    haptic = Haptics.ImpactFeedbackStyle.Light,
    onPress,
    onPressIn,
    onPressOut,
    disabled,
    testID,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    ...props
}) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const triggerHaptic = () => {
        if (haptic && !disabled) {
            Haptics.impactAsync(haptic);
        }
    };

    const tap = Gesture.Tap()
        .enabled(!disabled)
        .maxDuration(10000)
        .hitSlop(props.hitSlop as any)
        .onBegin(() => {
            scale.value = withSpring(scaleTo, { damping: 10, stiffness: 200 });
            opacity.value = withTiming(0.85, { duration: 100 });
            if (onPressIn) runOnJS(onPressIn)(null as any);
            runOnJS(triggerHaptic)();
        })
        .onEnd((event, success) => {
            if (success && onPress) runOnJS(onPress)(null as any);
        })
        .onFinalize(() => {
            scale.value = withSpring(1, { damping: 10, stiffness: 200 });
            opacity.value = withTiming(1, { duration: 150 });
            if (onPressOut) runOnJS(onPressOut)(null as any);
        });

    return (
        <GestureDetector gesture={tap}>
            <Animated.View 
                testID={testID} 
                style={[style, animatedStyle]} 
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                accessibilityRole={accessibilityRole || 'button'}
                {...props as any}
            >
                {children}
            </Animated.View>
        </GestureDetector>
    );
};
