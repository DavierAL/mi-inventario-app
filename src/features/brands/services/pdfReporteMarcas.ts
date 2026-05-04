import * as Print from 'expo-print';
import { MarcaEstado } from './marcasService';

export async function generarReporteMarcasPDF(
  atrasadas: MarcaEstado[],
  alDia: MarcaEstado[],
  noInventariar: MarcaEstado[]
): Promise<string> {
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fila = (marca: MarcaEstado, color: string) => `
    <tr style="background-color: ${color}; border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 10px; font-weight: 600;">${marca.nombre}</td>
      <td style="padding: 10px; text-align: center;">${marca.diasRango}</td>
      <td style="padding: 10px; text-align: center;">${marca.diasDesdeUltimoConteo === -1 ? 'Nunca' : marca.diasDesdeUltimoConteo}</td>
      <td style="padding: 10px; text-align: center;">${marca.proximoConteoEn <= 0 ? 'HOY' : marca.proximoConteoEn}</td>
    </tr>
  `;

  const seccion = (titulo: string, items: MarcaEstado[], colorHeader: string, colorFila: string) => {
    if (items.length === 0) return '';
    return `
      <h2 style="color: ${colorHeader}; margin-top: 30px; border-bottom: 2px solid ${colorHeader}; padding-bottom: 8px;">${titulo}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: ${colorHeader}; color: white;">
            <th style="padding: 10px; text-align: left;">Marca</th>
            <th style="padding: 10px; text-align: center;">Frecuencia (días)</th>
            <th style="padding: 10px; text-align: center;">Días desde último conteo</th>
            <th style="padding: 10px; text-align: center;">Próximo conteo en</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(m => fila(m, colorFila)).join('')}
        </tbody>
      </table>
    `;
  };

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #2D3748; }
          h1 { color: #1A202C; margin-bottom: 8px; }
          .fecha { color: #718096; font-size: 14px; margin-bottom: 24px; }
          table { font-size: 13px; }
          th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        </style>
      </head>
      <body>
        <h1>Control de Inventario por Marcas</h1>
        <div class="fecha">${fechaHoy}</div>

        ${seccion('⚠️ OJO! Aquí se debe hacer inventario', atrasadas, '#E53E3E', '#FFF5F5')}
        ${seccion('✅ Inventario al día', alDia, '#38A169', '#F0FFF4')}
        ${seccion('🚫 En estas marcas no se realiza conteo', noInventariar, '#718096', '#F7FAFC')}

        <p style="text-align: center; color: #A0AEC0; font-size: 11px; margin-top: 40px;">
          Generado por Mascotify App
        </p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html: htmlContent });
  return uri;
}
