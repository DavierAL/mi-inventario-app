// ARCHIVO: src/core/ui/tokens.ts
/**
 * Design Tokens — La "métrica" única del sistema visual.
 * Basado en una escala de 4px/8px para armonía total.
 */

export const TOKENS = {
    // ─── Espaciado ──────────────────────────────────────────────────────────
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
        huge: 48,
    },

    // ─── Radios de Borde ────────────────────────────────────────────────────
    radius: {
        sm: 4,
        md: 6,    // El "sweet spot" de Notion
        lg: 12,
        full: 9999,
    },

    // ─── Tipografía (Outfit o System) ───────────────────────────────────────
    typography: {
        font: {
            regular: 'Inter-Regular', // Asumiendo que están cargadas o usa System
            medium: 'Inter-Medium',
            bold: 'Inter-Bold',
        },
        size: {
            h1: 28,
            h2: 22,
            h3: 18,
            body: 14,
            small: 12,
            tiny: 10,
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.6,
        }
    },

    // ─── Sombras (Whisper Shadows) ──────────────────────────────────────────
    shadows: {
        light: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
        }
    }
};
