// ARCHIVO: src/core/ui/components/LoadingOverlay.tsx
import React from 'react';
import { View, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Text } from './Typography';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
    visible, 
    message 
}) => {
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.content, { backgroundColor: colors.superficie }]}>
                    <ActivityIndicator size="large" color={colors.primario} />
                    {message && (
                        <View style={styles.messageContainer}>
                            <Text variant="body" color={colors.textoSecundario}>
                                {message}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 120,
    },
    messageContainer: {
        marginTop: 12,
    },
});