# Contenido del archivo AI_RULES.md basado en la auditoría técnica previa
content = """# AI Development Rules - Mi Inventario App (Mascotify)

## 🏗️ 1. Arquitectura y SOLID
* **Separación de Responsabilidades (SRP):** Los repositorios (`Repository`) SOLO manejan persistencia. La lógica de orquestación debe ir en el Store (Zustand) o Use Cases.
* **Local-First Priority:** Siempre escribe primero en SQLite (WatermelonDB) y usa el motor de `syncService` para la propagación a la nube. Evita llamadas manuales a Supabase fuera del flujo de sincronización.
* **Desacoplamiento de Infraestructura:** No uses `XMLHttpRequest` o `fetch` directamente dentro de los componentes o repositorios de datos. Usa un servicio de API centralizado.

    ## 🔄 2. Sincronización y Performance (WatermelonDB + Supabase)
* **Batching:** Al realizar `pushChanges` a Supabase, nunca excedas el límite de 500 operaciones por lote. Implementa particionamiento (chunking) si los cambios superan este número.
* **Race Conditions:** No mezcles `synchronize()` con actualizaciones manuales `setDoc` en el mismo flujo de datos para evitar colisiones de estado.
* **FlashList:** Para listas largas (Inventario/Historial), usa siempre `@shopify/flash-list` con `estimatedItemSize` para mantener 60fps.
* **JSI Enable:** Asegúrate de que las consultas a la DB aprovechen el puente JSI de WatermelonDB para velocidad nativa.

## 🔐 3. Seguridad y Validación
* **Sanitización HTML:** Al generar reportes PDF (`expo-print`), cualquier string proveniente de la base de datos DEBE ser sanitizado para evitar ataques de XSS/HTML Injection.
* **Validación de Esquemas:** Usa `Zod` o validaciones manuales rigurosas al recibir datos de Supabase Functions o Supabase para evitar que datos corruptos rompan la base de datos local.
* **Secrets:** Nunca quemes (hardcode) URLs de webhooks o API Keys. Usa siempre `process.env.EXPO_PUBLIC_*`.

## 📅 4. Manejo de Datos y Tipado
* **Timezones:** Para inventarios en Perú, usa estrictamente el contexto local para fechas de vencimiento. Evita `getUTCDate()` en lógica de negocio crítica si esto desplaza el día de vencimiento.
* **Typing:** No uses `any`. Define interfaces en `src/core/types` y extiéndelas.
* **Naming:** Sigue la convención CamelCase para variables/funciones y PascalCase para componentes/clases.

## 📱 5. UI/UX (Notion Design System)
* **Design System:** Usa estrictamente la paleta de `core/ui/colores.ts`. No inventes colores inline.
* **Haptics:** Cada acción de éxito (`Success`) o error (`Error`) debe ir acompañada de `expo-haptics` para mejorar el feedback táctil.
* **Skeleton Loaders:** Usa los componentes de Skeleton mientras WatermelonDB resuelve las queries asíncronas.

## 🛠️ 6. Reglas Específicas del Agente
* **No genéricos:** Si el código propuesto no escala a nivel "Production-Ready", adviértelo.
* **Refactor First:** Si vas a añadir una funcionalidad a un archivo saturado (como `InventarioRepository`), propón primero una división del archivo.
"""