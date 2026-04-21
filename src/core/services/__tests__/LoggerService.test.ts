import { Logger } from '../LoggerService';
import { database } from '../../database';

// Mock database
jest.mock('../../database', () => ({
    database: {
        get: jest.fn().mockReturnValue({
            create: jest.fn().mockResolvedValue({}),
        }),
        write: jest.fn().mockImplementation(async (cb) => await cb()),
    },
}));

describe('LoggerService', () => {
    let spyLog: jest.SpyInstance;
    let spyWarn: jest.SpyInstance;
    let spyError: jest.SpyInstance;

    beforeEach(() => {
        spyLog = jest.spyOn(console, 'log').mockImplementation();
        spyWarn = jest.spyOn(console, 'warn').mockImplementation();
        spyError = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('registra logs de info', async () => {
        Logger.info('Test Info', { data: 1 });
        
        // Esperamos a que la promesa interna de log se resuelva
        await new Promise(resolve => setImmediate(resolve));
        
        expect(spyLog).toHaveBeenCalledWith('[INFO] Test Info', { data: 1 });
    });

    it('registra logs de advertencia', async () => {
        Logger.warn('Test Warn');
        
        await new Promise(resolve => setImmediate(resolve));
        
        expect(spyWarn).toHaveBeenCalledWith('[WARN] Test Warn', undefined);
    });

    it('registra logs de error', async () => {
        const error = new Error('Fail');
        Logger.error('Test Error', error, { extra: 'data' });
        
        await new Promise(resolve => setImmediate(resolve));
        
        expect(spyError).toHaveBeenCalledWith('[ERROR] Test Error', expect.objectContaining({
            extra: 'data',
            errorMessage: 'Fail',
        }));
    });
});
