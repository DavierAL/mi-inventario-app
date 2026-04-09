// ARCHIVO: src/core/utils/exportaciones.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const exportarReportePDF = async (salud: number, capitalPerdido: number, recomendaciones: string[]) => {
  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #2B6CB0; border-bottom: 2px solid #2B6CB0; padding-bottom: 10px; }
          .kpi-container { display: flex; justify-content: space-between; margin-top: 20px; }
          .kpi-box { background-color: #F7FAFC; padding: 15px; border-radius: 8px; width: 45%; text-align: center; border: 1px solid #E2E8F0; }
          .kpi-title { font-size: 12px; color: #718096; text-transform: uppercase; font-weight: bold; }
          .kpi-value { font-size: 24px; font-weight: bold; margin-top: 5px; color: #2D3748; }
          .danger { color: #E53E3E; }
          ul { background: #FFF5F5; padding: 20px 40px; border-radius: 8px; border: 1px solid #FEB2B2; }
          li { margin-bottom: 10px; color: #C53030; line-height: 1.5; }
        </style>
      </head>
      <body>
        <h1>Reporte de Calidad de Inventario</h1>
        <p>Generado automáticamente el: <strong>${new Date().toLocaleDateString('es-ES')}</strong></p>
        
        <div class="kpi-container">
          <div class="kpi-box">
            <div class="kpi-title">Salud del Inventario</div>
            <div class="kpi-value">${salud}%</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Capital en Riesgo / Perdido</div>
            <div class="kpi-value danger">S/ ${capitalPerdido.toFixed(2)}</div>
          </div>
        </div>

        <h2>Planes de Acción Sugeridos</h2>
        <ul>
          ${recomendaciones.map(r => `<li>${r}</li>`).join('')}
        </ul>
        <br>
        <p style="text-align:center; color:#A0AEC0; font-size:12px;">Generado por Mi Inventario App</p>
      </body>
    </html>
  `;

  try {
    // 1. Generar el archivo en la memoria del celular
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    // 2. Abrir el menú para compartir por WhatsApp/Correo
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error("Error al exportar PDF:", error);
  }
};
