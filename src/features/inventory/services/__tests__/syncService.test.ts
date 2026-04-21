import { syncConSupabase } from '../syncService';
import { database } from '../../../../core/database';
import { supabase } from '../../../../core/database/supabase';
import NetInfo from '@react-native-community/netinfo';
import { synchronize } from '@nozbe/watermelondb/sync';

// Mocks
jest.mock('@react-native-community/netinfo');
jest.mock('@nozbe/watermelondb/sync');

describe('SyncService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
            database,
            pullChanges: expect.any(Function),
            pushChanges: expect.any(Function),
        }));
    });

    it('registra el exito en el historial', async () => {
        (synchronize as jest.Mock).mockResolvedValue(undefined);
        const mockCreate = jest.fn();
        (database.get as jest.Mock).mockReturnValue({ create: mockCreate });
        (database.write as jest.Mock).mockImplementation(fn => fn());

        await syncConSupabase();
        
        expect(database.get).toHaveBeenCalledWith('sync_history');
        expect(mockCreate).toHaveBeenCalled();
    });
});
