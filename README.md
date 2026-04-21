# Mascotify — Supabase Backend


```
> El project ref lo encuentras en: Settings → General → Reference ID

### 3. Aplicar todas las migrations
```bash
supabase db push
```

### 4. Deployar las Edge Functions
```bash
supabase functions deploy webhook-woocommerce
supabase functions deploy cron-verificar-pagos
supabase functions deploy cron-completar-pedidos
supabase functions deploy api-versiones
```

### 5. Configurar secrets de las Edge Functions
```bash
supabase secrets set WOO_CONSUMER_KEY=your_consumer_key_here
supabase secrets set WOO_CONSUMER_SECRET=your_consumer_secret_here
supabase secrets set WOO_WEBHOOK_SECRET=your_webhook_secret_hmac
supabase secrets set WOO_STORE_URL=https://your-store.com/wp-json/wc/v3
```

### 6. Configurar el webhook en WooCommerce
En WooCommerce → Ajustes → Avanzado → Webhooks:
- Nombre: Mascotify Backend
- Estado: Activo
- Tema: Pedido creado
- URL de entrega: `https://YOUR_PROJECT.supabase.co/functions/v1/webhook-woocommerce`
- Versión API: WC/v3

### 7. Activar pg_cron para los triggers programados
En el Dashboard de Supabase → Database → Extensions → habilitar `pg_cron`
Luego ejecutar el migration 15 manualmente desde el SQL editor.

## Variables de entorno para la app

### App Móvil (Expo) — .env
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Panel Web (Next.js) — .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Roles del sistema

| Rol | Descripción |
|---|---|
| `almacen` | Operadores de almacén — escaneo, entradas, verificación de pedidos |
| `logistica` | Equipo de despacho — ControlSalida, Salva, Urbano |
| `atencion` | Atención al cliente — estados de pedidos, faltantes |
| `admin` | Gerencia — acceso total |

## Crear el primer usuario admin

Después de que alguien se registre con Supabase Auth, ejecutar en el SQL Editor:
```sql
INSERT INTO public.usuarios (id, nombre, email, rol)
VALUES (
  'UUID_DEL_USUARIO_AUTH',
  'Nombre Admin',
  'email@mascotify.pe',
  'admin'
);
```
