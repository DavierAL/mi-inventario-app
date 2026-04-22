import { PersistentQueue } from '../PersistentQueue';
import { database } from '../../../database';

// Mock del objeto Job
const createMockJob = (id: string, initialData = {}) => ({
    id,
    jobType: 'test',
    payload: '{}',
    status: 'PENDING',
    attempts: 0,
    ...initialData,
    update: jest.fn().mockImplementation(async (cb) => {
        const result = { ...initialData };
        await cb(result);
        return result;
    }),
    destroyPermanently: jest.fn().mockResolvedValue(undefined),
});

describe('PersistentQueue', () => {
    let queue: PersistentQueue;
    let mockTable: any;

    beforeEach(() => {
        queue = new PersistentQueue();
        mockTable = {
            create: jest.fn().mockImplementation(async (cb) => {
                const job = createMockJob('new-id');
                await cb(job);
                return job;
            }),
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn(),
            fetchCount: jest.fn(),
            find: jest.fn(),
        };
        (database.get as jest.Mock).mockReturnValue(mockTable);
        (database.write as jest.Mock).mockImplementation(fn => fn());
        jest.clearAllMocks();
    });

    it('encola trabajos correctamente', async () => {
        const job = await queue.enqueue('webhook' as any, { a: 1 } as any);
        
        expect(mockTable.create).toHaveBeenCalled();
        expect(job.id).toBe('new-id');
        expect(job.jobType).toBe('webhook');
    });

    it('obtiene el siguiente trabajo pendiente y lo marca como PROCESSING', async () => {
        const mockJob = createMockJob('2', { status: 'PENDING' });
        mockTable.fetch.mockResolvedValueOnce([mockJob]);
        
        const next = await queue.dequeue();
        
        expect(next).toBeDefined();
        expect(next?.id).toBe('2');
        expect(mockJob.update).toHaveBeenCalled();
    });

    it('actualiza reintentos en caso de fallo', async () => {
        const mockJob = createMockJob('3', { status: 'PENDING', attempts: 1 });
        mockTable.find.mockResolvedValueOnce(mockJob);
        
        await queue.updateRetry('3', Date.now(), 'Network Error');
        
        expect(mockTable.find).toHaveBeenCalledWith('3');
        expect(mockJob.update).toHaveBeenCalled();
    });

    it('marca un trabajo como completado', async () => {
        const mockJob = createMockJob('4');
        mockTable.find.mockResolvedValueOnce(mockJob);
        
        await queue.markComplete('4');
        
        expect(mockJob.update).toHaveBeenCalled();
    });
});
