// ARCHIVO: src/core/ui/components/Button.tsx
import React from 'react';
import { 
    Text, 
    ActivityIndicator, 
    ViewStyle, 
    TextStyle,
    View,
    StyleProp
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';
import { AnimatedPressable } from './AnimatedPressable';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'md' | 'sm';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    style,
    testID,
    accessibilityLabel,
    accessibilityHint
}) => {
    const { colors } = useTheme();

    const handlePress = () => {
        if (loading || disabled) return;
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
                return { 
                    ...base, 
                    backgroundColor: disabled ? colors.borde : colors.primario 
                };
            case 'secondary':
                return { ...base, backgroundColor: colors.fondoPrimario, borderWidth: 1, borderColor: colors.borde };
            case 'danger':
                return { ...base, backgroundColor: colors.fondoPrimario, borderWidth: 1, borderColor: colors.error };
            case 'ghost':
                return { ...base, backgroundColor: 'transparent' };
            case 'outline':
                return { 
                    ...base, 
                    backgroundColor: 'transparent', 
                    borderWidth: 1, 
                    borderColor: colors.borde 
                };
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
                return { 
                    ...base, 
                    color: disabled ? colors.textoTerciario : colors.absolutoBlanco 
                };
            case 'secondary':
                return { ...base, color: colors.primario };
            case 'danger':
                return { ...base, color: colors.error };
            case 'ghost':
                return { ...base, color: colors.textoSecundario };
            case 'outline':
                return { ...base, color: colors.textoSecundario };
            default:
                return base;
        }
    };

    return (
        <AnimatedPressable
            testID={testID}
            onPress={handlePress}
            disabled={disabled || loading}
            style={[getBtnStyle(), style]}
            scaleTo={0.97}
            haptic={variant === 'primary' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityHint={accessibilityHint}
            accessibilityRole="button"
        >
            {loading ? (
                <ActivityIndicator size="small" color={variant === 'primary' ? colors.absolutoBlanco : colors.primario} />
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
                    <Text style={getTextStyle()}>{label}</Text>
                </View>
            )}
        </AnimatedPressable>
    );
};
