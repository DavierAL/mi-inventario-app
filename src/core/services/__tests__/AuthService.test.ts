import { AuthService } from '../AuthService';
import { supabase } from '../../database/supabase';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('login exitoso retorna perfil de usuario', async () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { 
      id: 'user-123', 
      nombre: 'Test User', 
      email: 'test@test.com', 
      rol: 'admin', 
      activo: true,
      created_at: '2026-04-21T00:00:00Z',
      updated_at: '2026-04-21T00:00:00Z'
    };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
    });

    const result = await AuthService.login('test@test.com', 'pass123');

    expect(result.user).toBeDefined();
    expect(result.user?.rol).toBe('admin');
    expect(result.error).toBeUndefined();
  });

  test('login fallido retorna error de supabase', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ 
      data: { user: null }, 
      error: { message: 'Invalid credentials' } 
    });

    const result = await AuthService.login('wrong@test.com', 'wrong');

    expect(result.user).toBeNull();
    expect(result.error).toBe('Invalid credentials');
  });

  test('login falla si el perfil no existe en public.usuarios', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ 
      data: { user: { id: 'user-456' } }, 
      error: null 
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    });

    const result = await AuthService.login('test@test.com', 'pass123');

    expect(result.user).toBeNull();
    expect(result.error).toContain('Perfil no encontrado');
  });
});
