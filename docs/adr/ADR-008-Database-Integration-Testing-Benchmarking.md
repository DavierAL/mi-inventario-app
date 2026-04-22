# ADR 008: Infraestructura de Pruebas de Integración y Benchmarking

## Status
Accepted

## Contexto
Aunque existía una estrategia de pruebas unitarias (ADR 006), las pruebas dependían excesivamente de mocks manuales para WatermelonDB. Esto impedía validar la lógica real de persistencia, consultas complejas (Q) y procesos de sincronización de manera confiable. Además, no se disponía de métricas objetivas para monitorear el rendimiento de la base de datos local en diferentes versiones de la app.

## Decisión
1. **Infraestructura de Integración Real**: Implementar un helper (`databaseIntegration.ts`) que utiliza el adaptador `LokiJS` con la opción `useMemory: true` y `useWebWorker: false`. Esto permite ejecutar una instancia real de WatermelonDB en el entorno de Node.js (Jest) sin dependencias nativas de SQLite.
2. **Benchmarking Automatizado**: Crear un sistema de métricas (`scripts/benchmark-db.ts`) para medir latencias de:
   - Escritura secuencial (Insert).
   - Lectura con filtros complejos (Query).
   - Actualizaciones masivas (Batch).
3. **Automatización CI/CD**: Integrar el flujo de calidad completo en GitHub Actions:
   - Validación de tipos estáticos (`tsc --noEmit`).
   - Generación de reportes de cobertura como artefactos.
   - Ejecución del benchmark en cada integración para detectar regresiones de rendimiento.
4. **Habilitación de Decoradores en Tests**: Se decidió desenmascarar (`jest.unmock`) los decoradores reales de WatermelonDB en los tests de integración para garantizar que el mapeo de propiedades (camelCase a snake_case) funcione exactamente como en producción.

## Consecuencias
- **Positivo**: Mayor fiabilidad en los tests de sincronización (se detectó un bug de columnas faltantes durante la implementación).
- **Positivo**: Capacidad de medir el impacto de cambios en el esquema sobre el rendimiento.
- **Positivo**: Eliminación de deuda técnica en los tests de repositorios.
- **Negativo**: Mayor complejidad en la configuración de Jest (requiere pollyfills como `global.self` y `global.Worker`).
- **Neutral**: El benchmark corre en memoria, por lo que los resultados son relativos y sirven principalmente para detectar regresiones de lógica, no limitaciones físicas del dispositivo.
