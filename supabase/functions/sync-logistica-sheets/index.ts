/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnvioRecord {
  id: string;
  cod_pedido: string;
  estado: string;
  pod_url: string | null;
  url_foto: string | null;
  [key: string]: unknown; // Cumpliendo con Regla 5: usar unknown en lugar de any
}

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: EnvioRecord;
  envio_id?: string;
}

/**
 * sync-logistica-sheets
 * Relay entre Supabase y Google Sheets para trazabilidad de pedidos.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // REGLA 3.3: Decoupling Secrets
    const sheetsWebhookUrl = Deno.env.get("SHEETS_LOGISTICA_WEBHOOK_URL");
    const appToken = Deno.env.get("SHEETS_APP_TOKEN");

    if (!sheetsWebhookUrl || !appToken) {
      throw new Error("Missing environment variables: SHEETS_LOGISTICA_WEBHOOK_URL or SHEETS_APP_TOKEN");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    console.log("[sync-logistica-sheets] Payload recibido:", JSON.stringify(payload, null, 2));

    let record: EnvioRecord | null = null;

    // 1. Extracción del registro (Webhook de DB o Invocación Directa)
    if (payload.record && (payload.table === 'envios' || payload.table === 'pedidos')) {
      record = payload.record;
    } else if (payload.envio_id) {
      console.log("[sync-logistica-sheets] Fetching record for envio_id:", payload.envio_id);
      
      // REGLA: Selección explícita de columnas en lugar de select('*')
      const { data, error } = await supabase
        .from('envios')
        .select('id, cod_pedido, estado, pod_url, url_foto')
        .eq('id', payload.envio_id)
        .single();
      
      if (error || !data) throw new Error(`No se encontró el envío en DB: ${error?.message}`);
      record = data as EnvioRecord;
    }

    if (!record) {
      return new Response(JSON.stringify({ status: "ignored", message: "No record extracted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mapeo al formato exacto que espera el script de Google Sheets (doPost)
    const photoUrl = record.pod_url || record.url_foto || "";
    console.log(`[sync-logistica-sheets] Relay -> Pedido: ${record.cod_pedido}, Estado: ${record.estado}, Foto: ${photoUrl}`);

    const payloadForSheets = {
      table: 'Envios', 
      type: 'UPDATE',
      record: {
        ...record,
        url_foto: photoUrl,
        cod_pedido: record.cod_pedido || "",
        estado: record.estado || "Pendiente"
      }
    };

    // 3. Envío con token en URL (como lo requiere e.parameter.token en GAS)
    const targetUrl = new URL(sheetsWebhookUrl);
    targetUrl.searchParams.set("token", appToken);
    
    console.log("[sync-logistica-sheets] Enviando a Sheets...");

    const response = await fetch(targetUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadForSheets),
    });

    const resText = await response.text();
    console.log("[sync-logistica-sheets] Respuesta de Sheets:", resText);

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Relay exitoso a Google Sheets",
      sheets_response: resText 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[sync-logistica-sheets] Error Crítico:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

