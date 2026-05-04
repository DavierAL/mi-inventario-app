import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { ThemeColors } from '../../colores';
import * as Haptics from 'expo-haptics';

// Mock AnimatedPressable para usar Pressable nativo en tests
jest.mock('../AnimatedPressable', () => {
    const React = require('react');
    const { Pressable } = require('react-native');
    const { impactAsync } = require('expo-haptics');
    return {
        AnimatedPressable: ({ children, onPress, disabled, style, testID, accessibilityLabel, accessibilityHint, accessibilityRole, haptic }: {
            children?: React.ReactNode;
            onPress?: () => void;
            disabled?: boolean;
            style?: object;
            testID?: string;
            accessibilityLabel?: string;
            accessibilityHint?: string;
            accessibilityRole?: 'button' | 'link' | 'checkbox' | 'radio' | 'menu' | 'menubar' | 'list' | 'menuitem' | 'none' | 'summary' | 'image' | 'header' | 'toolbar' | 'text' | 'search';
            haptic?: object;
        }) => (
            React.createElement(Pressable, {
                onPress: () => {
                    if (haptic && !disabled) impactAsync(haptic);
                    if (onPress) onPress();
                },
                disabled,
                style,
                testID,
                accessibilityLabel,
                accessibilityHint,
                accessibilityRole,
            }, children)
        ),
    };
});

// Mock del hook useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: require('../../colores').ThemeColors.light,
        isDark: false,
    }),
}));

describe('Button Component', () => {
    it('renderiza con la etiqueta correcta', () => {
        const { getByText } = render(<Button label="Click" onPress={() => {}} />);
        expect(getByText('Click')).toBeTruthy();
    });

    it('llama a onPress y activa haptics cuando se presiona', () => {
        const onPressMock = jest.fn();
        const { getByText } = render(<Button label="Press" onPress={onPressMock} />);
        
        fireEvent(getByText('Press'), 'pressIn');
        fireEvent.press(getByText('Press'));
        
        expect(onPressMock).toHaveBeenCalledTimes(1);
        expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('no llama a onPress cuando esta deshabilitado', () => {
        const onPressMock = jest.fn();
        const { getByText } = render(<Button label="Disabled" onPress={onPressMock} disabled />);
        
        fireEvent.press(getByText('Disabled'));
        
        expect(onPressMock).not.toHaveBeenCalled();
    });

    it('muestra el indicador de carga cuando loading es true', () => {
        const { queryByText } = render(
            <Button label="Loading" onPress={() => {}} loading />
        );
        expect(queryByText('Loading')).toBeNull();
    });

    it('aplica estilos segun variante (primary)', () => {
        const { getByTestId } = render(
            <Button label="Primary" onPress={() => {}} variant="primary" testID="btn-primary" />
        );
        const button = getByTestId('btn-primary');
        const flatStyle = StyleSheet.flatten(button.props.style);
        expect(flatStyle.backgroundColor).toBe(ThemeColors.light.primario);
    });

    it('aplica estilos segun variante (danger)', () => {
        const { getByTestId } = render(
            <Button label="Danger" onPress={() => {}} variant="danger" testID="btn-danger" />
        );
        const button = getByTestId('btn-danger');
        const flatStyle = StyleSheet.flatten(button.props.style);
        expect(flatStyle.borderColor).toBe(ThemeColors.light.error);
    });
});
