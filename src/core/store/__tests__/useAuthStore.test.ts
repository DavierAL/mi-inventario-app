import { useAuthStore } from '../useAuthStore';
import { AuthService } from '../../services/AuthService';
import { AuthRepository } from '../../repository/AuthRepository';

jest.mock('../../services/AuthService');
jest.mock('../../repository/AuthRepository');

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().logout(); // Reset state
  });

  test('login exitoso actualiza estado y persiste localmente', async () => {
    const mockUser = { id: '123', nombre: 'Test', rol: 'admin' };
    (AuthService.login as jest.Mock).mockResolvedValue({ user: mockUser, error: null });
    (AuthRepository.saveLocalProfile as jest.Mock).mockResolvedValue(undefined);

    const success = await useAuthStore.getState().login('test@test.com', 'pass');

    expect(success).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(AuthRepository.saveLocalProfile).toHaveBeenCalledWith(mockUser);
  });

  test('restoreSession prioriza perfil local si hay sesion', async () => {
    const mockUser = { id: '123', nombre: 'Test', rol: 'admin' };
    (AuthRepository.getLocalProfile as jest.Mock).mockResolvedValue(mockUser);
    (AuthService.getSession as jest.Mock).mockResolvedValue({ user: { id: '123' } });

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  test('restoreSession limpia estado si no hay sesion en Supabase', async () => {
    (AuthService.getSession as jest.Mock).mockResolvedValue(null);
    (AuthRepository.clearLocalProfile as jest.Mock).mockResolvedValue(undefined);

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(AuthRepository.clearLocalProfile).toHaveBeenCalled();
  });
});
