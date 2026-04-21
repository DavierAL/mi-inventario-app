import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PickingList, PickingScreen } from './PickingScreen';
import { benchmark } from '../../../core/utils/benchmark';

// Mock del hook de sync
jest.mock('../hooks/useLogisticsSync', () => ({
  useLogisticsSync: () => ({
    cargando: false,
    error: null,
    reSincronizar: jest.fn(),
  }),
}));

describe('PickingScreen UI & Performance', () => {
  const mockPedidos = [
    {
      id: '1',
      codPedido: 'PED-001',
      cliente: 'Juan Perez',
      estado: 'Pendiente',
      canal: 'woocommerce',
      distrito: 'Miraflores',
    },
  ];

  test('Renderizado inicial y performance', async () => {
    const { metrics } = await benchmark('PickingScreen Initial Render', async () => {
        render(<PickingScreen />);
    });

    expect(metrics.durationMs).toBeLessThan(5000);
  });

  test('Renderizado de PickingList con datos', () => {
    const { getByText } = render(
      <PickingList 
        pedidos={mockPedidos as any} 
        busqueda="" 
        filtroEstado={null} 
        ordenDesc={true} 
        isFiltrado={false}
        onDespachar={jest.fn()}
        onVerPanel={jest.fn()}
      />
    );

    expect(getByText('PED-001')).toBeTruthy();
    expect(getByText('Juan Perez')).toBeTruthy();
  });

  test('Interacción con filtros en PickingScreen', () => {
    const { getByText, getByPlaceholderText } = render(<PickingScreen />);
    
    const input = getByPlaceholderText('Buscar por código o cliente...');
    fireEvent.changeText(input, 'PED-001');
    
    expect(input.props.value).toBe('PED-001');
  });
});
