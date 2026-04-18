import { useMemo } from 'react';
import { calcularDiasRestantes } from '../../../core/utils/fecha';

import Producto from '../../../core/database/models/Producto';

export const useAnalytics = (productos: Producto[]) => {
  return useMemo(() => {
    let sanos = 0, riesgo = 0, vencidos = 0;
    let capitalPerdido = 0;
    const conteoMarcasRiesgo: Record<string, number> = {};
    const recomendaciones: string[] = [];

    productos.forEach((item) => {
      // Ignorar productos sin FV o sin stock
      if (!item.fvActualTs || item.stockMaster <= 0) return;

      const diffDias = calcularDiasRestantes(item.fvActualTs);
      
      const marca = item.marca;

      if (diffDias < 0) {
        vencidos += item.stockMaster;
        // Sumamos el capital perdido (Precio Tienda * Stock)
        capitalPerdido += (item.precioTienda * item.stockMaster);
        
        // Insight Automático: Retirar del anaquel
        if (item.stockMaster >= 5) {
          recomendaciones.push(`🔴 Acción requerida: Retirar ${item.stockMaster} unds. de ${item.descripcion} (Cód: ${item.codBarras}). Producto vencido.`);
        }
      } else if (diffDias <= 30) {
        riesgo += item.stockMaster;
        // Agrupar marcas en riesgo
        conteoMarcasRiesgo[marca] = (conteoMarcasRiesgo[marca] || 0) + item.stockMaster;
      } else {
        sanos += item.stockMaster;
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
  }, [productos]);
};

