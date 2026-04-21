import { database } from './index';
import { benchmark } from '../utils/benchmark';

describe('Database CRUD & Performance', () => {
  test('Insert Batch Performance (100 items)', async () => {
    const { metrics } = await benchmark('DB Batch Insert 100', async () => {
      await database.write(async () => {
        const table = database.get('productos');
        for (let i = 0; i < 100; i++) {
          // Mock create - In real tests with Watermelon we use a real DB, 
          // here we rely on the mock setup in jest.setup.js
          await (table as any).create(); 
        }
      });
    });

    expect(metrics.durationMs).toBeLessThan(200);
  });

  test('Query Fetch Performance', async () => {
      const { metrics } = await benchmark('DB Query Fetch', async () => {
          await database.get('pedidos').query().fetch();
      });
      
      expect(metrics.durationMs).toBeLessThan(50);
  });
});
