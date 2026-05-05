import React from 'react';
import { render } from '@testing-library/react-native';
import { BrandItem } from '../components/BrandItem';
import { MarcaEstado } from '../services/marcasService';
import { useTheme } from '../../../core/ui/ThemeContext';

jest.mock('../../../core/ui/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      superficie: '#FFFFFF',
      borde: '#E5E5E5',
      textoPrincipal: '#000000',
      textoSecundario: '#666666',
      textoTerciario: '#999999',
      primario: '#007AFF',
    },
  }),
}));

jest.mock('../../../core/ui/components/AnimatedPressable', () => {
  const { Pressable } = require('react-native');
  return {
    AnimatedPressable: ({ children, onPress, style, accessibilityLabel, disabled }: any) => (
      <Pressable 
        onPress={onPress} 
        style={style} 
        testID={style?.testID}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
      >
        {children}
      </Pressable>
    ),
  };
});

describe('BrandItem Component', () => {
  const crearMarcaEstado = (overrides: Partial<MarcaEstado> = {}): MarcaEstado => ({
    id: '1',
    nombre: 'Marca Test',
    diasRango: 30,
    ultimoConteo: new Date(),
    inventariar: true,
    diasDesdeUltimoConteo: 5,
    proximoConteoEn: 25,
    estaAtrasada: false,
    ...overrides,
  });

  it('renderiza nombre de marca', () => {
    const marca = crearMarcaEstado({ nombre: 'Nike' });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('Nike')).toBeTruthy();
  });

  it('muestra badge ATRASADA para marca atrasada', () => {
    const marca = crearMarcaEstado({ nombre: 'Adidas', estaAtrasada: true });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('ATRASADA')).toBeTruthy();
  });

  it('muestra badge AL DÍA para marca al día', () => {
    const marca = crearMarcaEstado({ nombre: 'Puma', estaAtrasada: false });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('AL DÍA')).toBeTruthy();
  });

  it('muestra badge DESHABILITADA para marca con inventariar false', () => {
    const marca = crearMarcaEstado({ nombre: 'Reebok', inventariar: false });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('DESHABILITADA')).toBeTruthy();
  });

  it('muestra días sin contar cuando está atrasada', () => {
    const marca = crearMarcaEstado({ nombre: 'Vans', estaAtrasada: true, diasDesdeUltimoConteo: 10 });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('10 días sin contar')).toBeTruthy();
  });

  it('muestra próximo conteo cuando está al día', () => {
    const marca = crearMarcaEstado({ nombre: 'Converse', estaAtrasada: false, proximoConteoEn: 15 });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('Próximo en 15 días')).toBeTruthy();
  });

  it('muestra Sin conteo cuando diasDesdeUltimoConteo es -1', () => {
    const marca = crearMarcaEstado({ nombre: 'NewBalance', diasDesdeUltimoConteo: -1, estaAtrasada: true });
    const { getByText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByText('Sin conteo')).toBeTruthy();
  });

  it('llama onPress al presionar', () => {
    const onPressMock = jest.fn();
    const marca = crearMarcaEstado();
    const { getByText } = render(
      <BrandItem marca={marca} onPress={onPressMock} />
    );

    // Pressable requiere fireEvent
    const pressable = getByText('Marca Test');
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(pressable);

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('tiene accesibilidad correcta', () => {
    const marca = crearMarcaEstado({ nombre: 'TestMarca' });
    const { getByLabelText } = render(
      <BrandItem marca={marca} onPress={jest.fn()} />
    );

    expect(getByLabelText('Marca TestMarca, estado Al día')).toBeTruthy();
  });
});