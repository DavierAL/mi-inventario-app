import NetInfo from '@react-native-community/netinfo';

// Mocks
jest.mock('@react-native-community/netinfo');
jest.mock('@nozbe/watermelondb/sync');

describe('SyncService', () => {
    let syncConSupabase: any;
    let database: any;
    let synchronize: any;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        
        // Re-importar para tener un estado fresco (isSyncing = false)
        syncConSupabase = require('../syncService').syncConSupabase;
        database = require('../../../../core/database').database;
        synchronize = require('@nozbe/watermelondb/sync').synchronize;
        
        (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
    });

    it('aborta si no hay conexion a internet', async () => {
        (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
        await syncConSupabase();
        expect(synchronize).not.toHaveBeenCalled();
    });

    it('inicia sincronizacion correctamente', async () => {
        (synchronize as jest.Mock).mockResolvedValue(undefined);
        await syncConSupabase();
        expect(synchronize).toHaveBeenCalledWith(expect.objectContaining({
            pullChanges: expect.any(Function),
            pushChanges: expect.any(Function),
        }));
    });

    it('registra el exito en el historial', async () => {
        (synchronize as jest.Mock).mockResolvedValue(undefined);
        const mockCreate = jest.fn();
        (database.get as jest.Mock).mockImplementation((table: string) => {
            if (table === 'sync_history') return { create: mockCreate };
            return { create: jest.fn() }; // Para 'logs'
        });
        (database.write as jest.Mock).mockImplementation((fn: any) => fn());

        await syncConSupabase();
        
        expect(database.get).toHaveBeenCalledWith('sync_history');
        expect(mockCreate).toHaveBeenCalled();
    });
});
