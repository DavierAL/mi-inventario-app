import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useNetworkStatus } from '../useNetworkStatus';
import NetInfo from '@react-native-community/netinfo';

describe('useNetworkStatus Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('inicia con el estado actual de NetInfo', async () => {
        const { result } = renderHook(() => useNetworkStatus());
        
        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        }, { timeout: 2000 });
    });

    it('se actualiza cuando cambia la conexion', async () => {
        let networkCallback: any;
        (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
            networkCallback = cb;
            return jest.fn();
        });

        const { result } = renderHook(() => useNetworkStatus());
        
        // Primero esperamos a que se estabilice el estado inicial (fetch)
        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        });

        // Ahora disparamos el cambio manual
        await act(async () => {
            networkCallback({ 
                isConnected: false, 
                isInternetReachable: false,
                type: 'none',
                details: null
            });
        });
        
        await waitFor(() => {
            expect(result.current.isConnected).toBe(false);
        });
    });
});
