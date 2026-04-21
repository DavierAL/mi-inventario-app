// ARCHIVO: src/core/ui/components/Input.tsx
import React, { useState } from 'react';
import { 
    View, 
    TextInput, 
    Text, 
    StyleSheet, 
    TextInputProps, 
    ViewStyle,
    Animated
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { TOKENS } from '../tokens';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerStyle?: ViewStyle;
    editable?: boolean;
    style?: ViewStyle;
    testID?: string;
}

export const Input: React.FC<InputProps> = ({ 
    label, 
    error, 
    icon, 
    containerStyle,
    ...props 
}) => {
    const { colors, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: colors.textoSecundario }]}>
                    {label}
                </Text>
            )}
            <View style={[
                styles.inputWrapper, 
                { 
                    backgroundColor: colors.inputFondo, 
                    borderColor: error ? colors.error : (isFocused ? colors.primario : colors.borde),
                    borderWidth: isFocused || error ? 1.5 : 1
                }
            ]}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <TextInput
                    style={[
                        styles.input, 
                        { color: colors.textoPrincipal }
                    ]}
                    placeholderTextColor={colors.textoTerciario}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
            </View>
            {error && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: TOKENS.spacing.md,
        width: '100%',
    },
    label: {
        fontSize: TOKENS.typography.size.small,
        fontWeight: '600',
        marginBottom: TOKENS.spacing.xs,
        marginLeft: 2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: TOKENS.radius.md,
        paddingHorizontal: TOKENS.spacing.md,
        minHeight: 48,
    },
    iconContainer: {
        marginRight: TOKENS.spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: TOKENS.typography.size.body,
        paddingVertical: TOKENS.spacing.sm,
    },
    errorText: {
        fontSize: TOKENS.typography.size.tiny,
        marginTop: TOKENS.spacing.xs,
        marginLeft: 2,
    }
});
