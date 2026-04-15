/**
 * Workbook motion constants for JS-side consumers (Framer Motion, JS animation).
 * Color/font tokens live in css/tailwind.css @theme — consume via Tailwind utility classes.
 */
export const wbMotion = {
  micro: 150,
  ui: 250,
  reveal: 400,
  page: 600,
  ease: [0.2, 0.8, 0.2, 1] as const,
} as const

export const wbEase = 'cubic-bezier(.2,.8,.2,1)'
