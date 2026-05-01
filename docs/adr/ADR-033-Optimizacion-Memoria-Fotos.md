# ADR-033: Optimización de Carga de Evidencias (Fotos) en React Native

## 1. Contexto
La aplicación sufría de cierres inesperados (Crashes / OOM) y fallos silenciosos al momento de subir fotos de evidencia de entrega (POD). 

El flujo anterior leía la imagen almacenada en disco y la convertía a un string Base64 enorme en memoria usando \FileSystem.readAsStringAsync\. Luego, usaba \decode\ de \ase64-arraybuffer\ para convertirla y enviarla a Supabase.
Esto causaba:
1. Alto consumo de memoria en el hilo de JavaScript (potencial Out of Memory).
2. Rechazos en Supabase Storage al usar \upsert: true\ debido a la falta de permisos \UPDATE\ en las políticas de almacenamiento para el rol \uthenticated\.

## 2. Decisión
1. **Migración a FormData**: Se reemplazó la lectura Base64 por un \FormData\ estándar. En React Native, esto permite que la API nativa de \etch\ transmita el archivo directamente desde el almacenamiento (usando el \uri\) sin cargarlo por completo en la memoria del hilo de JavaScript.
2. **Corrección de RLS en Storage**: Se añadieron las políticas \UPDATE\ y \SELECT\ explícitamente en el bucket \evidencias\ (usando la función resiliente \get_user_rol()\) para permitir el funcionamiento correcto del parámetro \upsert: true\.

## 3. Consecuencias
* **Rendimiento**: Se elimina el riesgo de \JavascriptException\ por saturación de memoria durante el procesamiento de la imagen.
* **Persistencia**: La URL de la foto ahora debería retornar y guardarse exitosamente en Supabase, apareciendo en el historial logístico local y propagándose a Google Sheets.
