import { useMemo } from 'react';
import { useTheme } from '../../../core/ui/ThemeContext';
import { calcularDiasRestantes } from '../../../core/utils/fecha';

import Producto from '../../../core/database/models/Producto';

export const useAnalytics = (productos: Producto[]) => {
  const { colors } = useTheme();

  return useMemo(() => {
    let sanos = 0, riesgo = 0, vencidos = 0;
    let capitalPerdido = 0;
    const conteoMarcasRiesgo: Record<string, number> = {};
    const recomendaciones: string[] = [];

    productos.forEach((item) => {
      // Ignorar productos sin FV o sin stock o si item no existe
      if (!item || !item.fvActualTs || (item.stockMaster ?? 0) <= 0) return;

      const diffDias = calcularDiasRestantes(item.fvActualTs);
      
      const marca = item.marca || 'Genérico';
      const stock = item.stockMaster ?? 0;
      const precio = item.precioTienda ?? 0;

      if (diffDias < 0) {
        vencidos += stock;
        // Sumamos el capital perdido (Precio Tienda * Stock)
        capitalPerdido += (precio * stock);
        
        // Insight Automático: Retirar del anaquel
        if (stock >= 5) {
          recomendaciones.push(`🔴 Acción requerida: Retirar ${stock} unds. de ${item.descripcion || 'Producto'}. Vencido.`);
        }
      } else if (diffDias <= 30) {
        riesgo += stock;
        // Agrupar marcas en riesgo
        conteoMarcasRiesgo[marca] = (conteoMarcasRiesgo[marca] || 0) + stock;
      } else {
        sanos += stock;
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
        recomendaciones.push(`🟠 Estrategia: ${marca} tiene ${cant} productos venciendo pronto. Sugerimos rotación acelerada.`);
      }
    });

    return {
      saludPorcentaje,
      capitalPerdido,
      datosDona: [
        { name: 'Sanos', stock: sanos, color: colors.exito, legendFontColor: colors.textoSecundario },
        { name: 'En Riesgo', stock: riesgo, color: colors.primario, legendFontColor: colors.textoSecundario },
        { name: 'Vencidos', stock: vencidos, color: colors.error, legendFontColor: colors.textoSecundario },
      ],
      marcasRiesgo: marcasOrdenadas,
      recomendaciones,
      totalInventario: totalFisico
    };
  }, [productos, colors]);
};

