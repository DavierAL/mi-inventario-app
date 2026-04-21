import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sheetsWebhookUrl = "https://script.google.com/macros/s/AKfycbzA1WD2lL_iQjOAlLW496LL0UCo-0S8625VO_iiHyLpJCI-glCIGYUM8K35qcpPbvB9vQ/exec";
    const appToken = "MascotifySecret2026";

    if (!sheetsWebhookUrl) {
      throw new Error("SHEETS_WEBHOOK_URL not configured");
    }

    const payload = await req.json();
    console.log("[sync-logistica-sheets] Webhook recibido:", JSON.stringify(payload, null, 2));

    // El payload de un Database Webhook de Supabase tiene la forma:
    // { type: 'INSERT'|'UPDATE'|'DELETE', table: 'envios', record: {...}, old_record: {...} }
    const { type, record } = payload;

    if (!record || type === 'DELETE') {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mapeo a los headers de la hoja logística del usuario (v6 simplified)
    const mappedData = {
      "Historial": record.url_foto || "",
      "Pedido": record.cod_pedido || "",
      "Contacto": record.cliente || "",
      "Distrito": record.distrito || "",
      "Teléfono": record.telefono || "",
      "GMaps": record.gmaps_url || "",
      "Referencia": record.referencia || "",
      "Comentarios": record.notas || "",
      "A pagar": record.a_pagar || 0,
      "Recaudado": record.recaudado || 0,
      "Operado por": record.operador || "",
      "Estado": record.estado || "Pendiente",
      "Forma pago": record.forma_pago || "",
      "Costo Envío": record.costo_envio || 0,
      "Tamaño": record.tamano || "",
      "Peso": record.peso || 0,
      "Bultos": record.bultos || 1,
      "Hora desde": record.hora_desde || "",
      "Hora hasta": record.hora_hasta || "",
      "Operación": type === 'INSERT' ? 'Nuevo' : 'Actualización',
    };

    console.log("[sync-logistica-sheets] Enviando a Sheets:", JSON.stringify(mappedData));

    const response = await fetch(sheetsWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accion: "sync_logistica",
        datos: mappedData,
        token: appToken,
      }),
    });

    const resText = await response.text();
    console.log("[sync-logistica-sheets] Respuesta de Sheets:", resText);

    return new Response(JSON.stringify({ status: "success", sheets_response: resText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[sync-logistica-sheets] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
