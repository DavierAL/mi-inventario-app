// ARCHIVO: src/core/ui/components/__tests__/Surface.test.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Surface } from '../Surface';
import { ThemeColors } from '../../colores';
import { TOKENS } from '../../tokens';

// Mock del hook useTheme
jest.mock('../../ThemeContext', () => ({
    useTheme: () => ({
        colors: require('../../colores').ThemeColors.light,
        isDark: false,
    }),
}));

describe('Surface Component', () => {
    it('renderiza correctamente sus hijos', () => {
        const { getByText } = render(
            <Surface>
                <Text>Contenido</Text>
            </Surface>
        );
        expect(getByText('Contenido')).toBeTruthy();
    });

    it('aplica el estilo de superficie por defecto', () => {
        const { getByTestId } = render(
            <Surface testID="surface" />
        );
        const surface = getByTestId('surface');
        expect(surface.props.style).toContainEqual(expect.objectContaining({
            backgroundColor: ThemeColors.light.superficie,
            borderRadius: TOKENS.radius.md,
        }));
    });

    it('aplica variante outline correctamente', () => {
        const { getByTestId } = render(
            <Surface variant="outline" testID="surface" />
        );
        const surface = getByTestId('surface');
        expect(surface.props.style).toContainEqual(expect.objectContaining({
            borderWidth: 1,
            borderColor: ThemeColors.light.borde,
            backgroundColor: 'transparent',
        }));
    });

    it('permite personalizar el padding y radio', () => {
        const { getByTestId } = render(
            <Surface padding="xl" radius="lg" testID="surface" />
        );
        const surface = getByTestId('surface');
        expect(surface.props.style).toContainEqual(expect.objectContaining({
            padding: TOKENS.spacing.xl,
            borderRadius: TOKENS.radius.lg,
        }));
    });
});
