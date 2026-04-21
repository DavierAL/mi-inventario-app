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
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sheetsWebhookUrl = Deno.env.get("SHEETS_WEBHOOK_URL");
    const appToken = Deno.env.get("APP_TOKEN");

    if (!sheetsWebhookUrl || !appToken) {
      return new Response(
        JSON.stringify({ error: "Function configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    
    // Soporte para 'accion' (nuevo) o 'tipo' (legacy QueueService)
    const action = payload.accion || payload.tipo || "webhook_modificacion";
    
    // Si viene 'datos', los usamos, si no el payload completo
    const data = payload.datos || payload;

    console.log(`[proxy-google-sheets] Reenviando a Sheets. Acción: ${action}`);

    const fetchResponse = await fetch(sheetsWebhookUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "text/plain;charset=utf-8",
        "X-Auth-Token": appToken,
      },
      body: JSON.stringify({
        accion: action,
        datos: data,
        token: appToken,
      }),
    });

    const responseText = await fetchResponse.text();

    try {
      const json = JSON.parse(responseText);
      return new Response(JSON.stringify(json), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch {
      return new Response(JSON.stringify({ status: "success", raw: responseText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("[proxy-google-sheets] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
