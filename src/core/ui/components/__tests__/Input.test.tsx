import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

// Mock de useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: {
            fondo: '#fff',
            borde: '#eee',
            textoPrincipal: '#000',
            primario: '#0075de',
        },
    }),
}));

describe('Input Component', () => {
    it('renderiza con el label y placeholder', () => {
        const { getByText, getByPlaceholderText } = render(
            <Input label="Email" placeholder="test@test.com" />
        );
        expect(getByText('Email')).toBeTruthy();
        expect(getByPlaceholderText('test@test.com')).toBeTruthy();
    });

    it('llama a onChangeText cuando el texto cambia', () => {
        const onChangeTextMock = jest.fn();
        const { getByPlaceholderText } = render(
            <Input placeholder="Type here" onChangeText={onChangeTextMock} />
        );
        
        fireEvent.changeText(getByPlaceholderText('Type here'), 'hello');
        expect(onChangeTextMock).toHaveBeenCalledWith('hello');
    });

    it('muestra el mensaje de error', () => {
        const { getByText } = render(<Input error="Invalid email" />);
        expect(getByText('Invalid email')).toBeTruthy();
    });

    it('aplica estilos de deshabilitado', () => {
        const { getByPlaceholderText } = render(
            <Input placeholder="Disabled" editable={false} />
        );
        const input = getByPlaceholderText('Disabled');
        // El input deshabilitado suele tener opacidad o color diferente
        expect(input.props.editable).toBe(false);
    });
});
