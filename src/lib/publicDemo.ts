/**
 * Public demo vs live Management Portal.
 * Gated by Vite mode, not hostname guessing.
 */
export const isPublicDemo = import.meta.env.VITE_ADVISORTRACK_MODE === 'demo';
