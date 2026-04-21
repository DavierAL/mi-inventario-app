// ARCHIVO: src/core/ui/components/__tests__/Typography.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '../Typography';
import { ThemeColors } from '../../colores';
import { TOKENS } from '../../tokens';

// Mock del hook useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: require('../../colores').ThemeColors.light,
        isDark: false,
    }),
}));

describe('Typography Component', () => {
    it('renderiza correctamente con el texto proporcionado', () => {
        const { getByText } = render(<Text>Hola Mundo</Text>);
        expect(getByText('Hola Mundo')).toBeTruthy();
    });

    it('aplica el estilo por defecto (body)', () => {
        const { getByText } = render(<Text>Cuerpo</Text>);
        const textElement = getByText('Cuerpo');
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            fontSize: TOKENS.typography.size.body,
            color: ThemeColors.light.textoPrincipal,
        }));
    });

    it('aplica variantes correctamente (h1)', () => {
        const { getByText } = render(<Text variant="h1">Titulo</Text>);
        const textElement = getByText('Titulo');
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            fontSize: TOKENS.typography.size.h1,
            fontWeight: '700',
        }));
    });

    it('permite sobrescribir el color', () => {
        const customColor = '#FF0000';
        const { getByText } = render(<Text color={customColor}>Rojo</Text>);
        const textElement = getByText('Rojo');
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            color: customColor,
        }));
    });

    it('alinea el texto segun la prop align', () => {
        const { getByText } = render(<Text align="center">Centrado</Text>);
        const textElement = getByText('Centrado');
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            textAlign: 'center',
        }));
    });

    it('aplica el peso de fuente explícito', () => {
        const { getByText } = render(<Text weight="bold">Negrita</Text>);
        const textElement = getByText('Negrita');
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            fontWeight: '700',
        }));
    });
});
