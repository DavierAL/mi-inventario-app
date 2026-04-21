// ARCHIVO: src/core/ui/components/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';

interface BadgeProps {
    label: string;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
    style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ 
    label, 
    variant = 'default', 
    style 
}) => {
    const { colors, isDark } = useTheme();

    const getColors = () => {
        switch (variant) {
            case 'success':
                return { bg: 'rgba(75, 160, 66, 0.15)', text: '#4ba042' };
            case 'error':
                return { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' };
            case 'warning':
                return { bg: 'rgba(242, 153, 74, 0.15)', text: '#f2994a' };
            case 'info':
                return { bg: 'rgba(0, 117, 222, 0.1)', text: '#0075de' };
            default:
                return { bg: colors.fondoPrimario, text: colors.textoSecundario };
        }
    };

    const { bg, text } = getColors();

    return (
        <View style={[styles.badge, { backgroundColor: bg }, style]}>
            <Text style={[styles.text, { color: text }]}>
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: TOKENS.spacing.sm,
        paddingVertical: 2,
        borderRadius: TOKENS.radius.sm,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: TOKENS.typography.size.tiny,
        fontWeight: '700',
        textTransform: 'uppercase',
    }
});
