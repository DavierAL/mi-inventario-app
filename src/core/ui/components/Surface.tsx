// ARCHIVO: src/core/ui/components/Surface.tsx
import React from 'react';
import { View, ViewStyle, ViewProps } from 'react-native';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';

interface SurfaceProps extends ViewProps {
    variant?: 'flat' | 'elevated' | 'outline';
    padding?: keyof typeof TOKENS.spacing;
    radius?: keyof typeof TOKENS.radius;
    children?: React.ReactNode;
    style?: ViewStyle;
    testID?: string;
}

export const Surface: React.FC<SurfaceProps> = ({ 
    variant = 'flat', 
    padding = 'md', 
    radius = 'md',
    children, 
    style,
    testID,
    ...props 
}) => {
    const { colors, isDark } = useTheme();

    const getBaseStyle = (): ViewStyle => {
        const base: ViewStyle = {
            backgroundColor: colors.superficie,
            borderRadius: TOKENS.radius[radius],
            padding: TOKENS.spacing[padding],
        };

        switch (variant) {
            case 'elevated':
                return { 
                    ...base, 
                    ...(isDark ? { backgroundColor: colors.superficieAlta } : TOKENS.shadows.light)
                };
            case 'outline':
                return { 
                    ...base, 
                    borderWidth: 1, 
                    borderColor: colors.borde,
                    backgroundColor: 'transparent'
                };
            default:
                return base;
        }
    };

    return (
        <View testID={testID} style={[getBaseStyle(), style]} {...props}>
            {children}
        </View>
    );
};
