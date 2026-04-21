import React from 'react';
import { render } from '@testing-library/react-native';
import { StorePanelScreen } from './StorePanelScreen';
import { useInventarioStore } from '../../inventory/store/useInventarioStore';
import { benchmark } from '../../../core/utils/benchmark';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
        navigate: mockNavigate,
        goBack: mockGoBack,
    }),
    useRoute: () => ({
        params: { pedidoId: '123' },
    }),
}));

jest.mock('../../inventory/store/useInventarioStore');
jest.mock('../hooks/useLogisticsSync', () => ({
    useLogisticsSync: () => ({
        cargando: false,
        error: null,
        reSincronizar: jest.fn(),
    }),
}));

describe('StorePanelScreen - Unit & Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useInventarioStore as unknown as jest.Mock).mockReturnValue({
            productoEditando: null,
            setProductoEditando: jest.fn(),
        });
    });

    test('Renderizado inicial y benchmark', async () => {
        const { metrics } = await benchmark('StorePanel Load', async () => {
            render(<StorePanelScreen />);
        });

        expect(metrics.durationMs).toBeLessThan(5000);
    });
});
