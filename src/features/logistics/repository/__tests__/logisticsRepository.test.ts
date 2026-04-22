import { LogisticsRepository } from '../logisticsRepository';
import { createTestDatabase } from '../../../../core/database/__tests__/databaseIntegration';
import Envio from '../../../../core/database/models/Envio';

// Polyfills para Node.js
(global as any).self = global;

// Desenmascaramos WatermelonDB para este test de integración
jest.unmock('@nozbe/watermelondb');
jest.unmock('@nozbe/watermelondb/adapters/lokijs');

// Reemplazamos la DB global con una instancia en memoria para el test
jest.mock('../../../../core/database', () => {
  const { createTestDatabase } = require('../../../../core/database/__tests__/databaseIntegration');
  return {
    database: createTestDatabase(),
  };
});

describe('LogisticsRepository Integration', () => {
    let db: any;

    beforeEach(async () => {
        const { database } = require('../../../../core/database');
        db = database;
        await db.write(async () => {
            await db.unsafeResetDatabase();
        });
    });

    it('debe actualizar el estado de un envío correctamente', async () => {
        let envio: Envio;
        
        // 1. Crear envío inicial
        await db.write(async () => {
            envio = await db.get('envios').create((e: any) => {
                e.codPedido = 'PED-123';
                e.cliente = 'Juan Perez';
                e.estado = 'PENDIENTE';
                e.createdAt = Date.now();
                e.updatedAt = Date.now();
            });
        });

        // 2. Actuar
        await LogisticsRepository.actualizarEstado(envio!, 'ENTREGADO');

        // 3. Verificar
        const envioActualizado = await db.get('envios').find(envio!.id);
        expect(envioActualizado.estado).toBe('ENTREGADO');
    });

    it('debe obtener un envío por ID', async () => {
        let envio: Envio;
        await db.write(async () => {
            envio = await db.get('envios').create((e: any) => {
                e.codPedido = 'PED-456';
                e.cliente = 'Maria Lopez';
                e.estado = 'PENDIENTE';
                e.createdAt = Date.now();
                e.updatedAt = Date.now();
            });
        });

        const resultado = await LogisticsRepository.obtenerPorId(envio!.id);
        expect(resultado.id).toBe(envio!.id);
        expect(resultado.codPedido).toBe('PED-456');
    });
});
