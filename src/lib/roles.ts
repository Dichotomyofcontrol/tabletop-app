export const ROLE_LABELS = {
  owner: 'Organizer',
  editor: 'Editor',
  viewer: 'Player',
} as const;
export type Role = keyof typeof ROLE_LABELS;
export function roleLabel(role: string | null | undefined): string {
  if (role && role in ROLE_LABELS) return ROLE_LABELS[role as Role];
  return '—';
}
