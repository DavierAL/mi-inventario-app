import { create } from 'zustand';
import { AuthService } from '../services/AuthService';
import { AuthRepository } from '../repository/AuthRepository';
import { AuthState, UserProfile } from '../types/auth';

interface AuthActions {
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, pass) => {
    set({ isLoading: true, error: null });
    const { user, error } = await AuthService.login(email, pass);

    if (error) {
      set({ error, isLoading: false });
      return false;
    }

    if (user) {
      await AuthRepository.saveLocalProfile(user);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({ isLoading: false });
    return false;
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
      await AuthRepository.clearLocalProfile();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (e) {
      console.error('[AuthStore] Error logout:', e);
      set({ isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      // 1. Verificar sesión en Supabase (ahora persistida via AsyncStorage)
      const session = await AuthService.getSession();

      if (!session) {
        await AuthRepository.clearLocalProfile();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // 2. Intentar cargar desde WatermelonDB (Local-First)
      const localProfile = await AuthRepository.getLocalProfile();
      
      if (localProfile && session.user.id === localProfile.id) {
        set({ user: localProfile, isAuthenticated: true, isLoading: false });
        return;
      }

      // 3. Si hay sesión pero no perfil local coherente, descargar desde el servidor
      const { profile, error } = await AuthService.getProfile(session.user.id);
      
      if (profile) {
        await AuthRepository.saveLocalProfile(profile);
        set({ user: profile, isAuthenticated: true, isLoading: false });
      } else {
        // Si no se pudo obtener el perfil, desloguear por seguridad
        await AuthService.logout();
        await AuthRepository.clearLocalProfile();
        set({ user: null, isAuthenticated: false, isLoading: false, error });
      }
    } catch (e) {
      console.error('[AuthStore] Error al restaurar sesión:', e);
      set({ isLoading: false });
    }
  },
}));
