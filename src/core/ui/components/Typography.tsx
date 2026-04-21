// ARCHIVO: src/core/ui/components/Typography.tsx
import React from 'react';
import { Text as RNText, TextStyle, TextProps } from 'react-native';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';

interface CustomTextProps extends TextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';
    weight?: 'regular' | 'medium' | 'bold';
    color?: string;
    align?: 'left' | 'center' | 'right';
}

export const Typography: React.FC<CustomTextProps> = ({ 
    children, 
    variant = 'body', 
    weight,
    color, 
    align = 'left',
    style,
    ...props 
}) => {
    const { colors } = useTheme();

    const getBaseStyle = (): TextStyle => {
        switch (variant) {
            case 'h1': return { fontSize: TOKENS.typography.size.h1, fontWeight: '700' };
            case 'h2': return { fontSize: TOKENS.typography.size.h2, fontWeight: '600' };
            case 'h3': return { fontSize: TOKENS.typography.size.h3, fontWeight: '600' };
            case 'small': return { fontSize: TOKENS.typography.size.small, fontWeight: '400' };
            case 'tiny': return { fontSize: TOKENS.typography.size.tiny, fontWeight: '400' };
            default: return { fontSize: TOKENS.typography.size.body, fontWeight: '400' };
        }
    };

    const getTextColor = () => {
        if (!color) return colors.textoPrincipal;
        if (color === 'primary') return colors.primario;
        if (color === 'secondary') return colors.textoSecundario;
        if (color === 'error') return colors.error;
        return color; // Color literal (hex/rgba)
    };

    const textStyle: TextStyle = {
        ...getBaseStyle(),
        color: getTextColor(),
        textAlign: align,
        // Si se pasa un peso explícito, sobreescribimos
        ...(weight === 'medium' && { fontWeight: '500' }),
        ...(weight === 'bold' && { fontWeight: '700' }),
        ...(weight === 'regular' && { fontWeight: '400' }),
    };

    return (
        <RNText style={[textStyle, style]} {...props}>
            {children}
        </RNText>
    );
};

// Mantenemos el alias Text para compatibilidad con el código existente
export const Text = Typography;
