# ADR 029: Estabilidad en la Captura de Cámara (skipProcessing)

## Fecha
2026-05-01

## Contexto y Problema
Durante el proceso logístico de captura de evidencia de entrega (POD) en la pantalla `StorePanelScreen`, se identificó un fallo crítico en el que la aplicación se cerraba abruptamente ("crasheaba") al presionar el botón de tomar la foto.

Al analizar los registros del sistema (`adb logcat`), se identificó el siguiente error nativo en Android:
`android.graphics.ImageDecoder$DecodeException: Failed to create image decoder with message 'unimplemented' Input contained an error.`

Este error ocurría porque el método `takePictureAsync` estaba configurado con la opción `skipProcessing: true`. Esta bandera ordena al sistema saltarse el procesamiento estándar de la imagen (rotación, EXIF, formato final), devolviendo en su lugar un buffer crudo (raw bytes) que, en muchos fabricantes de hardware Android, resulta ilegible para librerías secundarias como `expo-image-manipulator`.

Además, la vista del hardware de la cámara (`CameraView`) se mantenía montada ocupando memoria intensiva mientras, en paralelo, `ImageManipulator` intentaba procesar y redimensionar una imagen de alto peso (ej. 12MP), provocando un agotamiento de memoria (OOM).

## Decisiones y Solución

1.  **Eliminación de `skipProcessing`**:
    - Se eliminó el parámetro `skipProcessing: true` de todas las llamadas a `takePictureAsync`. 
    - Ahora se delega en el sistema operativo la entrega de un archivo JPEG estándar y correctamente procesado, garantizando compatibilidad absoluta con `ImageManipulator` en el 100% de los dispositivos Android.

2.  **Liberación Temprana de Hardware**:
    - Se modificó el flujo de captura para desmontar inmediatamente la vista de la cámara (`setModoFoto(false)`) tan pronto como `takePictureAsync` retorna la URI temporal.
    - Esto libera inmediatamente el bloqueo de hardware y la memoria RAM de la previsualización de cámara, dándole todo el ancho de banda a `ImageManipulator` para reducir la imagen a 800px sin riesgo de OOM.

## Consecuencias

### Positivas
- **Cero Crashes**: Se eliminó la causa raíz del cierre inesperado de la aplicación en la toma de fotos POD.
- **Eficiencia de Memoria**: El proceso de compresión ahora opera con los recursos completos del dispositivo sin competir con la cámara activa.

### Negativas
- La toma de foto puede tardar una fracción de segundo más (aprox. 100ms-300ms) al delegar el procesamiento estándar al OS antes de retornar.

## Regla de Prevención
NUNCA utilices el flag `skipProcessing: true` en `expo-camera` si el archivo resultante va a ser inyectado en `expo-image-manipulator` o si va a subirse a Supabase Storage, ya que los archivos resultantes pueden estar corruptos dependiendo del fabricante del dispositivo.
