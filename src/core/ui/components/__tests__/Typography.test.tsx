import React from 'react';
import { render } from '@testing-library/react-native';
import { Typography } from '../Typography';
import { StyleSheet } from 'react-native';

// Mock de useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: {
            textoPrincipal: '#000000',
            textoSecundario: '#666666',
        },
    }),
}));

describe('Typography Component', () => {
    it('renderiza el texto correctamente', () => {
        const { getByText } = render(<Typography>Hello World</Typography>);
        expect(getByText('Hello World')).toBeTruthy();
    });

    it('aplica el tamaño segun variante h1', () => {
        const { getByText } = render(<Typography variant="h1">Title</Typography>);
        const text = getByText('Title');
        const style = StyleSheet.flatten(text.props.style);
        expect(style.fontSize).toBe(28); // Valor de h1 en tokens
    });

    it('aplica color secundario', () => {
        const { getByText } = render(<Typography color="secondary">Sub</Typography>);
        const text = getByText('Sub');
        const style = StyleSheet.flatten(text.props.style);
        expect(style.color).toBe('#666666');
    });
});
