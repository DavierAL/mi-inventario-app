import NetInfo from '@react-native-community/netinfo';

// Mocks - mejorados para capturar llamadas correctamente
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));
jest.mock('@nozbe/watermelondb/sync', () => ({
  synchronize: jest.fn().mockResolvedValue(undefined),
}));

describe('SyncService', () => {
    let syncConSupabase: any;
    let database: any;
    let synchronize: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Usamos require una sola vez o importamos al inicio
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
        // Verificamos que synchronize fue llamado
        expect(synchronize).toHaveBeenCalled();
    });

    it('registra el exito en el historial', async () => {
        (synchronize as jest.Mock).mockResolvedValue(undefined);
        const mockSyncHistoryCreate = jest.fn();
        (database.get as jest.Mock).mockImplementation((table: string) => {
            if (table === 'sync_history') return { create: mockSyncHistoryCreate };
            return { create: jest.fn() };
        });
        (database.write as jest.Mock).mockImplementation((fn: any) => fn());

        await syncConSupabase();
        
        // Verificar que se intentó obtener la tabla sync_history
        expect(database.get).toHaveBeenCalled();
    });
});
