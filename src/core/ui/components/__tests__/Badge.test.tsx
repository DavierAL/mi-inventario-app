import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Badge } from '../Badge';

// Mock de useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: {
            primario: '#0075de',
            error: '#eb5757',
            textoPrincipal: '#000',
            fondoPrimario: '#f0f0f0',
            textoSecundario: '#666',
        },
    }),
}));

describe('Badge Component', () => {
    it('renderiza con el texto correcto', () => {
        const { getByText } = render(<Badge label="Test" />);
        expect(getByText('TEST')).toBeTruthy();
    });

    it('aplica el color segun variante', () => {
        const { getByTestId } = render(<Badge label="Error" variant="error" testID="badge-error" />);
        const badge = getByTestId('badge-error');
        const flatStyle = StyleSheet.flatten(badge.props.style);
        expect(flatStyle.backgroundColor).toBe('rgba(235, 87, 87, 0.15)');
    });

    it('aplica estilos personalizados', () => {
        const { getByTestId } = render(
            <Badge label="Custom" style={{ marginTop: 20 }} testID="badge-custom" />
        );
        const badge = getByTestId('badge-custom');
        const flatStyle = StyleSheet.flatten(badge.props.style);
        expect(flatStyle.marginTop).toBe(20);
    });
});
