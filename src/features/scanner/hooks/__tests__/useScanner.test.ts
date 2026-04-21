import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from '../useScanner';

describe('useScanner Hook', () => {
    it('maneja el escaneo de un codigo de barras', async () => {
        const onScanMock = jest.fn();
        const { result } = renderHook(() => useScanner({ onScan: onScanMock }));
        
        await act(async () => {
            result.current.handleBarCodeScanned({ data: '12345', type: 'ean13' } as any);
        });
        
        expect(onScanMock).toHaveBeenCalledWith('12345');
    });

    it('previene escaneos duplicados rapidos', async () => {
        const onScanMock = jest.fn();
        const { result } = renderHook(() => useScanner({ onScan: onScanMock }));
        
        await act(async () => {
            result.current.handleBarCodeScanned({ data: '12345' } as any);
            result.current.handleBarCodeScanned({ data: '12345' } as any);
        });
        
        expect(onScanMock).toHaveBeenCalledTimes(1);
    });
});
