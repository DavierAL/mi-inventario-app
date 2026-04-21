import { renderHook, waitFor } from '@testing-library/react-native';
import { useNetworkStatus } from '../useNetworkStatus';
import NetInfo from '@react-native-community/netinfo';

// Mock de NetInfo con todas las propiedades necesarias
jest.mock('@react-native-community/netinfo', () => ({
    fetch: jest.fn(),
    addEventListener: jest.fn(),
    NetInfoStateType: {
        unknown: 'unknown',
        none: 'none',
        wifi: 'wifi',
        cellular: 'cellular',
    }
}));

describe('useNetworkStatus Hook', () => {
    const mockState = {
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: { isConnectionExpensive: false }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (NetInfo.fetch as jest.Mock).mockResolvedValue(mockState);
        (NetInfo.addEventListener as jest.Mock).mockReturnValue(jest.fn());
    });

    it('inicializa con el estado de NetInfo.fetch', async () => {
        const { result } = renderHook(() => useNetworkStatus());

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
            expect(result.current.isOnline).toBe(true);
        });
    });

    it('actualiza isOnline correctamente cuando no hay internet', async () => {
        (NetInfo.fetch as jest.Mock).mockResolvedValue({
            ...mockState,
            isConnected: true,
            isInternetReachable: false
        });

        const { result } = renderHook(() => useNetworkStatus());

        await waitFor(() => {
            expect(result.current.isOnline).toBe(false);
        });
    });

    it('se suscribe a cambios de red al montar', async () => {
        renderHook(() => useNetworkStatus());
        
        await waitFor(() => {
            expect(NetInfo.addEventListener).toHaveBeenCalled();
        });
    });

    it('proporciona una funcion refresh funcional', async () => {
        const { result } = renderHook(() => useNetworkStatus());
        
        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        });
        
        const newState = { ...mockState, type: 'cellular' };
        (NetInfo.fetch as jest.Mock).mockResolvedValue(newState);

        const res = await result.current.refresh();
        expect(res.type).toBe('cellular');

        await waitFor(() => {
            expect(result.current.type).toBe('cellular');
        });
    });
});
