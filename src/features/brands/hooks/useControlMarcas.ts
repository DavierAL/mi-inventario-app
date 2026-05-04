import { useState, useEffect, useCallback, useMemo } from 'react';
import { database } from '../../../core/database';
import MarcaControl from '../../../core/database/models/MarcaControl';
import { MarcasService, MarcaEstado } from '../services/marcasService';
import { ErrorService } from '../../../core/services/ErrorService';

export function useControlMarcas() {
  const [marcas, setMarcas] = useState<MarcaControl[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarMarcas = useCallback(async () => {
    try {
      setCargando(true);
      const data = await MarcasService.obtenerMarcas();
      setMarcas(data);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      ErrorService.handle(err, { component: 'useControlMarcas', operation: 'cargarMarcas' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarMarcas();
    // Suscripción a cambios en tiempo real de la tabla local
    const subscription = database.get<MarcaControl>('marcas_control')
      .query()
      .observe()
      .subscribe((data) => {
        setMarcas(data);
      });
    return () => subscription.unsubscribe();
  }, [cargarMarcas]);

  const estados = useMemo(() => MarcasService.calcularEstado(marcas), [marcas]);
  const atrasadas = useMemo(() => MarcasService.marcasAtrasadas(estados), [estados]);
  const alDia = useMemo(() => MarcasService.marcasAlDia(estados), [estados]);
  const noInventariar = useMemo(() => MarcasService.marcasNoInventariar(estados), [estados]);

  const hayMarcasParaHoy = atrasadas.length > 0;
  const nombresMarcasHoy = atrasadas.map(m => m.nombre).join(', ');

  const enviarConstancia = useCallback(async (marcasAEnviar: MarcaEstado[]) => {
    try {
      // Actualizar ultimo_conteo de las marcas enviadas
      for (const estado of marcasAEnviar) {
        const marca = marcas.find(m => m.id === estado.id);
        if (marca) {
          await database.write(async () => {
            await marca.update((m: MarcaControl) => {
              m.ultimoConteo = new Date();
            });
          });
        }
      }
      return true;
    } catch (err) {
      ErrorService.handle(err, { component: 'useControlMarcas', operation: 'enviarConstancia' });
      return false;
    }
  }, [marcas]);

  return {
    cargando,
    error,
    estados,
    atrasadas,
    alDia,
    noInventariar,
    hayMarcasParaHoy,
    nombresMarcasHoy,
    recargar: cargarMarcas,
    enviarConstancia,
  };
}
