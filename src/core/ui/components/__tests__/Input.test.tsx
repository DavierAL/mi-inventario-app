// ARCHIVO: src/core/ui/components/__tests__/Input.test.tsx
import React from 'react';
import { View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';
import { ThemeColors } from '../../colores';

// Mock del hook useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: require('../../colores').ThemeColors.light,
        isDark: false,
    }),
}));

describe('Input Component', () => {
    it('renderiza con label y placeholder', () => {
        const { getByText, getByPlaceholderText } = render(
            <Input label="Email" placeholder="test@test.com" />
        );
        expect(getByText('Email')).toBeTruthy();
        expect(getByPlaceholderText('test@test.com')).toBeTruthy();
    });

    it('maneja el cambio de texto', () => {
        const onChangeTextMock = jest.fn();
        const { getByPlaceholderText } = render(
            <Input placeholder="Escribe" onChangeText={onChangeTextMock} />
        );
        
        fireEvent.changeText(getByPlaceholderText('Escribe'), 'Hola');
        expect(onChangeTextMock).toHaveBeenCalledWith('Hola');
    });

    it('muestra el mensaje de error', () => {
        const { getByText } = render(<Input error="Campo requerido" />);
        expect(getByText('Campo requerido')).toBeTruthy();
    });

    it('renderiza el icono si se proporciona', () => {
        const { getByTestId } = render(
            <Input icon={<View testID="test-icon" />} />
        );
        expect(getByTestId('test-icon')).toBeTruthy();
    });
});
