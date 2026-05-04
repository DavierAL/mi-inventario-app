import Producto from '../../../core/database/models/Producto';

interface AuditData {
  manual: string;
  escaneado: number;
}

export const generateAuditPdf = async (
  marca: string,
  responsable: string,
  productos: Producto[],
  auditData: Record<string, AuditData>
) => {
  const fecha = new Date().toLocaleDateString('es-ES');
  
  const tableRows = productos.map(p => {
    const data = auditData[p.id] || { manual: '0', escaneado: 0 };
    const systemStock = p.stockMaster;
    
    // Calculate if it's a "yellow alert" (System > 0 but total count is 0)
    // Physical = System + Difference
    // But user said: "se pintan de amarillo ... cuando el inventario indica que hay una cantidad distinta de cero ... pero se mantiene vacía"
    // Wait, let's follow the user's image logic: if System > 0 and Dif is such that Physical is 0.
    const difManual = parseInt(data.manual, 10) || 0;
    const totalEscaneado = data.escaneado; 
    const difEscaneado = totalEscaneado !== 0 ? (totalEscaneado - systemStock) : 0;
    
    // Physical = System + Difference
    const difFinal = difManual !== 0 ? difManual : difEscaneado;
    const physical = systemStock + difFinal;
    
    // Alert: System > 0 but physical is 0
    const isAlert = systemStock > 0 && physical === 0;

    const imgUrl = p.imagen || 'https://via.placeholder.com/150';

    return `
      <tr style="${isAlert ? 'background-color: #FFFDE7;' : ''}">
        <td style="text-align: center;"><img src="${imgUrl}" style="width: 35px; height: 35px; object-fit: contain;" /></td>
        <td>${p.codBarras}</td>
        <td><strong>${p.sku}</strong></td>
        <td>${p.marca}</td>
        <td>N/A</td>
        <td>N/A</td>
        <td>N/A</td>
        <td>${p.descripcion}</td>
        <td style="text-align: center; font-weight: bold; background-color: #f9f9f9;">${systemStock}</td>
        <td style="text-align: center; font-weight: bold; color: ${difManual < 0 ? '#DC2626' : (difManual > 0 ? '#16A34A' : '#333')};">
          ${difManual === 0 ? '0' : (difManual > 0 ? '+' : '') + difManual}
        </td>
        <td style="text-align: center; font-weight: bold; color: ${difEscaneado < 0 ? '#DC2626' : (difEscaneado > 0 ? '#16A34A' : '#333')};">
          ${totalEscaneado === 0 ? '' : (difEscaneado > 0 ? '+' : '') + difEscaneado}
        </td>
        <td style="font-size: 8px;">${p.comentarios || ''}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .header-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; min-width: 150px; text-align: center; }
          .label { font-weight: bold; color: #666; font-size: 8px; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f4f4f4; border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 8px; }
          td { border: 1px solid #ddd; padding: 6px; }
          .footer-notes { margin-top: 30px; font-size: 8px; color: #444; border-top: 1px solid #eee; padding-top: 10px; }
          .btn-enviar { background-color: #DC2626; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-box">
            <div class="label">Marca:</div>
            <div class="value">${marca}</div>
          </div>
          <div class="header-box">
            <div class="label">Responsable:</div>
            <div class="value">${responsable}</div>
          </div>
          <div style="text-align: right;">
            <div class="btn-enviar">ENVIAR</div>
            <p style="margin-top: 5px;">Fecha: ${fecha}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Código Barras</th>
              <th>SKU</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th>Variante</th>
              <th>Peso / Un</th>
              <th>Descripción Larga</th>
              <th>Cant. en sistema</th>
              <th>Dif. conteo manual [1]</th>
              <th>Dif. conteo escaneado [2]</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer-notes">
          <p>[1] Recuerda que aquí no se deben ingresar las cantidades de productos en físico sino la DIFERENCIA. Por ejemplo si la cantidad en el sistema indica 4 unidades, pero al momento de contar encuentras 6 entonces debes poner 2 (es decir la diferencia entre la cantidad física y la que indica el sistema).</p>
          <p>[2] Las celdas que se pintan de amarillo son posibles alertas, ya que el inventario indica que hay una cantidad distinta de cero, por lo tanto al final del conteo se esperaría que en esa celda haya un valor, pero si se mantiene vacía significaría que no se encontró ningún producto físico de ese SKU.</p>
          <br>
          <p style="text-align: center;">Generado por Mi Inventario App</p>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
};
