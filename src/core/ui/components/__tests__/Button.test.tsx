import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { ThemeColors } from '../../colores';
import * as Haptics from 'expo-haptics';

// Mock de Haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 'light' },
}));

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
        const { getByText } = render(<Button label="Primary" onPress={() => {}} variant="primary" />);
        const textElement = getByText('Primary');
        let current = textElement.parent;
        while (current && current.props.activeOpacity === undefined) {
            current = current.parent;
        }
        
        const style = current?.props.style;
        const flatStyle = StyleSheet.flatten(style);
        
        expect(flatStyle).toMatchObject({
            backgroundColor: ThemeColors.light.primario,
        });
    });

    it('aplica estilos segun variante (danger)', () => {
        const { getByText } = render(<Button label="Danger" onPress={() => {}} variant="danger" />);
        const textElement = getByText('Danger');
        let current = textElement.parent;
        while (current && current.props.activeOpacity === undefined) {
            current = current.parent;
        }
        
        const style = current?.props.style;
        const flatStyle = StyleSheet.flatten(style);
        
        expect(flatStyle).toMatchObject({
            borderColor: expect.stringContaining('235'), // Rojo danger
        });
    });
});
