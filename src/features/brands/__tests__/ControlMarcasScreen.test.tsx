import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ControlMarcasScreen } from '../screens/ControlMarcasScreen';

jest.mock('../hooks/useControlMarcas', () => ({
  useControlMarcas: () => ({
    cargando: false,
    atrasadas: [{ id: '1', nombre: 'Marca Atrasada', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 35, proximoConteoEn: -5, estaAtrasada: true }],
    alDia: [
      { id: '2', nombre: 'Marca al Día', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 5, proximoConteoEn: 25, estaAtrasada: false },
    ],
    marcasFiltradas: [
      { id: '1', nombre: 'Marca Atrasada', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 35, proximoConteoEn: -5, estaAtrasada: true },
      { id: '2', nombre: 'Marca al Día', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 5, proximoConteoEn: 25, estaAtrasada: false },
    ],
    busqueda: '',
    setBusqueda: jest.fn(),
    filtroEstado: 'todas',
    setFiltroEstado: jest.fn(),
    hayMarcasParaHoy: true,
    nombresMarcasHoy: 'Marca Atrasada',
    recargar: jest.fn(),
    enviarConstancia: jest.fn(),
  }),
}));

jest.mock('../../../core/ui/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      fondo: '#FFFFFF',
      fondoPrimario: '#F5F5F5',
      superficie: '#FFFFFF',
      borde: '#E5E5E5',
      textoPrincipal: '#000000',
      textoSecundario: '#666666',
      textoTerciario: '#999999',
      primario: '#007AFF',
      error: '#FF3B30',
      exito: '#34C759',
    },
    isDark: false,
  }),
}));

jest.mock('../../../core/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: (role: string) => role === 'admin',
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../services/pdfReporteMarcas', () => ({
  generarReporteMarcasPDF: jest.fn().mockResolvedValue('file:///test.pdf'),
}));

jest.mock('../../../core/services/ErrorService', () => ({
  ErrorService: {
    handle: jest.fn(),
  },
}));

describe('ControlMarcasScreen', () => {
  it('renderiza título Marcas', () => {
    const { getByText } = render(<ControlMarcasScreen />);
    expect(getByText('Marcas')).toBeTruthy();
  });

  it('renderiza tabs de filtro', () => {
    const { getByText } = render(<ControlMarcasScreen />);
    expect(getByText('Todas')).toBeTruthy();
    expect(getByText('Pendientes')).toBeTruthy();
    expect(getByText('Al día')).toBeTruthy();
  });

  it('cambia filtro al presionar tab', () => {
    const { getByText } = render(<ControlMarcasScreen />);
    const pendientesTab = getByText('Pendientes');
    
    fireEvent.press(pendientesTab);
    
    expect(getByText('Pendientes')).toBeTruthy();
  });

  it('renderiza campo de búsqueda', () => {
    const { getByPlaceholderText } = render(<ControlMarcasScreen />);
    expect(getByPlaceholderText('Filtrar por nombre...')).toBeTruthy();
  });

  it('muestra ALERTA cuando hay marcas atrasadas', () => {
    const { getByText } = render(<ControlMarcasScreen />);
    expect(getByText('ALERTA DE INVENTARIO')).toBeTruthy();
  });

  it('renderiza lista de marcas', () => {
    const { getByText } = render(<ControlMarcasScreen />);
    expect(getByText('Marca Atrasada')).toBeTruthy();
    expect(getByText('Marca al Día')).toBeTruthy();
  });
});