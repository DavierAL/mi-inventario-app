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
supabase secrets set WOO_CONSUMER_KEY=ck_827fa0bc7cd18f710b2e385de7d74c46ec4e3624
supabase secrets set WOO_CONSUMER_SECRET=cs_c3afc2adf2d6a3801e0c1b7454fc28e86004c173
supabase secrets set WOO_WEBHOOK_SECRET=tu_webhook_secret_hmac
supabase secrets set WOO_STORE_URL=https://mascotify.pe/wp-json/wc/v3
```

### 6. Configurar el webhook en WooCommerce
En WooCommerce → Ajustes → Avanzado → Webhooks:
- Nombre: Mascotify Backend
- Estado: Activo
- Tema: Pedido creado
- URL de entrega: `https://TU_PROJECT.supabase.co/functions/v1/webhook-woocommerce`
- Versión API: WC/v3

### 7. Activar pg_cron para los triggers programados
En el Dashboard de Supabase → Database → Extensions → habilitar `pg_cron`
Luego ejecutar el migration 15 manualmente desde el SQL editor.

## Variables de entorno para la app

### App Móvil (Expo) — .env
```
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### Panel Web (Next.js) — .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
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
