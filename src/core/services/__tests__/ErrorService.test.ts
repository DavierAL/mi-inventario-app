import { ErrorService } from '../ErrorService';
import { Logger } from '../LoggerService';
import Toast from 'react-native-toast-message';

jest.mock('../LoggerService');
jest.mock('react-native-toast-message', () => ({
    show: jest.fn(),
}));

describe('ErrorService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('maneja errores y los registra con el formato correcto', () => {
        const error = new Error('Test Crash');
        const context = { component: 'TestComp', showToast: false };
        
        ErrorService.handle(error, context);
        
        expect(Logger.error).toHaveBeenCalledWith(
            'Error: Test Crash',
            error,
            expect.objectContaining({ component: 'TestComp' })
        );
    });

    it('identifica errores criticos', () => {
        const critico = new Error('Database Corrupt');
        expect(ErrorService.isCritical(critico)).toBe(true);
        
        const normal = new Error('Timeout');
        expect(ErrorService.isCritical(normal)).toBe(false);
    });

    it('muestra Toast por defecto', () => {
        const error = new Error('Network Fail');
        ErrorService.handle(error);
        
        expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            text2: expect.stringContaining('conexión'),
        }));
    });
});
