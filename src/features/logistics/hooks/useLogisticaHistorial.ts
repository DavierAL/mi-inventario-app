import { useState, useEffect } from 'react';
import { database } from '../../../core/database';
import LogisticaHistorial from '../../../core/database/models/LogisticaHistorial';
import { Q } from '@nozbe/watermelondb';
import { useAuthStore } from '../../../core/store/useAuthStore';

export const useLogisticaHistorial = () => {
  const [entradas, setEntradas] = useState<LogisticaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    const role = user?.rol;
    const conditions: any[] = [];

    if (role === 'logistica') {
      conditions.push(Q.where('operador', 'Salva'));
    } else if (role === 'tienda') {
      conditions.push(Q.where('operador', Q.oneOf(['Tienda', 'Yango', 'Cabify'])));
    }
    
    conditions.push(Q.sortBy('timestamp', Q.desc));

    const subscription = database
      .get<LogisticaHistorial>('logistica_historial')
      .query(...conditions)
      .observe()
      .subscribe({
        next: (data) => {
          setEntradas(data);
          setCargando(false);
        },
        error: (err) => {
          console.error('[useLogisticaHistorial] Error:', err);
          setError('No se pudo cargar el historial');
          setCargando(false);
        }
      });

    return () => subscription.unsubscribe();
  }, []);

  return { entradas, cargando, error };
};
