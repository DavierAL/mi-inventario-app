// ARCHIVO: src/hooks/useAnalytics.ts
import { useMemo } from 'react';
import { useInventarioStore } from '../store/useInventarioStore';
import { formatearFecha } from '../utils/fecha';

export const useAnalytics = () => {
  const inventario = useInventarioStore((state) => state.inventario);

  return useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let sanos = 0, riesgo = 0, vencidos = 0;
    let capitalPerdido = 0;
    const conteoMarcasRiesgo: Record<string, number> = {};
    const recomendaciones: string[] = [];

    inventario.forEach((item) => {
      // Ignorar productos sin FV o sin stock
      if (!item.FV_Actual || item.Stock_Master <= 0) return;

      const fvFormateada = formatearFecha(item.FV_Actual);
      if (!fvFormateada.includes('/')) return; // Salvaguarda extra

      const [dia, mes, anio] = fvFormateada.split('/');
      const fechaVencimiento = new Date(Number(anio), Number(mes) - 1, Number(dia));
      const diffDias = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
      
      const marca = item.Marca || 'Sin Marca';

      if (diffDias < 0) {
        vencidos += item.Stock_Master;
        // Sumamos el capital perdido (Precio Tienda * Stock)
        capitalPerdido += (item.Precio_Tienda * item.Stock_Master);
        
        // Insight Automático: Retirar del anaquel
        if (item.Stock_Master >= 5) {
          recomendaciones.push(`🔴 Acción requerida: Retirar ${item.Stock_Master} unds. de ${item.Descripcion} (Cód: ${item.Cod_Barras}). Producto vencido.`);
        }
      } else if (diffDias <= 30) {
        riesgo += item.Stock_Master;
        // Agrupar marcas en riesgo
        conteoMarcasRiesgo[marca] = (conteoMarcasRiesgo[marca] || 0) + item.Stock_Master;
      } else {
        sanos += item.Stock_Master;
      }
    });

    const totalFisico = sanos + riesgo + vencidos;
    const saludPorcentaje = totalFisico === 0 ? 100 : Math.round((sanos / totalFisico) * 100);

    // Insight Automático de Marcas
    const marcasOrdenadas = Object.entries(conteoMarcasRiesgo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3

    marcasOrdenadas.forEach(([marca, cant]) => {
      if (cant > 10) {
        recomendaciones.push(`🟠 Estrategia: ${marca} tiene ${cant} productos venciendo pronto. Sugerimos aplicar 20%-30% de descuento para rotarlos.`);
      }
    });

    return {
      saludPorcentaje,
      capitalPerdido,
      datosDona: [
        { name: 'Sanos', stock: sanos, color: '#38A169', legendFontColor: '#4A5568' },
        { name: 'En Riesgo', stock: riesgo, color: '#DD6B20', legendFontColor: '#4A5568' },
        { name: 'Vencidos', stock: vencidos, color: '#E53E3E', legendFontColor: '#4A5568' },
      ],
      marcasRiesgo: marcasOrdenadas,
      recomendaciones,
      totalInventario: totalFisico
    };
  }, [inventario]);
};
