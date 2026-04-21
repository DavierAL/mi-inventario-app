import { QueueService, WebhookPayload } from './QueueService';
import * as FileSystem from 'expo-file-system/legacy';
import { benchmark } from '../utils/benchmark';

jest.mock('expo-file-system/legacy');

describe('QueueService - Logic & Performance', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    test('Encolar operación y benchmark de persistencia', async () => {
        const payload: WebhookPayload = {
            codigoBarras: '7750123456789',
            nuevoStock: 10,
            nuevoComentario: 'Test update'
        };

        const { metrics } = await benchmark('Queue Enqueue', async () => {
            await QueueService.encolar(payload);
        });

        // La implementación actual usa database.write y OutboxJob
        // pero podemos verificar que no lanzó error y el benchmark es válido
        expect(metrics.durationMs).toBeLessThan(100);
    });

    test('Procesar cola con éxito', async () => {
        // Mock de lo que lee la cola
        // En la implementación real, lee de database.get('outbox_jobs')
        // Aquí podemos mockear el método leer del QueueService o el database
        
        const mockPayload: WebhookPayload = {
            codigoBarras: '7750123456789',
            nuevoStock: 20
        };

        // Mock fetch global
        global.fetch = jest.fn().mockResolvedValue({
            text: () => Promise.resolve(JSON.stringify({ status: 'success' }))
        });

        // Nota: QueueService.procesarCola usa this.leer() y database.write
        // Para un test unitario puro de lógica, podrías mockear _intentarEnvio
        const spyIntentar = jest.spyOn(QueueService, '_intentarEnvio').mockResolvedValue(true);
        
        // Mock leer para que devuelva un job
        jest.spyOn(QueueService, 'leer').mockResolvedValue([
            { 
                payload: JSON.stringify(mockPayload), 
                update: jest.fn(fn => fn({ status: 'COMPLETED' })) 
            } as any
        ]);

        await QueueService.procesarCola();
        
        expect(spyIntentar).toHaveBeenCalledWith(mockPayload);
        spyIntentar.mockRestore();
    });
});
