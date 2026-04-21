// ARCHIVO: src/core/ui/components/Button.tsx
import React from 'react';
import { 
    TouchableOpacity, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    ViewStyle, 
    TextStyle,
    View
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'md' | 'sm';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    style
}) => {
    const { colors, isDark } = useTheme();

    const handlePress = () => {
        if (loading || disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    const getBtnStyle = (): ViewStyle => {
        const base: ViewStyle = {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: TOKENS.radius.md,
            paddingVertical: size === 'md' ? TOKENS.spacing.md : TOKENS.spacing.sm,
            paddingHorizontal: size === 'md' ? TOKENS.spacing.xl : TOKENS.spacing.lg,
        };

        switch (variant) {
            case 'primary':
                return { ...base, backgroundColor: colors.primario };
            case 'secondary':
                return { ...base, backgroundColor: colors.fondoPrimario, borderWidth: 1, borderColor: colors.borde };
            case 'danger':
                return { ...base, backgroundColor: 'rgba(235, 87, 87, 0.15)', borderWidth: 1, borderColor: 'rgba(235, 87, 87, 0.3)' };
            case 'ghost':
                return { ...base, backgroundColor: 'transparent' };
            default:
                return base;
        }
    };

    const getTextStyle = (): TextStyle => {
        const base: TextStyle = {
            fontSize: size === 'md' ? TOKENS.typography.size.body : TOKENS.typography.size.small,
            fontWeight: '600',
        };

        switch (variant) {
            case 'primary':
                return { ...base, color: '#FFFFFF' };
            case 'secondary':
                return { ...base, color: colors.primario };
            case 'danger':
                return { ...base, color: '#eb5757' };
            case 'ghost':
                return { ...base, color: colors.textoSecundario };
            default:
                return base;
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={disabled || loading}
            style={[getBtnStyle(), disabled && { opacity: 0.5 }, style]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={variant === 'primary' ? '#FFF' : colors.primario} />
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
                    <Text style={getTextStyle()}>{label}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};
