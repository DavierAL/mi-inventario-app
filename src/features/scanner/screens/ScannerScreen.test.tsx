import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScannerScreen } from './ScannerScreen';
import { useScanner } from '../hooks/useScanner';
import { MENSAJES } from '../../../core/constants/mensajes';

jest.mock('../hooks/useScanner');

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
        goBack: mockGoBack,
    }),
}));

describe('ScannerScreen - Unit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useScanner as jest.Mock).mockReturnValue({
            procesandoEscaneo: false,
            productoEditando: null,
            setProductoEditando: jest.fn(),
            manejarCodigoEscaneado: jest.fn(),
            handleGuardarCambios: jest.fn(),
        });
    });

    test('Renderiza correctamente', async () => {
        const { getByText } = render(<ScannerScreen />);
        expect(getByText(MENSAJES.ALINEA_CODIGO)).toBeTruthy();
    });

    test('Botón cancelar llama a goBack', () => {
        const { getByText } = render(<ScannerScreen />);
        fireEvent.press(getByText(MENSAJES.TERMINAR_LOTE));
        expect(mockGoBack).toHaveBeenCalled();
    });
});
