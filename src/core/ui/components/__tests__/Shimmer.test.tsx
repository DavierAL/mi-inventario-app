import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Shimmer } from '../Shimmer';

// Mock de useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: {
            inputDeshabilitado: '#f6f5f4',
            borde: 'rgba(0,0,0,0.1)',
        },
        isDark: false,
    }),
}));

describe('Shimmer Component', () => {
    it('renderiza con las dimensiones correctas', () => {
        const { getByTestId } = render(
            <Shimmer width={100} height={20} testID="shimmer-view" />
        );
        
        const shimmer = getByTestId('shimmer-view');
        // Usamos un acceso más seguro para props.style
        const style = StyleSheet.flatten(shimmer.props.style || []);

        expect(style).toBeDefined();
        if (style) {
            expect(style.width).toBe(100);
            expect(style.height).toBe(20);
        }
    });

    it('aplica el borderRadius personalizado', () => {
        const { getByTestId } = render(
            <Shimmer width={100} height={20} borderRadius={12} testID="shimmer-custom" />
        );
        const shimmer = getByTestId('shimmer-custom');
        const style = StyleSheet.flatten(shimmer.props.style || []);
        expect(style?.borderRadius).toBe(12);
    });
});
