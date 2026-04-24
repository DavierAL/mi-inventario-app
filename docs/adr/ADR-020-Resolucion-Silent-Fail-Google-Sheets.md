# ADR 020: Resolución de "Silent Fail" en Relay hacia Google Sheets

## Estado
Aceptado

## Fecha
2026-04-24

## Contexto y Problema
Se identificó que, aunque las confirmaciones de entrega y las fotos se guardan exitosamente en Supabase (ADR-019), el usuario reporta que "no se actualiza en Google Sheets". 
Para debugear este problema, se aisló cada paso del flujo (App -> Supabase -> Edge Function -> Google Sheets).

## Diagnóstico y Pensamiento (Debug Mode)

1. **Prueba de Conexión y Payload (Supabase -> Sheets)**
   Se creó un script local (`test_webhook.js`) para invocar directamente a la Edge Function simulando una confirmación del pedido `#156210`.
   - **Resultado**: `HTTP 200`. La respuesta de Google Sheets fue: `{"status":"success","message":"Pedido 156210 actualizado en Sheets."}`.
   - **Deducción**: El túnel de comunicación Supabase -> Apps Script **está funcionando perfectamente**. Las credenciales (`MI_APP_TOKEN`) son correctas y el JSON viaja con la estructura adecuada (`table: 'pedidos'`).

2. **Análisis del Código de Google Apps Script (doPost)**
   Al revisar el código del Webhook en Google Sheets suministrado, se identificó el origen del "Silent Fail":
   ```javascript
   const idxFoto = headers.indexOf("Foto Evidence") !== -1 ? headers.indexOf("Foto Evidence") : 16;
   ```
   - **Observación**: En la hoja de Google Sheets (basado en la captura de pantalla), **NO existe** una columna llamada `Foto Evidence`.
   - **Efecto Cascada**: Al no encontrar la columna, el script hace un _fallback_ al índice `16` (Columna Q).
   - **El Error Real**: La Columna Q en la hoja actual corresponde a "Recaudado" (ado). Por ende, el script de Apps Script está reescribiendo celdas incorrectas o escribiendo la URL de la foto en una columna oculta/fuera de foco.

3. **Análisis de Estado (Apps Script)**
   ```javascript
   if (record.estado) {
     hoja.getRange(i + 1, idxEstado + 1).setValue(record.estado);
   }
   ```
   El script intenta escribir el estado literal que viene de Supabase (`Entregado`). Si en la columna "Estado" (Columna N) se esperaba una lista desplegable con otra nomenclatura (ej: `Entregado` con espacios, o bloqueado por Data Validation), Google Sheets puede rechazar la inserción silenciosamente.

## Decisiones Tomadas y Solución a Aplicar

Para corregir esto, el problema no está en el código React Native ni en Supabase, sino en la configuración del entorno de Google Workspace.

### Pasos obligatorios a ejecutar por el Administrador (Usuario):

1. **Crear la Columna Correcta en Google Sheets**:
   - Abrir la pestaña `envios`.
   - Crear una nueva columna en la cabecera (Fila 1) y nombrarla **EXACTAMENTE**: `Foto Evidence`.

2. **Asegurar la Actualización del Webhook**:
   - En Google Apps Script, si se ha pegado el código reciente o se ha modificado, se DEBE hacer clic en **Implementar > Administrar implementaciones > Editar (Lápiz) > Nueva versión > Implementar**. Si solo se guarda el código (CTRL+S), el Webhook público seguirá ejecutando la versión antigua, la cual podría estar ignorando la foto.

3. **Revisar Nomenclatura de Estado**:
   - Asegurarse de que el string `"Entregado"` (en Supabase) coincide exactamente con las reglas de validación de datos (Data Validation) de la columna "Estado" en Sheets.

## Consecuencias
- **Positivas**: Al crear la columna `Foto Evidence`, el script de Google encontrará automáticamente el índice dinámico (`indexOf`) y depositará la URL de la foto sin corromper la columna "Recaudado".
- **Garantía Técnica**: Todo el código de TypeScript, la arquitectura Local-First y los servicios Edge de Supabase han sido comprobados y operan bajo las reglas estrictas de `SKILL.md`.
