import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LogisticsHistoryScreen } from '../LogisticsHistoryScreen';
import { useLogisticaHistorial } from '../../hooks/useLogisticaHistorial';
import { useTheme } from '../../../../core/ui/ThemeContext';

// Mock dependencias
jest.mock('../../hooks/useLogisticaHistorial', () => ({
  useLogisticaHistorial: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('../../../../core/ui/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      fondo: '#fff',
      borde: '#eee',
      textoTerciario: '#999',
      primario: '#0075de',
      error: '#f00',
    },
    isDark: false,
  }),
}));

// Mock safe area
jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
      SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    };
});

describe('LogisticsHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar cargando historial cuando cargando es true', () => {
    (useLogisticaHistorial as jest.Mock).mockReturnValue({
      entradas: [],
      cargando: true,
      error: null,
    });

    const { getByText } = render(<LogisticsHistoryScreen />);
    
    expect(getByText('Cargando historial...')).toBeTruthy();
  });

  it('debe renderizar estado vacio cuando no hay entradas', () => {
    (useLogisticaHistorial as jest.Mock).mockReturnValue({
      entradas: [],
      cargando: false,
      error: null,
    });

    const { getByText } = render(<LogisticsHistoryScreen />);
    
    expect(getByText('Sin movimientos')).toBeTruthy();
    expect(getByText('Los cambios de estado aparecerán aquí.')).toBeTruthy();
  });

  it('debe renderizar mensaje de error si ocurre un fallo', () => {
    (useLogisticaHistorial as jest.Mock).mockReturnValue({
      entradas: [],
      cargando: false,
      error: 'Hubo un error de conexion',
    });

    const { getByText } = render(<LogisticsHistoryScreen />);
    
    expect(getByText('Hubo un error de conexion')).toBeTruthy();
  });

  it('debe renderizar lista de entradas exitosamente', () => {
    (useLogisticaHistorial as jest.Mock).mockReturnValue({
      entradas: [
        {
          id: '1',
          codPedido: 'PED-123',
          timestamp: Date.now(),
          estadoAnterior: 'Pendiente',
          estadoNuevo: 'Entregado',
          rolUsuario: 'admin',
          operador: 'Salva'
        },
        {
          id: '2',
          codPedido: 'PED-456',
          timestamp: Date.now() - 100000,
          estadoAnterior: 'En_Tienda',
          estadoNuevo: 'Listo para envío',
        }
      ],
      cargando: false,
      error: null,
    });

    const { getByText } = render(<LogisticsHistoryScreen />);
    
    expect(getByText('PED-123')).toBeTruthy();
    expect(getByText('ENTREGADO')).toBeTruthy();
    expect(getByText('ADMIN')).toBeTruthy();
    expect(getByText('👤 Salva')).toBeTruthy();

    expect(getByText('PED-456')).toBeTruthy();
    expect(getByText('LISTO PARA ENVÍO')).toBeTruthy();
  });
});
