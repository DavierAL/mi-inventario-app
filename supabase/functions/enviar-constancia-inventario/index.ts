import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/helpers.ts';

interface RequestBody {
  pdfBase64: string;
  filename: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfBase64, filename } = (await req.json()) as RequestBody;

    if (!pdfBase64 || !filename) {
      return new Response(
        JSON.stringify({ error: 'Faltan pdfBase64 o filename' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const destinatarios = [
      'arielvega1974@gmail.com',
      'operaciones.masper@gmail.com',
      'mascotas.peruanas.sac@gmail.com',
      'caja.miraflores.mascotify@gmail.com',
    ];

    // Enviar email vía Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mascotify <no-reply@mascotify.pe>',
        to: destinatarios,
        subject: 'Control de Inventario por Marcas',
        text: 'Se adjunta el control de inventario de marcas indicado en el PDF.',
        attachments: [
          {
            filename,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend error: ${errText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
