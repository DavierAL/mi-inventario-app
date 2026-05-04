// ARCHIVO: src/core/ui/components/BottomSheet.tsx
import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring,
    withTiming,
    runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import { Text } from './Typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetOption {
    label: string;
    value: string;
    icon?: string;
    destructive?: boolean;
}

interface BottomSheetProps {
    visible: boolean;
    title?: string;
    options: BottomSheetOption[];
    onSelect: (value: string) => void;
    onClose: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    visible,
    title,
    options,
    onSelect,
    onClose,
}) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const opacity = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 200 });
            opacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const handleSelect = useCallback((value: string) => {
        Haptics.selectionAsync();
        onSelect(value);
    }, [onSelect]);

    const handleClose = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    }, [onClose]);

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(0, context.value.y + event.translationY);
        })
        .onEnd((event) => {
            if (event.translationY > 100 || event.velocityY > 500) {
                translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 200 });
                opacity.value = withTiming(0, { duration: 200 }, () => {
                    runOnJS(handleClose)();
                });
            } else {
                translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <Animated.View style={[styles.overlay, overlayStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[
                        styles.sheet, 
                        { 
                            backgroundColor: colors.superficie,
                            paddingBottom: insets.bottom + 20 
                        },
                        animatedStyle
                    ]}>
                        <View style={styles.handle}>
                            <View style={[styles.handleBar, { backgroundColor: colors.borde }]} />
                        </View>
                        {title && (
                            <Text variant="h3" weight="bold" style={styles.title}>
                                {title}
                            </Text>
                        )}
                        <View style={styles.options}>
                            {options.map((option, index) => (
                                <Pressable
                                    key={option.value}
                                    style={({ pressed }) => [
                                        styles.option,
                                        pressed && { backgroundColor: colors.fondoPrimario }
                                    ]}
                                    onPress={() => handleSelect(option.value)}
                                >
                                    <Text 
                                        variant="body"
                                        style={option.destructive && { color: colors.error }}
                                    >
                                        {option.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </GestureDetector>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
    },
    handle: {
        alignItems: 'center',
        marginBottom: 16,
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    title: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    options: {
        paddingHorizontal: 8,
    },
    option: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
});