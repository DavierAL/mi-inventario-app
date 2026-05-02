import { EnviosService } from '../enviosService';
import { supabase } from '../../../../core/database/supabase';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('../../../../core/database/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.com/pod.jpg' } }),
      } as any),
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    } as any),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64data'),
  EncodingType: { Base64: 'base64' },
}));

describe('EnviosService', () => {
  const mockSupabaseId = '12345';
  const mockCodPedido = 'PED-001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subirFotoPOD', () => {
    it('debe subir la foto exitosamente y retornar la URL', async () => {
      const url = await EnviosService.subirFotoPOD('file://local/path.jpg', mockCodPedido);
      
      expect(supabase.storage.from).toHaveBeenCalledWith('evidencias');
      const mockStorage = (supabase.storage.from as jest.Mock)();
      expect(mockStorage.upload).toHaveBeenCalled();
      expect(url).toBe('https://supabase.com/pod.jpg');
    });

    it('debe retornar null si falla la subida', async () => {
      const mockStorage = (supabase.storage.from as jest.Mock)();
      (mockStorage.upload as jest.Mock).mockResolvedValueOnce({ error: { message: 'Upload error' } });
      const url = await EnviosService.subirFotoPOD('file://local/path.jpg', mockCodPedido);
      expect(url).toBeNull();
    });
  });

  describe('actualizarEstado', () => {
    it('debe actualizar el estado en Supabase correctamente', async () => {
      const mockDb = (supabase.from as jest.Mock)();
      const result = await EnviosService.actualizarEstado({
        supabaseRowId: mockSupabaseId,
        nuevoEstado: 'Entregado',
        podUrl: 'https://supabase.com/pod.jpg',
      });

      expect(supabase.from).toHaveBeenCalledWith('envios');
      expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining({
        estado: 'Entregado',
        url_foto: 'https://supabase.com/pod.jpg',
      }));
      expect(result.exito).toBe(true);
    });
  });

  describe('notificarSheets', () => {
    it('debe invocar la Edge Function de sincronización', async () => {
      await EnviosService.notificarSheets(mockSupabaseId);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('sync-logistica-sheets', {
        body: { envio_id: mockSupabaseId },
      });
    });
  });
});
