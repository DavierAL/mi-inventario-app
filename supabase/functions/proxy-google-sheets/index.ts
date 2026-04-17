import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Validate Method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get Secrets
    const sheetsWebhookUrl = Deno.env.get("SHEETS_WEBHOOK_URL");
    const appToken = Deno.env.get("APP_TOKEN");

    if (!sheetsWebhookUrl || !appToken) {
      console.error("Missing configuration: SHEETS_WEBHOOK_URL or APP_TOKEN");
      return new Response(
        JSON.stringify({ error: "Function configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse Payload
    const payload = await req.json();
    console.log("[proxy-google-sheets] Enviando petición a Google Sheets", payload);

    // 5. Proxy to Google Apps Script
    const fetchResponse = await fetch(sheetsWebhookUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "text/plain;charset=utf-8",
        "X-Auth-Token": appToken,
      },
      body: JSON.stringify({
        accion: "webhook_modificacion",
        datos: payload,
        token: appToken,
      }),
    });

    const responseText = await fetchResponse.text();

    // 6. Return response
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
