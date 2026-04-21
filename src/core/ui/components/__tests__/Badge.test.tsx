// ARCHIVO: src/core/ui/components/__tests__/Badge.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../Badge';
import { ThemeColors } from '../../colores';

// Mock del hook useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: require('../../colores').ThemeColors.light,
        isDark: false,
    }),
}));

describe('Badge Component', () => {
    it('renderiza con la etiqueta correcta', () => {
        const { getByText } = render(<Badge label="Nuevo" />);
        // Buscamos ignorando mayúsculas/minúsculas para ser más robustos
        expect(getByText(/nuevo/i)).toBeTruthy();
    });

    it('aplica colores segun variante (success)', () => {
        const { getByText } = render(<Badge label="Exito" variant="success" />);
        const textElement = getByText(/exito/i);
        
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            color: '#4ba042',
        }));
    });

    it('aplica colores segun variante (error)', () => {
        const { getByText } = render(<Badge label="Error" variant="error" />);
        const textElement = getByText(/error/i);
        
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            color: '#eb5757',
        }));
    });

    it('aplica colores por defecto', () => {
        const { getByText } = render(<Badge label="Default" />);
        const textElement = getByText(/default/i);
        
        expect(textElement.props.style).toContainEqual(expect.objectContaining({
            color: ThemeColors.light.textoSecundario,
        }));
    });
});
