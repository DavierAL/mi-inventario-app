import { useState, useEffect } from 'react';
import { database } from '../../../core/database';
import LogisticaHistorial from '../../../core/database/models/LogisticaHistorial';
import { Q } from '@nozbe/watermelondb';

export const useLogisticaHistorial = () => {
  const [entradas, setEntradas] = useState<LogisticaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = database
      .get<LogisticaHistorial>('logistica_historial')
      .query(Q.sortBy('timestamp', Q.desc))
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
