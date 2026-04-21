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
      // 1. Intentar cargar desde WatermelonDB (Local-First)
      const localProfile = await AuthRepository.getLocalProfile();
      
      // 2. Verificar sesión en Supabase
      const session = await AuthService.getSession();

      if (session && localProfile && session.user.id === localProfile.id) {
        set({ user: localProfile, isAuthenticated: true, isLoading: false });
      } else if (!session) {
        // Si no hay sesión en Supabase, limpiamos local por seguridad
        await AuthRepository.clearLocalProfile();
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        // Hay sesión pero no perfil local, o IDs no coinciden
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (e) {
      console.error('[AuthStore] Error al restaurar sesión:', e);
      set({ isLoading: false });
    }
  },
}));
