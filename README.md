# Mascotify — Supabase Backend


```
> El project ref lo encuentras en: Settings → General → Reference ID

### 3. Aplicar todas las migrations
```bash
supabase db push
```

### 4. Deployar las Edge Functions
```bash
supabase functions deploy api-versiones
supabase functions deploy sync-logistica-sheets
```

### 5. Configurar el sistema de Envíos
El sistema utiliza sincronización directa con Supabase y notificaciones a Google Sheets a través de Edge Functions.


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
