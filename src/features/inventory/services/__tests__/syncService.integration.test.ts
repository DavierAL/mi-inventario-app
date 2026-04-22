import { syncConSupabase } from '../syncService';
import { createTestDatabase } from '../../../../core/database/__tests__/databaseIntegration';
import { supabase } from '../../../../core/database/supabase';
import NetInfo from '@react-native-community/netinfo';

// Polyfills para Node.js
(global as any).self = global;

// Desenmascaramos WatermelonDB para este test de integración
jest.unmock('@nozbe/watermelondb');
jest.unmock('@nozbe/watermelondb/decorators');
jest.unmock('@nozbe/watermelondb/adapters/lokijs');
jest.unmock('@nozbe/watermelondb/sync');

// Mocks de dependencias externas
jest.mock('@react-native-community/netinfo');

// Reemplazamos la DB global con una instancia en memoria para el test
jest.mock('../../../../core/database', () => {
  const { createTestDatabase } = require('../../../../core/database/__tests__/databaseIntegration');
  return {
    database: createTestDatabase(),
  };
});

describe('SyncService Integration', () => {
    let db: any;

    beforeEach(async () => {
        const { database } = require('../../../../core/database');
        db = database;
        await db.write(async () => {
            await db.unsafeResetDatabase();
        });
        
        (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
        jest.clearAllMocks();
    });

    it('debe descargar productos nuevos de Supabase e insertarlos en la DB local', async () => {
        // 1. Simular datos en Supabase
        const mockProductos = [
            {
                id: '1',
                cod_barras: '123456789',
                sku: 'SKU-001',
                descripcion: 'Producto 1',
                stock_master: 10,
                precio_web: 15.0,
                precio_tienda: 18.0,
                marca: 'Marca A',
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: mockProductos, error: null }),
            upsert: jest.fn().mockResolvedValue({ error: null })
        });

        // 2. Ejecutar Sincronización
        await syncConSupabase();

        // 3. Verificar que el producto existe en la DB local
        const productosLocales = await db.get('productos').query().fetch();
        console.log('[TestDebug] Full Product Raw:', JSON.stringify(productosLocales[0]._raw));
        expect(productosLocales.length).toBe(1);
        expect(productosLocales[0].sku).toBe('SKU-001');
        
        // Verificar que se registró en el historial
        const historial = await db.get('sync_history').query().fetch();
        expect(historial.length).toBe(1);
        expect(historial[0].status).toBe('SUCCESS');
    });

    it('debe subir cambios locales a Supabase', async () => {
        // 1. Crear producto local con cambios pendientes
        await db.write(async () => {
            await db.get('productos').create((p: any) => {
                p._raw.id = 'local-1';
                p._raw.sku = 'SKU-LOCAL';
                p._raw.cod_barras = '1234567890';
                p._raw.stock_master = 50;
                p._raw.created_at = Date.now();
                p._raw.updated_at = Date.now();
            });
        });

        const upsertMock = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
            upsert: upsertMock
        });

        // 2. Ejecutar Sincronización
        await syncConSupabase();

        // 3. Verificar que se llamó a upsert con los datos locales
        expect(upsertMock).toHaveBeenCalled();
        const callArgs = upsertMock.mock.calls[0][0];
        expect(callArgs[0].sku).toBe('SKU-LOCAL');
    });
});
