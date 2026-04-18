export const colors = {
  primary: '#1B4FD8',
  accent: '#00C896',
  danger: '#FF4D6D',
  background: '#0A0F1E',
  surface: '#111827',
  surface2: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
} as const;

export const fonts = {
  display: 'Sora, sans-serif',
  body: 'DM Sans, sans-serif',
} as const;

export const radii = {
  card: '16px',
  button: '12px',
} as const;

export function formatMXN(amount: number): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
