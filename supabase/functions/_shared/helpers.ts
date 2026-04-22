// supabase/functions/_shared/helpers.ts
// Funciones compartidas entre Edge Functions

// ─── CORS headers para las Edge Functions ────────────────────────────────────

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function corsResponse(status = 200): Response {
  return new Response('ok', { headers: CORS_HEADERS, status });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    status,
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status);
}

