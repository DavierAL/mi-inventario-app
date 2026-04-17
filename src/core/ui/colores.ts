// ARCHIVO: src/core/ui/colores.ts
// ─── Notion Design System ─────────────────────────────────────────────────────
// Ref: design.md — Warm Neutral palette, whisper borders, Notion Blue accents.

export const ThemeColors = {
    light: {
        // Backgrounds
        fondo: '#f6f5f4',              // Warm White — section alternation
        superficie: '#ffffff',          // Pure White — card surfaces
        superficieAlta: '#f6f5f4',     // Warm White — elevated card bg
        // Text
        textoPrincipal: 'rgba(0,0,0,0.95)',  // Near-Black — primary text
        textoSecundario: '#615d59',           // Warm Gray 500 — descriptions
        textoTerciario: '#a39e98',            // Warm Gray 300 — placeholders/captions
        // Borders
        borde: 'rgba(0,0,0,0.1)',      // Whisper Border — ultra-thin division
        // Accent
        primario: '#4ba042',           // Notion Blue — CTAs and interactive
        primarioActivo: '#6cc062ff',     // Active Blue — pressed state
        fondoPrimario: '#f2f9ff',      // Badge Blue Bg — tinted blue surface
        // Semantic
        error: '#d03212ff',              // Orange — warnings
        exito: '#1aae39',              // Green — confirmation
        // Inputs
        inputFondo: '#ffffff',
        inputDeshabilitado: '#f6f5f4',
        placeholder: '#a39e98',        // Warm Gray 300
        // BottomBar
        bottomBarFondo: '#ffffff',
        bottomBarIcono: '#a39e98',
        bottomBarIconoActivo: '#4ba042',
        // Extras
        bannerOfflineFondo: '#4a3000',
        bannerOfflineTexto: '#fff4d1',
        bannerOfflineBoton: '#f6c026',
        marcadorEscaner: '#4ba042',
        fondoBuscador: '#f6f5f4',
    },
    dark: {
        // Backgrounds — warm charcoal, NOT cold blue-gray
        fondo: '#1a1917',              // Warm Charcoal — main background
        superficie: '#232220',         // Warm Dark Surface — cards
        superficieAlta: '#2d2b29',    // Warm Dark High — elevated containers
        // Text
        textoPrincipal: 'rgba(255,255,255,0.92)',  // Near-White — primary text
        textoSecundario: '#a39e98',                  // Warm Gray 300 — secondary text
        textoTerciario: '#615d59',                   // Warm Gray 500 — muted text
        // Borders
        borde: 'rgba(255,255,255,0.1)',  // Whisper Border — dark mode
        // Accent
        primario: '#4ba042',             // Notion Blue — same in dark
        primarioActivo: '#6cc062ff',       // Active Blue
        fondoPrimario: '#044d16ff',        // Dark badge blue bg
        // Semantic
        error: '#f97316',               // Orange (lighter for dark bg)
        exito: '#22c55e',               // Green (lighter for dark bg)
        // Inputs
        inputFondo: '#232220',
        inputDeshabilitado: '#2d2b29',
        placeholder: '#615d59',
        // BottomBar
        bottomBarFondo: '#1a1917',
        bottomBarIcono: '#615d59',
        bottomBarIconoActivo: '#4ba042',
        // Extras
        bannerOfflineFondo: '#4a3000',
        bannerOfflineTexto: '#fff4d1',
        bannerOfflineBoton: '#f6c026',
        marcadorEscaner: '#4ba042',
        fondoBuscador: '#232220',
    },
};
