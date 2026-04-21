# ADR 006: Testing Strategy for Production-Ready Stability

## Status
Accepted

## Contexto
La aplicación ha crecido en complejidad arquitectónica (Sync, Queue, Animations). Mantener la estabilidad requiere un test coverage >90% para prevenir regresiones. Las dependencias nativas (Reanimated, SQLite) presentan desafíos para el entorno de pruebas de Node.js (Jest).

## Decisión
1. **Mocking Centralizado**: Todas las dependencias nativas se mokean en `jest.setup.js`. Se prefiere el uso de mocks oficiales (ej. `react-native-reanimated/mock`) pero se suplementan con mocks manuales para Worklets y JSI.
2. **Estrategia de Pirámide**:
   - **Unit Tests (70%)**: Lógica de servicios (`Sync`, `Queue`, `Utils`).
   - **Component Tests (20%)**: Verificación de renderizado y eventos de UI (`Button`, `Shimmer`).
   - **Integration Tests (10%)**: Flujos completos de datos.
3. **Mantenimiento de Versiones**: Debido a incompatibilidades de la arquitectura Fabric en React Native 0.81 con versiones antiguas, se migró a **Reanimated 4.3.0** (v4), asegurando compatibilidad con el entorno de build y manteniendo la estabilidad en Jest mediante mocks avanzados de `worklets`.
4. **Coverage Enforcement**: Se mantiene un threshold estricto del 90% en `jest.config.js` para asegurar que el código nuevo siempre esté probado.

## Consecuencias
- **Positivo**: Alta confianza en refactorizaciones y despliegues.
- **Positivo**: Documentación implícita a través de los tests.
- **Negativo**: Incremento en el tiempo de ejecución de tests (actualmente ~20-30s).
- **Neutral**: Requiere mantenimiento constante de los mocks al actualizar librerías nativas.
