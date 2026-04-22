---
name: reglas-mascotify
description: Reglas estrictas, arquitectura (WatermelonDB + Supabase) y convenciones obligatorias para editar el código del proyecto Mascotify. Usar siempre antes de modificar archivos.
---

> **INSTRUCCIÓN CRÍTICA:** Este archivo debe ser leído COMPLETO antes de realizar CUALQUIER modificación al proyecto.
> Si el agente no puede confirmar que lo ha leído, debe decirlo explícitamente antes de continuar.

---

## ⛔ REGLAS ABSOLUTAS (nunca romper bajo ninguna circunstancia)

### REGLA 0 — Primero entiende, luego actúa
Antes de editar CUALQUIER archivo, el agente debe:
1. Leer el archivo completo que va a modificar.
2. Identificar explícitamente qué líneas cambiará y por qué.
3. Confirmar que los cambios no afectan a otros archivos que importen o dependan del archivo editado.

Si el agente no puede hacer esto, debe pedir más contexto en lugar de proceder.

### REGLA 1 — Edita SOLO lo que se te pide
El agente NO debe:
- Modificar archivos que no fueron mencionados en la tarea.
- Refactorizar "de paso" código que no fue solicitado.
- Cambiar nombres de variables, funciones o componentes por "mejorar la legibilidad" a menos que se solicite explícitamente.
- Agregar nuevas dependencias en `package.json` sin aprobación explícita.
- Cambiar versiones de dependencias existentes sin aprobación explícita.
- Modificar archivos de configuración (`babel.config.js`, `tsconfig.json`, `app.json`, `eas.json`) sin instrucción directa.

### REGLA 2 — No tocar estos archivos salvo instrucción EXPLÍCITA
Los siguientes archivos son ZONA PROTEGIDA:
- `src/core/database/schema.ts` — El schema de WatermelonDB. Un error aquí rompe la BD local de todos los usuarios.
- `src/core/database/index.ts` — La inicialización de la BD. No tocar.
- `src/core/navigation/AppNavigator.tsx` — La navegación principal.
- `src/core/store/useAuthStore.ts` — El estado de autenticación.
- `jest.setup.js` — La configuración de mocks globales de tests.
- `babel.config.js` — La configuración del compilador.
- `tsconfig.json` — La configuración de TypeScript.
- `app.json` y `eas.json` — La configuración de Expo y builds.

Para modificar cualquiera de estos archivos, el agente debe:
1. Anunciar explícitamente: "Necesito modificar [archivo], que es zona protegida. Voy a hacer: [descripción exacta del cambio]."
2. Esperar confirmación antes de proceder.

### REGLA 3 — No eliminar código sin confirmación
El agente NO debe eliminar funciones, componentes o archivos completos sin que el usuario lo haya pedido de forma explícita. "Limpiar el código" no es autorización para borrar.

Si el agente identifica código que debería eliminarse, debe SEÑALARLO en su respuesta, no eliminarlo silenciosamente.

### REGLA 4 — No cambiar la arquitectura sin aprobación
La arquitectura establecida es:
```
features/
  [feature]/
    screens/     ← Solo componentes de UI, sin lógica de negocio directa
    hooks/       ← Lógica de UI y estado local del feature
    repository/  ← Acceso a datos (WatermelonDB local)
    services/    ← Lógica de negocio y acceso a Supabase
    store/       ← Estado global del feature (Zustand)
```

El agente NO debe:
- Mover lógica de `services/` a `screens/`.
- Poner llamadas directas a Supabase dentro de componentes React.
- Poner lógica de negocio dentro de `repository/`.
- Crear nuevas capas o carpetas sin aprobación.

---

## ✅ PRINCIPIOS DE CODIFICACIÓN

### TypeScript
- PROHIBIDO usar `any`. Si el tipo es desconocido, usar `unknown` y hacer narrowing.
- PROHIBIDO usar `// @ts-ignore` salvo en casos excepcionales documentados.
- Todas las interfaces nuevas van en `src/core/types/` o en el archivo `types.ts` local del feature.
- No duplicar tipos: si un tipo ya existe en `core/types/`, importarlo desde ahí.

### Arquitectura de Datos — LOCAL FIRST
- **WatermelonDB** es la fuente de verdad LOCAL. La UI siempre lee de aquí.
- **Supabase** es la fuente de verdad REMOTA. Los cambios llegan aquí vía sincronización o llamadas directas desde `services/`.
- NUNCA hacer llamadas directas a Supabase desde un componente React o un hook de UI.
- El flujo de escritura es siempre: `UI → Store → Service → Supabase` o `UI → Repository → WatermelonDB → SyncService → Supabase`.

### Supabase
- Siempre seleccionar columnas específicas: `select('id, nombre, estado')`, nunca `select('*')`.
- Siempre manejar el `error` retornado por Supabase antes de usar `data`.
- Para operaciones críticas, usar `.single()` en lugar de `.maybeSingle()` cuando se espera exactamente un resultado.

### React Native
- Para listas largas (>20 items), usar siempre `FlashList` de `@shopify/flash-list` con `estimatedItemSize`.
- No usar `ScrollView` para listas de datos dinámicos.
- El ancho de pantalla debe obtenerse con `useWindowDimensions()` dentro del componente, no con `Dimensions.get()` en el módulo.
- Los `StyleSheet.create()` van FUERA del componente (a nivel de módulo).

### React Hooks
- Nunca llamar un hook DESPUÉS de un `return` condicional (Rules of Hooks).
- Los hooks de datos (`useEffect`, `useMemo`, `useCallback`) deben tener sus dependencias completas.
- Para efectos de animación con Reanimated, `SharedValue` puede omitirse de las dependencias por ser estable, pero documentarlo.

### Performance
- Componentes que se renderizan en listas deben estar envueltos en `React.memo`.
- Funciones que se pasan como props a componentes hijos deben estar envueltas en `useCallback`.
- Valores calculados de alto costo deben estar en `useMemo`.

---

## 🎨 DESIGN SYSTEM

### Regla de Diseño 1 — No hardcodear colores
PROHIBIDO:
```tsx
<View style={{ backgroundColor: '#ffffff' }} />
<Text style={{ color: '#666666' }} />
```

CORRECTO:
```tsx
const { colors } = useTheme();
<View style={{ backgroundColor: colors.superficie }} />
<Text style={{ color: colors.textoSecundario }} />
```

Excepción: valores de opacidad y colores semánticos que no están en el tema (ej: `'rgba(0,0,0,0)'` para transparente).

### Regla de Diseño 2 — Usar tokens de espaciado
PROHIBIDO:
```tsx
<View style={{ padding: 16, margin: 8 }} />
```

CORRECTO:
```tsx
import { TOKENS } from '../../../core/ui/tokens';
<View style={{ padding: TOKENS.spacing.lg, margin: TOKENS.spacing.sm }} />
```

### Regla de Diseño 3 — Usar componentes del Design System
Para textos, botones, inputs y superficies, usar siempre los componentes de `src/core/ui/components/`:
- `<Text variant="body" />` en lugar de `<Text style={{ fontSize: 15 }} />`
- `<Button label="..." onPress={...} />` en lugar de `<TouchableOpacity />`
- `<Surface variant="elevated" />` en lugar de `<View style={{ elevation: 2 }} />`
- `<Input label="..." />` en lugar de `<TextInput />`
- `<Badge label="..." variant="success" />` en lugar de badges manuales

Solo se puede usar los componentes nativos de RN directamente en los componentes del propio Design System.

### Regla de Diseño 4 — Dark mode
Todo componente nuevo debe soportar dark mode usando `useTheme()`. Nunca asumir fondo blanco.

---

## 🔐 SEGURIDAD

### Variables de entorno
- Las variables con prefijo `EXPO_PUBLIC_` son visibles en el APK. NO poner credenciales secretas aquí.
- `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` son las ÚNICAS variables de Supabase que van en el cliente móvil.
- Las `Service Role Keys`, claves de terceros y secrets van SOLO en Supabase Edge Functions vía `Deno.env.get()`.

### Credenciales en código
- PROHIBIDO hardcodear URLs de APIs, keys, secrets o tokens en el código fuente.
- PROHIBIDO hacer `console.log` con datos del usuario (emails, IDs, estados de pedidos con info personal).

### Sanitización
- Al generar contenido HTML para PDFs con `expo-print`, siempre sanitizar strings provenientes de la BD para prevenir HTML injection.

---

## 🧪 TESTS

### Regla de Tests 1 — Convención de ubicación
Todos los archivos de test van en una carpeta `__tests__/` dentro del directorio del archivo que testean:
```
src/features/inventory/repository/
├── inventarioRepository.ts
└── __tests__/
    └── inventarioRepository.test.ts   ← CORRECTO
```
NO colocar archivos `.test.ts` en la raíz del directorio del feature.

### Regla de Tests 2 — No modificar mocks globales
El archivo `jest.setup.js` contiene mocks globales que afectan a TODOS los tests. Modificarlo puede romper tests que funcionan. Si se necesita un mock específico para un test, usar `jest.mock()` dentro del archivo de test correspondiente.

### Regla de Tests 3 — Buscar el texto real en el DOM
React Testing Library no procesa CSS. Si un componente tiene `textTransform: 'uppercase'` en estilos, el texto en el DOM es el original (minúsculas/capitalizado), no el transformado. Los tests deben buscar el texto tal como está en el código, o transformarlo en JS antes de renderizar.

---

## 📁 CONVENCIONES DE ARCHIVOS

### Naming
- Componentes React: `PascalCase.tsx` (ej: `ProductoCard.tsx`)
- Hooks: `camelCase.ts` con prefijo `use` (ej: `useInventarioStore.ts`)
- Servicios: `PascalCase.ts` con sufijo `Service` o `Repository` (ej: `EnviosService.ts`)
- Tipos: `PascalCase` para interfaces/types, `camelCase` para propiedades
- Constantes de módulo: `SCREAMING_SNAKE_CASE` (ej: `TOKENS`, `MENSAJES`)

### Exports
- Los screens y hooks se exportan con nombre (named export), no como default.
- Cada carpeta de feature tiene un `index.ts` que re-exporta las APIs públicas del feature.
- Los componentes internos de un feature NO se exportan en el `index.ts` si no son usados por otros features.

### Idioma
- Código (variables, funciones, tipos): inglés o español consistente dentro del archivo. No mezclar en el mismo scope.
- Comentarios y strings para el usuario: español.
- Logs de debugging: español con prefijo del módulo, ej: `[EnviosService] Error al subir foto`.

---

## 🔄 FLUJO DE SINCRONIZACIÓN — REGLAS ESPECÍFICAS

### WatermelonDB
- NUNCA hacer queries fuera de un componente React o un hook. Las queries van en `repository/` o dentro de hooks con `useMemo`.
- Para modificaciones a la BD local, usar siempre `database.write(async () => { ... })`.
- Los modelos de WatermelonDB son clases con decoradores. El agente NO debe modificar la estructura de decoradores sin entender cómo funciona el schema.

### Supabase Realtime / Sync
- El flujo de sincronización de `productos` usa WatermelonDB Sync (`synchronize()`). NO romper ni duplicar este flujo.
- El flujo de sincronización de `envios` usa llamadas directas a Supabase desde `services/`. Son flujos distintos con mecánicas distintas.
- La Edge Function `sync-logistica-sheets` se llama DESPUÉS de actualizar Supabase, no antes.

### Queue de Trabajos Offline
- Los jobs del queue son la red de seguridad para cuando no hay conexión.
- Un job que falla debe lanzar un `Error` para que el `QueueProcessor` lo reintente.
- Un job que tiene éxito no debe lanzar nada.
- Los payloads de los jobs deben ser serializables a JSON (sin `undefined`, sin funciones, sin instancias de clases).

---

## 🚫 PATRONES PROHIBIDOS

```typescript
// ❌ PROHIBIDO: any
const data: any = await supabase.from('envios').select('*');

// ❌ PROHIBIDO: select('*') en Supabase
const { data } = await supabase.from('envios').select('*');

// ❌ PROHIBIDO: llamada a Supabase dentro de un componente
export const MiComponente = () => {
    const handlePress = async () => {
        await supabase.from('envios').update(...); // ← MAL
    };
};

// ❌ PROHIBIDO: Dimensions en nivel de módulo
const WIDTH = Dimensions.get('window').width; // ← MAL (no actualiza al rotar)

// ❌ PROHIBIDO: hardcodear colores
<View style={{ backgroundColor: '#f6f5f4' }} />

// ❌ PROHIBIDO: hook después de return condicional
if (!datos) return <Loading />;
const valor = useMiHook(); // ← MAL: viola Rules of Hooks

// ❌ PROHIBIDO: console.log con datos de usuario en producción
console.log('Usuario logueado:', user.email, user.id); // ← Riesgo de privacy leak
```

---

## ✅ PATRONES RECOMENDADOS

```typescript
// ✅ CORRECTO: tipado explícito
const { data, error } = await supabase
    .from('envios')
    .select('id, cod_pedido, estado, pod_url')
    .eq('id', envioId)
    .single();

if (error) {
    console.error('[EnviosService] Error:', error.message);
    return { exito: false };
}

// ✅ CORRECTO: llamada a Supabase en el Service
export const EnviosService = {
    async actualizarEstado(...) {
        const { error } = await supabase.from('envios').update(...);
        // ...
    }
};

// ✅ CORRECTO: ancho de pantalla reactivo
const MiComponente = () => {
    const { width } = useWindowDimensions(); // ← Actualiza al rotar
};

// ✅ CORRECTO: colores del tema
const { colors } = useTheme();
<View style={{ backgroundColor: colors.superficie }} />

// ✅ CORRECTO: hooks siempre antes de returns condicionales
const valor = useMiHook(datos ?? []);
if (!datos) return <Loading />;
```

---

## 📋 CHECKLIST ANTES DE CADA RESPUESTA DEL AGENTE

Antes de proponer o aplicar cualquier cambio, el agente debe verificar internamente:

1. ¿Leí el archivo completo antes de modificarlo? ☐
2. ¿El cambio afecta solo lo que se me pidió? ☐
3. ¿Estoy modificando algún archivo de ZONA PROTEGIDA sin autorización? ☐
4. ¿Estoy usando `any` en algún lugar? ☐
5. ¿Hay alguna llamada a Supabase dentro de un componente React? ☐
6. ¿Los colores usan el Design System (`useTheme`)? ☐
7. ¿Los tests nuevos siguen la convención de ubicación (`__tests__/`)? ☐
8. ¿Hay imports no utilizados que agrego o dejo? ☐
9. ¿Rompí algún export existente que otro módulo usa? ☐
10. ¿El cambio es backwards compatible con WatermelonDB (no cambié el schema sin migración)? ☐

Si alguna respuesta es problemática, el agente debe SEÑALARLO antes de proceder.

---

*Este archivo es la fuente de verdad para el comportamiento del agente en este proyecto.
En caso de conflicto entre estas reglas y una instrucción del usuario, el agente debe señalar
el conflicto y pedir aclaración, en lugar de asumir.*
