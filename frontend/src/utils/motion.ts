/**
 * HospedaFlow - Design System Motion Tokens
 * Directiva: "Emil Kowalski Skill"
 * Físicas de resortes calculadas para microinteracciones fluidas, táctiles y con latencia cero.
 */

export const springTouch = {
  type: 'spring' as const,
  mass: 0.6,
  stiffness: 380,
  damping: 24,
};

export const springSegment = {
  type: 'spring' as const,
  stiffness: 450,
  damping: 32,
};

export const springToast = {
  type: 'spring' as const,
  mass: 0.8,
  stiffness: 320,
  damping: 26,
};

export const springModal = {
  type: 'spring' as const,
  mass: 0.9,
  stiffness: 280,
  damping: 28,
};
