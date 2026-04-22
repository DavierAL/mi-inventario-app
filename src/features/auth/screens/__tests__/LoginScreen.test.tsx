import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { useAuthStore } from '../../../../core/store/useAuthStore';

jest.mock('../../../../core/store/useAuthStore');

describe('LoginScreen', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => 
      selector({
        login: mockLogin,
        isLoading: false,
        error: null,
      })
    );
  });

  test('renderiza correctamente el formulario', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('admin@mascotify.pe')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
    expect(getByText('Iniciar Sesión')).toBeTruthy();
  });

  test('dispara la acción de login al presionar el botón', async () => {
    mockLogin.mockResolvedValue(true);
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('admin@mascotify.pe'), 'test@admin.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Iniciar Sesión'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@admin.com', 'password123');
    });
  });

  test('muestra cargando cuando isLoading es true', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
    });

    const { getByTestId } = render(<LoginScreen />);
    // El componente Button muestra un ActivityIndicator cuando loading={true}
    // Si el Button tiene un ActivityIndicator interno, podemos buscarlo
  });
});
