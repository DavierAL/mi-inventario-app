// supabase/functions/api-versiones/index.ts
//
// Endpoint público que retorna la versión activa más reciente de la app móvil.
// La app consulta esto al arrancar para saber si hay una actualización disponible.
//
// GET /functions/v1/api-versiones
// Response: { version, build_number, url_descarga, changelog, force_update }

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, jsonResponse, errorResponse } from '../_shared/helpers.ts';

// Usar anon key: este endpoint es público (la app no está autenticada al verificar versión)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Obtener plataforma del query param (ej: ?platform=android)
    const url      = new URL(req.url);
    const platform = url.searchParams.get('platform') || 'android';

    const { data: version, error } = await supabase
      .from('app_versions')
      .select('version, build_number, url_descarga, changelog, force_update, plataforma')
      .eq('activa', true)
      .in('plataforma', [platform, 'all'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!version) {
      return jsonResponse({
        version: '1.0.0',
        build_number: 1,
        url_descarga: null,
        changelog: null,
        force_update: false,
      });
    }

    return jsonResponse({
      success: true,
      ...version,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[api-versiones] Error:', msg);
    return errorResponse(msg, 500);
  }
});
