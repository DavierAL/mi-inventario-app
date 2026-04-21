export type UserRole = 'admin' | 'logistica' | 'tienda' | 'almacen' | 'atencion';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
