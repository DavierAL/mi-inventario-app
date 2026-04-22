// ARCHIVO: src/core/ui/components/Badge.tsx
import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';

interface BadgeProps {
    label: string;
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
    style?: ViewStyle;
    testID?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
    label, 
    variant = 'neutral', 
    style,
    testID 
}) => {
    const { colors } = useTheme();

    const getColors = () => {
        switch (variant) {
            case 'success':
                return { bg: 'rgba(75, 160, 66, 0.15)', text: '#4ba042' };
            case 'error':
                return { bg: 'rgba(235, 87, 87, 0.15)', text: '#eb5757' };
            case 'warning':
                return { bg: 'rgba(242, 153, 74, 0.15)', text: '#f2994a' };
            case 'primary':
                return { bg: 'rgba(0, 117, 222, 0.1)', text: '#0075de' };
            case 'neutral':
            default:
                return { bg: colors.fondoPrimario, text: colors.textoSecundario };
        }
    };

    const { bg, text } = getColors();

    return (
        <Animated.View 
            testID={testID}
            entering={ZoomIn.duration(300)}
            style={[styles.badge, { backgroundColor: bg }, style]}
        >
            <Text style={[styles.text, { color: text }]}>
                {label.toUpperCase()}
            </Text>

        </Animated.View>
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
