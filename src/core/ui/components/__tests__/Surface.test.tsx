import React from 'react';
import { View, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Surface } from '../Surface';

// Mock de useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: {
            superficie: '#ffffff',
            borde: '#eeeeee',
        },
        isDark: false,
    }),
}));

describe('Surface Component', () => {
    it('renderiza correctamente los hijos', () => {
        const { getByTestId } = render(
            <Surface>
                <View testID="child" />
            </Surface>
        );
        expect(getByTestId('child')).toBeTruthy();
    });

    it('aplica elevacion y borde por defecto', () => {
        const { getByTestId } = render(<Surface testID="surface" />);
        const surface = getByTestId('surface');
        const style = StyleSheet.flatten(surface.props.style);
        expect(style.backgroundColor).toBe('#ffffff');
    });

    it('aplica variante outline', () => {
        const { getByTestId } = render(<Surface variant="outline" testID="surface-outline" />);
        const surface = getByTestId('surface-outline');
        const style = StyleSheet.flatten(surface.props.style);
        expect(style.borderWidth).toBe(1);
        expect(style.borderColor).toBe('#eeeeee');
    });
});
