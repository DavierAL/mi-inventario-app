# 📱 Guía de Instalación y Mantenimiento

Este documento detalla el proceso para generar, instalar y actualizar la aplicación Mi Inventario en dispositivos Android usando tu entorno local (Java SDK  Android Studio).

---

## 🚀 1. Instalación Inicial (APK de Producción)

Para generar la versión final que funciona sin cables y de forma independiente:

### Paso A: Preparar el proyecto
Si es la primera vez o si has cambiado configuraciones profundas en `app.json`:
```powershell
npx expo prebuild --clean
```

### Paso B: Generar el instalable (APK)
```powershell
npx expo run:android --variant release
+```
*Este proceso generará el archivo `app-release.apk` en:*  
`C:/mi-inventario-app/android/app/build/outputs/apk/release/`

---

## 🔄 2. Actualizar la App (Después de cambios)

Si has modificado colores, lógica o UI y quieres ver esos cambios en la app instalada en tu celular:

### Paso A: Re-compilar el APK
Debes volver a ejecutar el comando de construcción para incluir los nuevos cambios:
```powershell
npx expo run:android --variant release
```

### Paso B: Enviar actualización al celular (vía Cable USB)
Usa el comando `adb` con la bandera `-r` (reinstall) para mantener tus datos actuales:
```powershell
adb install -r "C:/mi-inventario-app/android/app/build/outputs/apk/release/app-release.apk"
```

---

## 🧹 3. Mantenimiento y Limpieza

Si la compilación falla o el comportamiento de la app es errático ("cosas raras"), ejecuta estos pasos de limpieza:

### Limpiar Caché de Android (Gradle)
Borra los archivos temporales de compilación nativa:
```powershell
cd android
./gradlew clean
cd ..
```

### Limpiar Caché de Expo
Si los cambios de JavaScript no se reflejan:
```powershell
npx expo start -c
```

### Reseteo Total del Entorno Nativo
Si los errores de "CMake" o "Ninja" regresan (común en la New Architecture):
1. Borra la carpeta `android`.
2. Ejecuta: `npm install --legacy-peer-deps`
3. Ejecuta: `npx expo prebuild --clean`

---

## ⚠️ Notas Importantes

> [!IMPORTANT]
> **Versión de Producción (Release):** Esta versión no se conecta a tu computadora. Los cambios que hagas en el código NO se verán automáticamente; requiere que vuelvas a generar el APK e instalarlo con `adb install -r`.

> [!TIP]
> **Depuración:** Si necesitas probar cambios rápidos sin compilar el APK, usa `npx expo start --tunnel` y abre la app a través de **Expo Go**. Usa la versión APK solo cuando ya estés satisfecho con los cambios y quieras llevar la app al inventario físico.

---

*Última actualización: 17 de Abril, 2026*
