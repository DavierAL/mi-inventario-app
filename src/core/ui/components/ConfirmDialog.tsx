// ARCHIVO: src/core/ui/components/ConfirmDialog.tsx
import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring,
    withTiming 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import { Text } from './Typography';
import { Button, Surface } from './index';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    visible,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'warning',
}) => {
    const { colors } = useTheme();
    const scale = useSharedValue(0.9);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15, stiffness: 200 });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            scale.value = 0.9;
            opacity.value = 0;
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const getIconName = () => {
        switch (type) {
            case 'danger': return 'warning';
            case 'info': return 'information-circle';
            default: return 'alert-circle';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'danger': return colors.error;
            case 'info': return colors.primario;
            default: return colors.primario;
        }
    };

    const handleConfirm = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirm();
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCancel();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <Pressable style={styles.overlay} onPress={onCancel}>
                <Animated.View style={[styles.container, animatedStyle]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <Surface variant="elevated" padding="xl" style={styles.surface}>
                            <View style={styles.iconContainer}>
                                <Ionicons 
                                    name={getIconName()} 
                                    size={48} 
                                    color={getIconColor()} 
                                />
                            </View>
                            <Text variant="h3" weight="bold" align="center" style={styles.title}>
                                {title}
                            </Text>
                            <Text variant="body" color={colors.textoSecundario} align="center">
                                {message}
                            </Text>
                            <View style={styles.buttons}>
                                <Button
                                    label={cancelText}
                                    variant="outline"
                                    onPress={handleCancel}
                                    style={styles.button}
                                />
                                <Button
                                    label={confirmText}
                                    variant={type === 'danger' ? 'danger' : 'primary'}
                                    onPress={handleConfirm}
                                    style={styles.button}
                                />
                            </View>
                        </Surface>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 340,
    },
    surface: {
        borderRadius: 20,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        marginBottom: 8,
    },
    buttons: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    button: {
        flex: 1,
    },
});