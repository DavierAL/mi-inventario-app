import { useEffect, useState } from 'react';
import { syncConFirebase } from '../../inventory/services/syncService';
import { MENSAJES } from '../../../core/constants/mensajes';

interface LogisticsSyncState {
  cargando: boolean;
  error: string | null;
  lastSync?: string;
}

/**
 * Hook para sincronizar pedidos desde Firestore a SQLite local.
 * Se ejecuta automáticamente al montar el componente.
 */
export function useLogisticsSync() {
  const [state, setState] = useState<LogisticsSyncState>({
    cargando: true,
    error: null,
    lastSync: undefined,
  });

  useEffect(() => {
    const iniciarSync = async () => {
      try {
        setState(prev => ({ ...prev, cargando: true, error: null }));
        await syncConFirebase();
        setState(prev => ({
          ...prev,
          cargando: false,
          lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        }));
      } catch (err) {
        console.error('[Logistics Sync Error]:', err);
        setState(prev => ({
          ...prev,
          cargando: false,
          error: MENSAJES.ERROR_CONEXION_REALTIME || 'Error al sincronizar pedidos'
        }));
      }
    };

    iniciarSync();
  }, []);

  const reSincronizar = async () => {
    try {
      setState(prev => ({ ...prev, cargando: true, error: null }));
      await syncConFirebase();
      setState(prev => ({
        ...prev,
        cargando: false,
        lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }));
    } catch (err) {
      console.error('[Logistics Re-Sync Error]:', err);
      setState(prev => ({
        ...prev,
        cargando: false,
        error: 'Error al resincronizar'
      }));
    }
  };

  return {
    ...state,
    reSincronizar
  };
}
