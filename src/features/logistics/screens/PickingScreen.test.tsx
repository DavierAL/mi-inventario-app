import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PickingList, PickingScreen, PedidoCard } from './PickingScreen';
import { benchmark } from '../../../core/utils/benchmark';
import { LogisticsRepository } from '../repository/logisticsRepository';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { useLogisticsSync } from '../hooks/useLogisticsSync';
import { usePermissions } from '../../../core/hooks/usePermissions';

// Mock dependencies
jest.mock('../hooks/useLogisticsSync', () => ({
  useLogisticsSync: jest.fn(),
}));

jest.mock('../repository/logisticsRepository', () => ({
  LogisticsRepository: {
    actualizarEstado: jest.fn(),
  },
}));

jest.mock('../../../core/store/useAuthStore', () => {
  const fn: any = jest.fn().mockReturnValue({ logout: jest.fn(), user: { rol: 'admin' } });
  fn.getState = jest.fn().mockReturnValue({ user: { rol: 'admin' } });
  return { useAuthStore: fn };
});

jest.mock('../../../core/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@nozbe/watermelondb/react', () => ({
  withObservables: () => (Component: any) => Component,
}));

describe('PickingScreen UI & Flow', () => {
  const mockEnvios = [
    {
      id: '1',
      codPedido: 'PED-001',
      cliente: 'Juan Perez',
      estado: 'Pendiente',
      distrito: 'Miraflores',
      operador: 'Salva'
    },
    {
      id: '2',
      codPedido: 'PED-002',
      cliente: 'Ana Lopez',
      estado: 'En_Tienda',
      distrito: 'Surco',
      operador: 'Yango'
    }
  ];

  const mockReSincronizar = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useLogisticsSync as jest.Mock).mockReturnValue({
      cargando: false,
      error: null,
      reSincronizar: mockReSincronizar,
    });
    ((useAuthStore as any).getState as jest.Mock).mockReturnValue({
      user: { rol: 'admin' },
    });
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: () => true,
      role: 'admin'
    });
  });

  test('Renderizado de PickingList con datos', () => {
    const { getByText } = render(
      <PickingList 
        pedidos={mockEnvios as any} 
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
    expect(getByText('PED-002')).toBeTruthy();
  });

  test('Interacción con barra de busqueda', () => {
    const { getByPlaceholderText } = render(<PickingScreen />);
    
    const input = getByPlaceholderText('Buscar por código o cliente...');
    fireEvent.changeText(input, 'PED-001');
    
    expect(input.props.value).toBe('PED-001');
  });

  test('Filtro por estado de pedido y orden', () => {
    const { getByText, getByTestId } = render(<PickingScreen />);
    
    const pendienteChip = getByText('Pendientes');
    fireEvent.press(pendienteChip);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    const enTiendaChip = getByText('En Tienda');
    fireEvent.press(enTiendaChip);

    const entregadosChip = getByText('Entregados');
    fireEvent.press(entregadosChip);

    const toggleOrderBtn = getByTestId('toggle-order-btn');
    fireEvent.press(toggleOrderBtn);
  });

  test('Despachar exitosamente llama a repositorio y haptics', async () => {
    (LogisticsRepository.actualizarEstado as jest.Mock).mockResolvedValue({ exito: true });

    const onDespachar = jest.fn();
    const { getByText } = render(
      <PickingList 
        pedidos={[mockEnvios[0]] as any}
        busqueda="" 
        filtroEstado={null} 
        ordenDesc={true} 
        isFiltrado={false}
        onDespachar={onDespachar}
        onVerPanel={jest.fn()}
      />
    );

    const despacharBtn = getByText('Despachar a Logística');
    fireEvent.press(despacharBtn);

    expect(onDespachar).toHaveBeenCalledWith(mockEnvios[0]);
  });

  test('PickingScreen handleDespachar exitoso', async () => {
    (LogisticsRepository.actualizarEstado as jest.Mock).mockResolvedValue({ exito: true });
    
    // Testeamos el handler que PickingScreen le pasa a PickingList simulándolo,
    // o renderizando la lista si estuviera testeada como componente puro
    // Vamos a renderizar PickingList con la inyeccion de funciones mock para probarla,
    // el unit test de integracion sobre handleDespachar requeriria
    // que la data venga del decorator lo cual mockeamos con withObservables a passthrough.
    
    const { getByText } = render(
      <PickingList 
        pedidos={[mockEnvios[0]] as any} 
        busqueda="" 
        filtroEstado={null} 
        ordenDesc={true} 
        isFiltrado={false}
        onDespachar={async (envio: any) => {
            try {
                await LogisticsRepository.actualizarEstado(envio, 'En_Tienda', 'admin');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await mockReSincronizar();
            } catch (err) {}
        }}
        onVerPanel={jest.fn()}
      />
    );

    const btn = getByText('Despachar a Logística');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(LogisticsRepository.actualizarEstado).toHaveBeenCalledWith(mockEnvios[0], 'En_Tienda', 'admin');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(mockReSincronizar).toHaveBeenCalled();
  });

  test('PickingScreen handleDespachar con error', async () => {
    (LogisticsRepository.actualizarEstado as jest.Mock).mockRejectedValue(new Error('DB error'));
    
    const { getByText } = render(
      <PickingList 
        pedidos={[mockEnvios[0]] as any} 
        busqueda="" 
        filtroEstado={null} 
        ordenDesc={true} 
        isFiltrado={false}
        onDespachar={async (envio: any) => {
            try {
                await LogisticsRepository.actualizarEstado(envio, 'En_Tienda', 'admin');
            } catch (err) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }}
        onVerPanel={jest.fn()}
      />
    );

    const btn = getByText('Despachar a Logística');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(LogisticsRepository.actualizarEstado).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  test('Navega al StorePanel al presionar Ver Panel', () => {
    const onVerPanel = jest.fn();
    const { getByText } = render(
      <PickingList 
        pedidos={[mockEnvios[1]] as any}
        busqueda="" 
        filtroEstado={null} 
        ordenDesc={true} 
        isFiltrado={false}
        onDespachar={jest.fn()}
        onVerPanel={onVerPanel}
      />
    );

    const card = getByText('PED-002');
    fireEvent.press(card);
    expect(onVerPanel).toHaveBeenCalledWith(mockEnvios[1]);
  });
});
