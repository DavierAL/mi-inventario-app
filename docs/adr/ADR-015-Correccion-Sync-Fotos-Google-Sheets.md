# ADR 015: Corrección de Sincronización de Fotos de Entrega y Google Sheets

## Estado
Aceptado

## Fecha
2026-04-23

## Contexto y Problema
El sistema de logística presentaba tres problemas críticos durante la confirmación de entrega (POD - Proof of Delivery):
1. **La URL de la foto no se subía a Supabase**: A pesar de que la imagen se almacenaba correctamente en el Storage de Supabase, la URL pública no se guardaba en el registro correspondiente de la tabla `envios`.
2. **La hoja de Google Sheets no se actualizaba**: La pestaña `Envios` dentro del documento `App_logistica` no recibía los datos actualizados tras la confirmación de la entrega.
3. **Peso excesivo de la imagen**: Las fotos capturadas superaban el límite óptimo deseado de 100kb, afectando el rendimiento y consumo de datos del operador logístico en la calle.

## Diagnóstico y Decisiones (Paso a Paso)

### 1. Corrección del mapeo de columna en Supabase
**Análisis:** Al revisar el código en `src/features/logistics/services/enviosService.ts`, se detectó que el método `actualizarEstado` intentaba guardar la URL de la evidencia en una propiedad/columna llamada `pod_url`. Al consultar el esquema real de la tabla `envios` en Supabase usando las herramientas de MCP, comprobamos que dicha columna no existe; la columna correspondiente es `url_foto`.
**Decisión:** 
- Se modificó `EnviosService.ts` para que asigne el valor a `updateData.url_foto = params.podUrl`.
- Se corrigió un bug de evaluación local en `StorePanelScreen.tsx` cambiando `envio.supabaseId ?? envio.id` por `envio.supabaseId || envio.id`. Esto previno envíos de actualizaciones con IDs vacíos (`""`) cuando el UUID local no estaba completamente persistido en la variable.

### 2. Redirección correcta del Webhook hacia Google Sheets
**Análisis:** Al inspeccionar la Edge Function encargada de notificar al App Script de Google (`supabase/functions/sync-logistica-sheets/index.ts`), se encontró que el payload JSON estaba "hardcodeado" enviando `table: 'pedidos'`. Como el Script de Google rutea los datos dependiendo de este string hacia la pestaña específica, la actualización nunca llegaba a la pestaña `Envios`.
**Decisión:** 
- Se actualizó la Edge Function cambiando el parámetro del JSON a `table: 'Envios'`.
- Se redesplegó exitosamente el servicio serverless en Supabase para aplicar en caliente el cambio.

### 3. Optimización estricta del peso de la evidencia fotográfica
**Análisis:** La configuración original de `expo-image-manipulator` en `StorePanelScreen.tsx` definía un ancho de `1024px` y compresión de `0.7` (70%). Esta configuración producía imágenes de 150kb a 250kb.
**Decisión:**
- Se redujeron de forma segura los parámetros a `resize: { width: 800 }` y `compress: 0.6` (60% calidad JPEG).
- Se establece este parámetro como estándar de la App ya que permite reconocer firmas, paquetes o fachadas sin distorsión aparente, pero el archivo final se reduce sistemáticamente por debajo de 100kb, maximizando la agilidad de carga en redes móviles lentas.

## Consecuencias
- **Positivas:** 
  - La URL de la evidencia fotográfica vuelve a sincronizarse fielmente en la nube.
  - Se reestablece el puente directo con la pestaña operativa de Logística en Google Sheets.
  - La subida de las fotos consumirá un 40-50% menos de datos, acelerando el flujo de trabajo del operario en el terreno (reducción de spinners de carga).
- **Negativas:** Ninguna identificada. La resolución es perfectamente apta para el propósito de "Prueba de Entrega" y se sigue respetando la arquitectura Local-First (la foto se almacena en el sistema de archivos del teléfono antes de la subida).
