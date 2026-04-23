import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types/auth';

type Permission = 
  | 'view_inventory' 
  | 'edit_inventory' 
  | 'view_logistics' 
  | 'edit_logistics' 
  | 'view_analytics' 
  | 'view_history';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['view_inventory', 'edit_inventory', 'view_logistics', 'edit_logistics', 'view_analytics', 'view_history'],
  logistica: ['view_logistics', 'edit_logistics', 'view_history'],
  almacen: ['view_inventory', 'edit_inventory', 'view_history'],
  tienda: ['view_inventory', 'edit_inventory', 'view_history'],
  atencion: ['view_inventory', 'view_logistics', 'view_analytics'],
};

export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.rol] || [];
    return permissions.includes(permission);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.rol);
    }
    return user.rol === roles;
  };

  const canAccessTab = (tab: string): boolean => {
    switch (tab) {
      case 'lista': return hasPermission('view_inventory');
      case 'logistica': return hasPermission('view_logistics');
      case 'escaner': return hasPermission('view_inventory') || hasPermission('view_logistics');
      case 'historial': return hasPermission('view_history');
      case 'analytics': return hasPermission('view_analytics');
      default: return false;
    }
  };

  return {
    user,
    role: user?.rol,
    hasPermission,
    hasRole,
    canAccessTab,
  };
};
