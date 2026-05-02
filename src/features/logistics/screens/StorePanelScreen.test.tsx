import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';
import { StorePanelScreen } from './StorePanelScreen';
import { useInventarioStore } from '../../inventory/store/useInventarioStore';
import { LogisticsRepository } from '../repository/logisticsRepository';
import { EnviosService } from '../services/enviosService';
import { useCameraPermissions } from 'expo-camera';

// Mocks de dependencias específicas que no están en el setup global
jest.mock('../repository/logisticsRepository');
jest.mock('../services/enviosService');
jest.mock('../../inventory/store/useInventarioStore');

const mockEnvio = {
    id: 'envio-123',
    supabaseId: 'sb-123',
    codPedido: 'PED-001',
    cliente: 'Juan Perez',
    telefono: '999888777',
    direccion: 'Av. Siempre Viva 123',
    distrito: 'Lima',
    referencia: 'Frente al parque',
    operador: 'Salva',
    estado: 'Pendiente',
    aPagar: 50.5,
    formaPago: 'Yape',
    gmapsUrl: 'https://maps.google.com/?q=-12.0463,-77.0427',
    update: jest.fn().mockResolvedValue(true),
};

const mockUseCameraPermissions = useCameraPermissions as jest.Mock;
const mockRequestPermission = jest.fn();

describe('StorePanelScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup defaults
        (LogisticsRepository.obtenerPorId as jest.Mock).mockResolvedValue(mockEnvio);
        (useInventarioStore as unknown as jest.Mock).mockReturnValue({
            role: 'admin'
        });

        mockUseCameraPermissions.mockReturnValue([
            { granted: true, status: 'granted' },
            mockRequestPermission
        ]);

        (EnviosService.subirFotoPOD as jest.Mock).mockResolvedValue('https://supabase.storage/pod.jpg');
        (EnviosService.actualizarEstado as jest.Mock).mockResolvedValue({ success: true });
    });

    test('Renderiza los datos del envío correctamente', async () => {
        const { getByText } = render(<StorePanelScreen />);
        
        await waitFor(() => {
            expect(getByText('PED-001')).toBeTruthy();
            expect(getByText('Juan Perez')).toBeTruthy();
            expect(getByText('S/ 50.50')).toBeTruthy();
        });
    });

    test('Muestra el botón de Tomar Fotografía cuando no hay foto', async () => {
        const { getByText } = render(<StorePanelScreen />);
        
        await waitFor(() => {
            expect(getByText('Tomar Fotografía')).toBeTruthy();
        });
    });

    test('Debe solicitar permisos de cámara si no están otorgados', async () => {
        // Simular permisos denegados inicialmente
        mockUseCameraPermissions.mockReturnValue([
            { granted: false, status: 'undetermined' },
            mockRequestPermission
        ]);
        mockRequestPermission.mockResolvedValue({ granted: false });

        const { getByText } = render(<StorePanelScreen />);
        
        const tomarFotoBtn = await waitFor(() => getByText('Tomar Fotografía'));
        
        await act(async () => {
            fireEvent.press(tomarFotoBtn);
        });

        await waitFor(() => {
            expect(mockRequestPermission).toHaveBeenCalled();
            expect(Alert.alert).toHaveBeenCalledWith(
                'Permiso requerido',
                expect.stringContaining('Activa la cámara en Ajustes del dispositivo'),
                expect.any(Array)
            );
        });
    });

    test('Llamar cliente y abrir google maps', async () => {
        const { getByText, getByLabelText } = render(<StorePanelScreen />);
        
        await waitFor(() => {
            expect(getByText('999888777')).toBeTruthy();
        });

        const btnLlamar = getByLabelText(`Llamar al cliente al teléfono ${mockEnvio.telefono}`);
        await act(async () => {
            fireEvent.press(btnLlamar);
        });
        expect(Linking.openURL).toHaveBeenCalledWith(`tel:${mockEnvio.telefono}`);

        const btnMaps = getByText('Ver en Google Maps');
        await act(async () => {
            fireEvent.press(btnMaps);
        });
        expect(Linking.openURL).toHaveBeenCalledWith(mockEnvio.gmapsUrl);
    });

    test('Flujo completo de Confirmar Entrega', async () => {
        const { getByText, getByTestId } = render(<StorePanelScreen />);
        
        // 1. Abrir cámara
        const tomarFotoBtn = await waitFor(() => getByText('Tomar Fotografía'));
        fireEvent.press(tomarFotoBtn);

        // 2. Esperar al disparador de captura
        await waitFor(() => {
            expect(getByTestId('btn-capturar-pod')).toBeTruthy();
        });

        const capturarBtn = getByTestId('btn-capturar-pod');
        
        // Simular que la cámara está lista (onCameraReady se dispara internamente en el componente real, 
        // aquí forzamos el press que depende de isCameraReady)
        await act(async () => {
            fireEvent.press(capturarBtn);
        });

        // 3. Confirmar entrega
        await waitFor(() => {
            expect(getByTestId('btn-confirmar-entrega')).toBeTruthy();
        });

        const confirmarBtn = getByTestId('btn-confirmar-entrega');
        await act(async () => {
            fireEvent.press(confirmarBtn);
        });

        // 4. Verificar resultado final
        await waitFor(() => {
            expect(EnviosService.subirFotoPOD).toHaveBeenCalled();
            expect(EnviosService.actualizarEstado).toHaveBeenCalledWith(expect.objectContaining({
                nuevoEstado: 'Entregado'
            }));
            expect(getByText('¡Entregado!')).toBeTruthy();
        });
    });
});
