# ADR 026: Persistencia de Sesión de Usuario (Stay Logged In)

## Fecha
2026-05-01

## Contexto y Problema
Los usuarios reportaron que debían iniciar sesión cada vez que abrían la aplicación, incluso si no habían cerrado la sesión explícitamente. Esto se debía a que el cliente de Supabase no estaba configurado con un motor de persistencia para React Native, lo que provocaba que el token de autenticación (JWT) se perdiera al cerrar el proceso de la app.

## Decisiones y Solución

1.  **Configuración de `AsyncStorage` en Supabase**:
    - Se integró `@react-native-async-storage/async-storage` en la inicialización del cliente de Supabase (`src/core/database/supabase.ts`).
    - Esto permite que el SDK de Supabase guarde y recupere automáticamente el `access_token` y el `refresh_token` del almacenamiento persistente del dispositivo.

2.  **Refactorización de `AuthService`**:
    - Se extrajo la lógica de consulta de perfiles (`getProfile`) para que sea independiente del flujo de login.
    - Esto permite recuperar la información detallada del usuario (rol, nombre) incluso si solo se tiene el ID de la sesión persistida.

3.  **Mejora de `restoreSession` en Zustand**:
    - El flujo de restauración ahora prioriza la sesión de Supabase.
    - Si existe una sesión activa pero no hay un perfil en la base de datos local (WatermelonDB), el sistema intenta descargar automáticamente el perfil del servidor antes de redirigir al login, evitando fricción innecesaria para el usuario.

4.  **Sincronización mediante `onAuthStateChange`**:
    - Se añadió un listener global en `AppNavigator` para reaccionar a eventos de autenticación (como la expiración de tokens o el cierre de sesión desde otros dispositivos) en tiempo real.

## Consecuencias

### Positivas
- **UX Superior**: El usuario se mantiene logueado indefinidamente (o hasta que el token de refresco expire o cierre sesión manualmente).
- **Resiliencia**: La aplicación puede recuperar el estado del usuario incluso si los datos locales de WatermelonDB se limpian, siempre que la sesión de Supabase siga vigente.

### Negativas
- Ninguna. Se utiliza la implementación estándar recomendada por Supabase para React Native.
