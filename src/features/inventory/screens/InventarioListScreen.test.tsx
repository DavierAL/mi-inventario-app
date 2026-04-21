import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InventarioListScreen } from './InventarioListScreen';
import { useInventarioStore } from '../store/useInventarioStore';
import { benchmark } from '../../../core/utils/benchmark';
import { MENSAJES } from '../../../core/constants/mensajes';

jest.mock('../store/useInventarioStore');

// Mock rxjs
jest.mock('rxjs', () => ({
    of: jest.fn().mockReturnValue({ pipe: jest.fn().mockReturnThis(), subscribe: jest.fn() }),
}));

jest.mock('../hooks/useFiltrosInventario', () => ({
    useFiltrosInventario: () => ({
        queryProductos: { 
            observe: jest.fn().mockReturnValue({ 
                pipe: jest.fn().mockReturnThis(), 
                subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }) 
            }) 
        },
        filtroRapido: 'TODOS',
        setFiltroRapido: jest.fn(),
        ordenamiento: 'MARCA',
        setOrdenamiento: jest.fn(),
    }),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
        navigate: jest.fn(),
    }),
}));

describe('InventarioListScreen - Unit & Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useInventarioStore as unknown as jest.Mock).mockReturnValue({
            cargando: false,
            conectarInventario: jest.fn(),
            cargarDatosSync: jest.fn(),
            repararBaseDeDatos: jest.fn(),
            productoEditando: null,
            setProductoEditando: jest.fn(),
            guardarEdicion: jest.fn(),
            error: null,
            modoOffline: false,
            lastSync: '10:00',
            sincronizandoFondo: false,
        });
    });

    test('Renderizado inicial y benchmark de carga', async () => {
        const { metrics } = await benchmark('InventarioList Load', async () => {
            render(<InventarioListScreen />);
        });

        expect(metrics.durationMs).toBeLessThan(5000);
    });

    test('Cambio de búsqueda actualiza el estado', () => {
        const { getByPlaceholderText } = render(<InventarioListScreen />);
        const input = getByPlaceholderText(MENSAJES.BUSCAR_PLACEHOLDER);
        
        fireEvent.changeText(input, 'Coca Cola');
        expect(input.props.value).toBe('Coca Cola');
    });
});
