// ARCHIVO: src/core/ui/shadows.ts
/**
 * SHADOWS - Tokens de sombreado para el Notion Design System.
 * Define elevaciones suaves y consistentes para tarjetas y elementos flotantes.
 */
export const SHADOWS = {
    CARD: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 9,
        elevation: 2,
    },
    // Elevación para elementos que deben destacar más (ej. FABs)
    FLOATING: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    }
};
