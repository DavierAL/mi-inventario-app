# Estrategia de Escalamiento: Flota Mascotify (30+ Motorizados)

Este documento detalla la arquitectura propuesta para la implementación de geolocalización en tiempo real y notificaciones automatizadas basadas en proximidad (ETA).

## 🛰️ 1. Arquitectura de Geolocalización (Local-First)

Para escalar a 30 motorizados sin degradar el rendimiento de la base de datos ni agotar la batería de los dispositivos:

### Seguimiento Adaptativo
- **Estado Reposo**: 0 pings (ahorro de batería).
- **Estado en Ruta**: Localización cada 500m o cada 2 minutos.
- **Estado Proximidad (< 1km)**: Alta precisión cada 30 segundos.

### Persistencia y Sincronización
- Las coordenadas se guardan localmente en una nueva tabla `motorizado_tracking` en **WatermelonDB**.
- El `SyncService` se encarga de subir los lotes de ubicación a Supabase en segundo plano, evitando llamadas bloqueantes.

---

## 🔔 2. Sistema de Notificaciones Inteligentes (ETA)

El objetivo es enviar mensajes automáticos a los clientes en los hitos de 30, 15, 5 minutos y "en puerta".

### Lógica de Cálculo
1. **Punto de Referencia**: Se requiere que cada `Envio` tenga coordenadas `lat/lng` del destino (obtenidas vía Geocoding al importar el pedido).
2. **Cálculo de Distancia/Tiempo**:
   - **Opción A (Lineal)**: Cálculo matemático simple (Haversine). Bajo costo, menor precisión en ciudades con tráfico.
   - **Opción B (Realista)**: Integración con **Google Distance Matrix API**. Proporciona tiempo real considerando tráfico.

### Flujo de Disparo (Trigger)
- **Background Task**: La App móvil monitorea la distancia entre la posición actual y el siguiente punto de entrega.
- **Evento**: Al cruzar los umbrales de tiempo, la App envía un evento a una **Supabase Edge Function** (`notify-customer`).
- **Canal**: La Edge Function utiliza un servicio de mensajería (WhatsApp/SMS) para enviar el texto predefinido.

---

## 🛠️ 3. Componentes Técnicos Necesarios

### Backend (Supabase)
- **Tabla `posiciones_motorizados`**: Histórico de rutas.
- **Edge Function `process-eta`**: Procesa la lógica de notificación para no sobrecargar el cliente móvil.
- **Extension `PostGIS`**: Habilitar en Postgres para consultas espaciales eficientes (ej: "¿Qué motorizado está más cerca de este pedido de emergencia?").

### Frontend (React Native + Expo)
- **`expo-location`**: Para seguimiento en segundo plano (Background Fetch).
- **`expo-task-manager`**: Para mantener el rastreo incluso con la app cerrada.
- **Mapa de Flota**: Panel administrativo para ver a los 30 motorizados en tiempo real sobre un mapa de calor.

---

## ❓ 4. Puntos para Debatir con el Usuario

Para refinar esta propuesta, necesito tu feedback en:

1. **Precisión del ETA**: ¿Es aceptable un cálculo basado en distancia lineal (más barato) o es mandatorio usar tráfico real (API de pago)?
2. **Control de Ruta**: ¿El sistema debe forzar la ruta al motorizado o él elige el orden? (Si el motorizado cambia el orden, el sistema de alertas de 30/15/5 min debe re-calcularse automáticamente).
3. **Privacidad del Motorizado**: ¿El rastreo es constante durante su jornada laboral o solo mientras tiene un pedido en estado "En Ruta"?
4. **Validación de Entrega**: ¿El aviso de "Estoy afuera" debe ser automático por GPS o el motorizado debe confirmarlo con un botón? (El GPS puede tener margen de error de ~20 metros).

---

## 📝 Reglas de Negocio a Considerar
- **Regla de Oro**: Ningún fallo en el sistema de GPS debe impedir que el motorizado registre la entrega manualmente (Local-First Priority).
- **Notificaciones**: Los mensajes no deben enviarse en horarios restringidos (ej: después de las 10 PM) a menos que sea un pedido expreso.
